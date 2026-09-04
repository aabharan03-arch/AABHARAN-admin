import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card, StatusPill, SectionTitle } from "@/components/admin/ui-bits";
import { sponsors, payments, inrFull } from "@/lib/mock-data";
import {
  ChevronLeft, Mail, Phone, Globe, MapPin, FileText, Pencil, Crown, Calendar, MessageCircle, Image as ImageIcon, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_admin/sponsors/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} · Sponsor · Aabharan Admin` }] }),
  loader: ({ params }) => {
    const sponsor = sponsors.find((s) => s.id === params.id);
    if (!sponsor) throw notFound();
    return { sponsor };
  },
  component: SponsorDetail,
  notFoundComponent: () => <div className="p-12 text-muted-foreground">Sponsor not found.</div>,
});

function SponsorDetail() {
  const { sponsor } = Route.useLoaderData();
  const sponsorPayments = payments.filter((p) => p.sponsorId === sponsor.id);

  return (
    <>
      <AdminTopbar
        title={sponsor.name}
        subtitle={`${sponsor.city}, ${sponsor.state} · ${sponsor.plan} plan`}
        actions={
          <>
            <Link to="/sponsors" className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium">
              <ChevronLeft className="h-4 w-4" /> Back
            </Link>
            <button className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          </>
        }
      />

      <div className="px-6 lg:px-10 py-8 space-y-6">
        {/* Hero card */}
        <Card className="overflow-hidden">
          <div className={`h-32 bg-gradient-to-br ${sponsor.logoBg} relative`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_50%)]" />
          </div>
          <div className="px-6 pb-6 -mt-12">
            <div className="flex items-end gap-5 flex-wrap">
              <div className={`h-24 w-24 rounded-2xl bg-gradient-to-br ${sponsor.logoBg} grid place-items-center font-display text-4xl text-navy shadow-elevated ring-4 ring-card`}>
                {sponsor.name[0]}
              </div>
              <div className="flex-1 min-w-0 pt-12">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-display text-3xl text-foreground">{sponsor.name}</h2>
                  <StatusPill status={sponsor.status} />
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{sponsor.description}</p>
              </div>
              <div className="pt-12 grid grid-cols-3 gap-4 text-right">
                <div>
                  <div className="font-display text-2xl text-foreground">{sponsor.views.toLocaleString("en-IN")}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Profile views</div>
                </div>
                <div>
                  <div className="font-display text-2xl text-foreground">{sponsor.clicks}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Clicks</div>
                </div>
                <div>
                  <div className="font-display text-2xl text-foreground">{sponsor.galleryCount}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Images</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact + membership */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <SectionTitle title="Contact" />
              <div className="space-y-3 text-sm">
                <Row icon={Mail} label="Email" value={sponsor.email} />
                <Row icon={Phone} label="Phone" value={sponsor.phone} />
                <Row icon={MessageCircle} label="WhatsApp" value={sponsor.whatsapp} />
                <Row icon={Globe} label="Website" value={sponsor.website} />
                <Row icon={FileText} label="GST" value={sponsor.gst} />
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle title="Membership" />
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gold/10 border border-gold/20">
                  <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-[oklch(0.5_0.13_75)]" /><span className="font-medium text-foreground">{sponsor.plan} plan</span></div>
                  <span className="font-display text-lg text-foreground">{inrFull(sponsor.amount)}</span>
                </div>
                <Row icon={Calendar} label="Start date" value={sponsor.startDate} />
                <Row icon={Calendar} label="Expires" value={sponsor.expiryDate} />
                <button className="w-full mt-3 h-10 rounded-lg gold-gradient text-navy text-sm font-medium hover:opacity-95 shadow-gold">
                  Renew membership
                </button>
              </div>
            </Card>
          </div>

          {/* Branches + payments + gallery preview */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <SectionTitle
                title={`Branches · ${sponsor.branches.length}`}
                action={<button className="text-xs text-muted-foreground hover:text-foreground">+ Add branch</button>}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                {sponsor.branches.map((b: typeof sponsor.branches[number]) => (
                  <div key={b.id} className="rounded-lg border border-border p-4 hover:border-gold/40 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-foreground text-sm">{b.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Manager · {b.manager}</div>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-foreground"><MapPin className="h-3 w-3 text-muted-foreground" />{b.address}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{b.city}, {b.state} · {b.pincode}</div>
                    <div className="mt-3 h-24 rounded-md bg-[linear-gradient(135deg,oklch(0.94_0.02_85),oklch(0.88_0.04_85))] grid place-items-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Map preview · {b.lat.toFixed(3)}, {b.lng.toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle title="Payment history" />
              <div className="divide-y divide-border">
                {sponsorPayments.length === 0 && <div className="py-6 text-sm text-muted-foreground text-center">No payments recorded.</div>}
                {sponsorPayments.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 py-3">
                    <div className="h-9 w-9 rounded-md bg-success/10 text-success grid place-items-center text-xs font-semibold">₹</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{p.invoiceNo}</div>
                      <div className="text-xs text-muted-foreground">{p.method} · {p.txnRef} · {p.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground tabular-nums">{inrFull(p.amount - p.discount)}</div>
                      <StatusPill status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle title={`Gallery · ${sponsor.galleryCount} pieces`} action={<button className="text-xs text-muted-foreground hover:text-foreground">Manage collection →</button>} />
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`aspect-square rounded-md bg-gradient-to-br ${sponsor.logoBg} grid place-items-center text-navy/40`}>
                    <ImageIcon className="h-5 w-5" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}
