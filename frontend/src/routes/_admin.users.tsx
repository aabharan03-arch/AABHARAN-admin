import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import { getEnquiries } from "../lib/api";
import {
  Search,
  Download,
  X,
  Store as StoreIcon,
  Package,
  User,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  BarChart3,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

let enquiriesCache: Enquiry[] | null = null;

function formatLabel(s: string) {
  return s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-");
}

function EnquiryStatusBadge({
  status,
}: {
  status: EnquiryStatus | string;
}) {
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

function EnquiryTrendChart({
  enquiries,
  month,
  year,
}: {
  enquiries: Enquiry[];
  month: number;
  year: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate();
    const result = Array.from({ length: days }, (_, index) => ({
      day: index + 1,
      count: 0,
    }));

    for (const enquiry of enquiries) {
      const date = new Date(enquiry.createdAt);
      if (
        !Number.isNaN(date.getTime()) &&
        date.getFullYear() === year &&
        date.getMonth() === month
      ) {
        result[date.getDate() - 1].count += 1;
      }
    }

    return result;
  }, [enquiries, month, year]);

  const maxCount = Math.max(1, ...data.map((item) => item.count));
  const yMax = maxCount <= 4 ? 4 : Math.ceil(maxCount / 4) * 4;
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const width = 1000;
  const height = 310;
  const padding = { left: 56, right: 20, top: 18, bottom: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const baselineY = padding.top + plotHeight;

  const points = data.map((item, index) => ({
    ...item,
    x:
      padding.left +
      (data.length === 1 ? 0 : (index / (data.length - 1)) * plotWidth),
    y: padding.top + plotHeight - (item.count / yMax) * plotHeight,
  }));

  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;
    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
      : "";

  const ticks = [0, 1, 2, 3, 4].map((step) => (yMax / 4) * step);
  const visibleDays = new Set([
    1,
    5,
    10,
    15,
    20,
    25,
    30,
    data.length,
  ]);

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <Card className="p-5 md:p-6 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            <BarChart3 className="h-4 w-4" />
            Enquiry Trend
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {total}
            </span>
            <span className="text-sm text-muted-foreground mb-0.5">
              {total === 1 ? "enquiry" : "enquiries"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {MONTHS[month]} {year} · daily enquiry count
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          Hover over the graph to view daily totals
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[720px] h-auto block"
          role="img"
          aria-label={`Enquiry trend for ${MONTHS[month]} ${year}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="enquiryAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => {
            const y = padding.top + plotHeight - (tick / yMax) * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="currentColor"
                  opacity="0.12"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill="currentColor"
                  opacity="0.55"
                  fontSize="12"
                >
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}

          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={baselineY}
            stroke="currentColor"
            opacity="0.18"
          />
          <line
            x1={padding.left}
            y1={baselineY}
            x2={width - padding.right}
            y2={baselineY}
            stroke="currentColor"
            opacity="0.18"
          />

          {points.map((point) =>
            visibleDays.has(point.day) ? (
              <text
                key={`label-${point.day}`}
                x={point.x}
                y={baselineY + 24}
                textAnchor="middle"
                fill="currentColor"
                opacity="0.55"
                fontSize="12"
              >
                {point.day}
              </text>
            ) : null
          )}

          {areaPath && (
            <path
              d={areaPath}
              fill="url(#enquiryAreaGradient)"
              className="text-amber-500"
            />
          )}

          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="currentColor"
              className="text-amber-500"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((point, index) => (
            <g key={`point-${point.day}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="13"
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(index)}
              />
              {(point.count > 0 || hoveredIndex === index) && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredIndex === index ? 5 : 3.5}
                  fill="white"
                  stroke="currentColor"
                  className="text-amber-500"
                  strokeWidth="2.5"
                  pointerEvents="none"
                />
              )}
            </g>
          ))}

          {hovered && (
            <g pointerEvents="none">
              <line
                x1={hovered.x}
                y1={hovered.y}
                x2={hovered.x}
                y2={baselineY}
                stroke="currentColor"
                className="text-amber-500"
                opacity="0.35"
                strokeDasharray="4 4"
              />
              <rect
                x={Math.max(
                  padding.left,
                  Math.min(width - 170, hovered.x - 72)
                )}
                y={Math.max(padding.top, hovered.y - 72)}
                width="150"
                height="58"
                rx="10"
                fill="white"
                stroke="#e5e7eb"
              />
              <text
                x={Math.max(
                  padding.left,
                  Math.min(width - 170, hovered.x - 72)
                ) + 12}
                y={Math.max(padding.top, hovered.y - 72) + 22}
                fill="#111827"
                fontSize="12"
                fontWeight="600"
              >
                {MONTHS[month].slice(0, 3)} {hovered.day}
              </text>
              <text
                x={Math.max(
                  padding.left,
                  Math.min(width - 170, hovered.x - 72)
                ) + 12}
                y={Math.max(padding.top, hovered.y - 72) + 42}
                fill="#d39b2a"
                fontSize="12"
                fontWeight="600"
              >
                Enquiries: {hovered.count}
              </text>
            </g>
          )}
        </svg>
      </div>
    </Card>
  );
}

