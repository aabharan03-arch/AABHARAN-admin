import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import { getEnquiries } from "../lib/api";
import { Search, Download, X, Store as StoreIcon, Package, User, Mail, Phone, Calendar, RefreshCw } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";

export interface Enquiry {
  id: string;
  productId: string;
  storeAdminId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  message: string;
  status: "NEW" | "IN_PROGRESS" | "CONTACTED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  storeAdmin?: {
    id: string;
    name: string;
    email: string;
  } | null;
  product?: {
    id: string;
    title: string;
  } | null;
}

export const Route = createFileRoute("/_admin/users")({
  head: () => ({ meta: [{ title: "Enquiries · Aabharan Admin" }] }),
  component: EnquiriesPage,
});

const STATUSES = ["NEW", "IN_PROGRESS", "CONTACTED", "CLOSED"] as const;
type EnquiryStatus = (typeof STATUSES)[number];

// Module-level cache memory store
let enquiriesCache: Enquiry[] | null = null;

function formatLabel(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Custom Status Badge to correctly format and color-code exact status values
 */
function EnquiryStatusBadge({ status }: { status: EnquiryStatus | string }) {
  const normalized = (status || "").toUpperCase();

  switch (normalized) {
    case "NEW":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          New
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          In Progress
        </span>
      );
    case "CONTACTED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Contacted
        </span>
      );
    case "CLOSED":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">
          Closed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">
          {formatLabel(status)}
        </span>
      );
  }
}

function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => enquiriesCache || []);
  const [loading, setLoading] = useState<boolean>(!enquiriesCache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | EnquiryStatus>("All");

  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // Core fetch function: uses cache unless manual refresh is triggered
  const fetchEnquiries = useCallback(async (forceRefetch = false) => {
    if (!forceRefetch && enquiriesCache) {
      setEnquiries(enquiriesCache);
      setLoading(false);
      return;
    }

    if (forceRefetch) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getEnquiries();
      if (res.success) {
        enquiriesCache = res.enquiries; // Update module-level cache
        setEnquiries(res.enquiries);
        setError(null);
        if (forceRefetch) toast.success("Enquiries refreshed");
      } else {
        setError(res.error || "Failed to fetch enquiries");
        toast.error(res.error || "Failed to fetch enquiries");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
      toast.error("Failed to connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries(false);
  }, [fetchEnquiries]);

  // Memoized search and filter results from cached state
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enquiries.filter((e) => {
      if (statusFilter !== "All" && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phone || "").includes(q) ||
        e.message.toLowerCase().includes(q) ||
        (e.storeAdmin?.name || "").toLowerCase().includes(q) ||
        (e.product?.title || "").toLowerCase().includes(q)
      );
    });
  }, [enquiries, search, statusFilter]);

  // Memoized status counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: enquiries.length };
    for (const s of STATUSES) c[s] = enquiries.filter((e) => e.status === s).length;
    return c;
  }, [enquiries]);

  // Memoized today's enquiry count
  const newToday = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return enquiries.filter((e) => new Date(e.createdAt) >= startOfToday).length;
  }, [enquiries]);

  if (loading) {
    return (
      <>
        <AdminTopbar title="Enquiries" subtitle="Loading…" />
        <div className="px-6 lg:px-10 py-8 space-y-5">
          <Card className="p-3">
            <div className="h-9 w-full max-w-md rounded bg-muted animate-pulse" />
          </Card>
          <Card className="overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-5 py-3.5 border-b border-border last:border-0">
                <div className="space-y-1.5 w-48">
                  <div className="h-3.5 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-32 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
                <div className="h-6 w-20 rounded-full bg-muted animate-pulse ml-auto" />
              </div>
            ))}
          </Card>
        </div>
      </>
    );
  }

  if (error && enquiries.length === 0) {
    return (
      <>
        <AdminTopbar title="Enquiries" subtitle="Error loading enquiries" />
        <div className="px-6 lg:px-10 py-8">
          <Card className="p-6 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => fetchEnquiries(true)}
              className="mt-4 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95"
            >
              Retry
            </button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminTopbar
        title="Enquiries"
        subtitle={`${enquiries.length} total · ${counts.NEW || 0} new · ${newToday} today`}
        actions={
          <>
            <button
              onClick={() => fetchEnquiries(true)}
              disabled={refreshing}
              title="Refresh Enquiries from API"
              className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button className="hidden md:inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium">
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      />
      <div className="px-6 lg:px-10 py-8 space-y-5 relative">
        <Card className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, email, store admin, product or message…"
              className="w-full h-9 pl-10 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex gap-1 flex-wrap ml-auto">
            {(["All", ...STATUSES] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`h-8 px-3 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "All" ? "All" : formatLabel(f)} ({counts[f] ?? 0})
              </button>
            ))}
          </div>
        </Card>

        {/* Table View */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="font-medium px-5 py-3">Customer</th>
                  <th className="font-medium px-5 py-3">Phone</th>
                  <th className="font-medium px-5 py-3">Store Admin</th>
                  <th className="font-medium px-5 py-3">Product</th>
                  <th className="font-medium px-5 py-3">Received</th>
                  <th className="font-medium px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedEnquiry(e)}
                    className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">
                          {e.fullName
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{e.fullName}</div>
                          <div className="text-xs text-muted-foreground truncate">{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-foreground tabular-nums whitespace-nowrap">
                      {e.phone || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground font-medium">
                      {e.storeAdmin?.name || "Unassigned"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground max-w-[180px] truncate">
                      {e.product?.title || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground tabular-nums whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <EnquiryStatusBadge status={e.status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      {search || statusFilter !== "All" ? "No enquiries match your filters." : "No enquiries yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Detail Modal View */}
      {selectedEnquiry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-150"
          onClick={() => setSelectedEnquiry(null)}
        >
          <Card
            className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-semibold">
                  {selectedEnquiry.fullName[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Enquiry Overview</h2>
                  <p className="text-xs text-muted-foreground">ID: {selectedEnquiry.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-2.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Customer Details
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-medium text-foreground">{selectedEnquiry.fullName}</p>
                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5" /> {selectedEnquiry.email}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5" /> {selectedEnquiry.phone || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-2.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <StoreIcon className="h-3.5 w-3.5" /> Target & Status
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Store Admin:</span>
                      <span className="font-medium text-foreground">
                        {selectedEnquiry.storeAdmin?.name || "Unassigned"}
                      </span>
                    </div>
                    {selectedEnquiry.product?.title && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" /> Product:
                        </span>
                        <span className="font-medium text-foreground truncate max-w-[180px]">
                          {selectedEnquiry.product.title}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Date:
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {new Date(selectedEnquiry.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <EnquiryStatusBadge status={selectedEnquiry.status} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Enquiry Message
                </h3>
                <div className="p-4 rounded-lg bg-card border border-border leading-relaxed text-sm text-foreground whitespace-pre-wrap">
                  {selectedEnquiry.message}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}