function EnquiriesPage() {
  const now = new Date();

  const [enquiries, setEnquiries] = useState<Enquiry[]>(
    () => enquiriesCache || []
  );
  const [loading, setLoading] = useState<boolean>(!enquiriesCache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"All" | EnquiryStatus>("All");
  const [monthFilter, setMonthFilter] = useState(now.getMonth());
  const [yearFilter, setYearFilter] = useState(now.getFullYear());
  const [storeAdminFilter, setStoreAdminFilter] = useState("All");

  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(
    null
  );

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
        enquiriesCache = res.enquiries;
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

  const availableYears = useMemo(() => {
    const values = new Set<number>([now.getFullYear()]);

    for (const enquiry of enquiries) {
      const date = new Date(enquiry.createdAt);
      if (!Number.isNaN(date.getTime())) {
        values.add(date.getFullYear());
      }
    }

    return Array.from(values).sort((a, b) => b - a);
  }, [enquiries]);

  const storeAdmins = useMemo(() => {
    const map = new Map<string, string>();

    for (const enquiry of enquiries) {
      const id = enquiry.storeAdmin?.id || enquiry.storeAdminId;
      const name = enquiry.storeAdmin?.name || "Unassigned";
      if (id) map.set(id, name);
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [enquiries]);

  const dateAndStoreFiltered = useMemo(() => {
    return enquiries.filter((e) => {
      const date = new Date(e.createdAt);

      if (
        Number.isNaN(date.getTime()) ||
        date.getMonth() !== monthFilter ||
        date.getFullYear() !== yearFilter
      ) {
        return false;
      }

      const enquiryStoreId = e.storeAdmin?.id || e.storeAdminId;

      if (
        storeAdminFilter !== "All" &&
        enquiryStoreId !== storeAdminFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    enquiries,
    monthFilter,
    yearFilter,
    storeAdminFilter,
  ]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return dateAndStoreFiltered.filter((e) => {
      if (statusFilter !== "All" && e.status !== statusFilter) {
        return false;
      }

      if (!q) return true;

      return (
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phone || "").toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        (e.storeAdmin?.name || "").toLowerCase().includes(q) ||
        (e.storeAdmin?.email || "").toLowerCase().includes(q) ||
        (e.product?.title || "").toLowerCase().includes(q)
      );
    });
  }, [dateAndStoreFiltered, search, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      All: dateAndStoreFiltered.length,
    };

    for (const status of STATUSES) {
      c[status] = dateAndStoreFiltered.filter(
        (e) => e.status === status
      ).length;
    }

    return c;
  }, [dateAndStoreFiltered]);

  const newToday = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return enquiries.filter(
      (e) => new Date(e.createdAt) >= startOfToday
    ).length;
  }, [enquiries]);

  const reportTitle = useMemo(() => {
    const storeName =
      storeAdminFilter === "All"
        ? "All Stores"
        : storeAdmins.find((item) => item.id === storeAdminFilter)?.name ||
          "Selected Store";

    return `${MONTHS[monthFilter]} ${yearFilter} - ${storeName}`;
  }, [monthFilter, yearFilter, storeAdminFilter, storeAdmins]);

  const reportRows = useMemo(
    () =>
      filtered.map((e, index) => ({
        "S.No": index + 1,
        "Enquiry ID": e.id,
        "Customer Name": e.fullName,
        "Customer Email": e.email,
        "Customer Phone": e.phone || "",
        "Store Admin": e.storeAdmin?.name || "Unassigned",
        "Store Admin Email": e.storeAdmin?.email || "",
        "Store Admin ID": e.storeAdmin?.id || e.storeAdminId || "",
        "Product": e.product?.title || "",
        "Product ID": e.product?.id || e.productId || "",
        "Status": formatLabel(e.status),
        "Message": e.message,
        "Created At": formatDateTime(e.createdAt),
        "Updated At": formatDateTime(e.updatedAt),
      })),
    [filtered]
  );

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.error("No enquiries available for the selected filters");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(reportRows);

    worksheet["!cols"] = [
      { wch: 7 },
      { wch: 38 },
      { wch: 24 },
      { wch: 30 },
      { wch: 18 },
      { wch: 24 },
      { wch: 30 },
      { wch: 38 },
      { wch: 28 },
      { wch: 38 },
      { wch: 16 },
      { wch: 60 },
      { wch: 24 },
      { wch: 24 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Enquiries");

    const summary = XLSX.utils.aoa_to_sheet([
      ["Aabharan Enquiry Report"],
      ["Report", reportTitle],
      ["Generated", new Date().toLocaleString("en-IN")],
      ["Total enquiries", filtered.length],
      ["New", filtered.filter((e) => e.status === "NEW").length],
      [
        "In Progress",
        filtered.filter((e) => e.status === "IN_PROGRESS").length,
      ],
      [
        "Contacted",
        filtered.filter((e) => e.status === "CONTACTED").length,
      ],
      ["Closed", filtered.filter((e) => e.status === "CLOSED").length],
    ]);

    summary["!cols"] = [{ wch: 22 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, summary, "Summary");

    const fileName = `enquiries-${safeFileName(reportTitle)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Excel report downloaded");
  };

  const exportPdf = () => {
    if (filtered.length === 0) {
      toast.error("No enquiries available for the selected filters");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);
    doc.text("Aabharan Enquiry Report", 14, 14);

    doc.setFontSize(9);
    doc.text(`Filters: ${reportTitle}`, 14, 20);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-IN")}`,
      14,
      25
    );
    doc.text(`Total enquiries: ${filtered.length}`, 14, 30);

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "#",
          "Customer",
          "Email",
          "Phone",
          "Store Admin",
          "Product",
          "Status",
          "Message",
          "Received",
          "Updated",
        ],
      ],
      body: filtered.map((e, index) => [
        String(index + 1),
        e.fullName,
        e.email,
        e.phone || "—",
        e.storeAdmin?.name || "Unassigned",
        e.product?.title || "—",
        formatLabel(e.status),
        e.message,
        formatDateTime(e.createdAt),
        formatDateTime(e.updatedAt),
      ]),
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "top",
      },
      headStyles: {
        fillColor: [4, 9, 30],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 27 },
        2: { cellWidth: 38 },
        3: { cellWidth: 24 },
        4: { cellWidth: 28 },
        5: { cellWidth: 30 },
        6: { cellWidth: 22 },
        7: { cellWidth: 55 },
        8: { cellWidth: 28 },
        9: { cellWidth: 28 },
      },
      margin: { left: 8, right: 8 },
    });

    const fileName = `enquiries-${safeFileName(reportTitle)}.pdf`;
    doc.save(fileName);
    toast.success("PDF report downloaded");
  };

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
              <div
                key={i}
                className="flex items-center gap-6 px-5 py-3.5 border-b border-border last:border-0"
              >
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
        <AdminTopbar
          title="Enquiries"
          subtitle="Error loading enquiries"
        />
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
        subtitle={`${filtered.length} shown · ${enquiries.length} total · ${
          counts.NEW || 0
        } new · ${newToday} today`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEnquiries(true)}
              disabled={refreshing}
              title="Refresh enquiries from API"
              className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>

            <button
              onClick={exportExcel}
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>

            <button
              onClick={exportPdf}
              className="hidden sm:inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
          </div>
        }
      />

      <div className="px-6 lg:px-10 py-8 space-y-5 relative">
        <Card className="p-4">
          <div className="flex flex-col xl:flex-row xl:items-end gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Month
                </label>
                <select
                  value={monthFilter}
                  onChange={(e) =>
                    setMonthFilter(Number(e.target.value))
                  }
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) =>
                    setYearFilter(Number(e.target.value))
                  }
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                  Store Admin
                </label>
                <select
                  value={storeAdminFilter}
                  onChange={(e) =>
                    setStoreAdminFilter(e.target.value)
                  }
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="All">All Store Admins</option>
                  {storeAdmins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 sm:hidden">
              <button
                onClick={exportExcel}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>
              <button
                onClick={exportPdf}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium"
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>
        </Card>

        <EnquiryTrendChart
          enquiries={dateAndStoreFiltered}
          month={monthFilter}
          year={yearFilter}
        />

        <Card className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[260px] max-w-md">
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
                  statusFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "All" ? "All" : formatLabel(f)} (
                {counts[f] ?? 0})
              </button>
            ))}
          </div>
        </Card>

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
                  <th className="font-medium px-5 py-3 text-right">
                    Status
                  </th>
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
                          <div className="font-medium text-foreground truncate">
                            {e.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {e.email}
                          </div>
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
                      {new Date(e.createdAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <EnquiryStatusBadge status={e.status} />
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      No enquiries match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3 border-t border-border text-xs text-muted-foreground">
            <span>
              Showing {filtered.length} enquiries for {reportTitle}
            </span>
            <span>
              Reports export the currently filtered enquiry results.
            </span>
          </div>
        </Card>
      </div>

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
                  <h2 className="text-base font-semibold text-foreground">
                    Enquiry Overview
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    ID: {selectedEnquiry.id}
                  </p>
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
                    <User className="h-3.5 w-3.5" />
                    Customer Details
                  </h3>

                  <div className="space-y-1.5 text-sm">
                    <p className="font-medium text-foreground">
                      {selectedEnquiry.fullName}
                    </p>

                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedEnquiry.email}
                    </p>

                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedEnquiry.phone || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-2.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <StoreIcon className="h-3.5 w-3.5" />
                    Target & Status
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        Store Admin:
                      </span>
                      <span className="font-medium text-foreground text-right">
                        {selectedEnquiry.storeAdmin?.name ||
                          "Unassigned"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        Store Email:
                      </span>
                      <span className="text-xs font-medium text-foreground text-right break-all">
                        {selectedEnquiry.storeAdmin?.email || "—"}
                      </span>
                    </div>

                    {selectedEnquiry.product?.title && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Product:
                        </span>
                        <span className="font-medium text-foreground truncate max-w-[180px]">
                          {selectedEnquiry.product.title}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created:
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {formatDateTime(selectedEnquiry.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground">
                        Updated:
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {formatDateTime(selectedEnquiry.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">
                        Status:
                      </span>
                      <EnquiryStatusBadge
                        status={selectedEnquiry.status}
                      />
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
