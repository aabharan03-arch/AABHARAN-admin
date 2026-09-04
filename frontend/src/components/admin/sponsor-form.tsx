import { useState } from "react";
import { Modal } from "./modal";
import { TextField, TextArea, SelectField, Toggle } from "./forms";
import { planTiers, newId, today, addMonths } from "@/lib/store";
import type { Sponsor, PlanTier, SponsorStatus } from "@/lib/mock-data";

const gradients = [
  "from-amber-200 to-yellow-500", "from-rose-200 to-amber-400",
  "from-yellow-300 to-orange-500", "from-stone-200 to-amber-500",
];

const planAmount: Record<PlanTier, number> = { Silver: 12000, Gold: 28000, Diamond: 60000, Platinum: 120000 };

export function SponsorFormModal({
  open, onClose, onSave, sponsor, categories,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (s: Sponsor) => void;
  sponsor?: Sponsor;
  categories: string[];
}) {
  const [form, setForm] = useState(() => seed(sponsor));
  const [error, setError] = useState("");

  // Reset the form whenever the modal is (re)opened for a different record.
  const key = sponsor?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (open && lastKey !== key) {
    setLastKey(key);
    setForm(seed(sponsor));
  }

  const set = <K extends keyof ReturnType<typeof seed>>(k: K, v: ReturnType<typeof seed>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) { setError("Sponsor name is required."); return; }
    if (!form.email.trim()) { setError("Email is required."); return; }
    setError("");
    const plan = form.plan as PlanTier;
    const status: SponsorStatus = form.featured
      ? "featured"
      : new Date(form.expiryDate) < new Date()
        ? "expired"
        : (new Date(form.expiryDate).getTime() - Date.now()) / 86400000 <= 30
          ? "expiring"
          : "active";
    onSave({
      id: sponsor?.id ?? newId("spn"),
      name: form.name.trim(),
      logoBg: sponsor?.logoBg ?? gradients[Math.floor(Math.random() * gradients.length)],
      description: form.description,
      email: form.email.trim(),
      phone: form.phone,
      whatsapp: form.whatsapp || form.phone,
      website: form.website,
      gst: form.gst,
      city: form.city,
      state: form.state,
      plan,
      status,
      featured: form.featured,
      startDate: form.startDate,
      expiryDate: form.expiryDate,
      amount: Number(form.amount) || planAmount[plan],
      views: sponsor?.views ?? 0,
      clicks: sponsor?.clicks ?? 0,
      branches: sponsor?.branches ?? [],
      galleryCount: sponsor?.galleryCount ?? 0,
      category: form.category,
      createdAt: sponsor?.createdAt ?? today(),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={sponsor ? `Edit ${sponsor.name}` : "New sponsor"}
      description={sponsor ? "Update the sponsor profile and membership." : "Create a sponsor record and assign a membership plan."}
      footer={
        <>
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium">Cancel</button>
          <button onClick={submit} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95">
            {sponsor ? "Save changes" : "Create sponsor"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Sponsor name" required value={form.name} onChange={(v) => set("name", v)} placeholder="Tanishq" />
          <SelectField label="Category" value={form.category} onChange={(v) => set("category", v)} options={categories} />
          <TextField label="Email" required type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="contact@brand.com" />
          <TextField label="Phone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+91 90000 00000" />
          <TextField label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} />
          <TextField label="Website" value={form.website} onChange={(v) => set("website", v)} placeholder="www.brand.com" />
          <TextField label="GSTIN" value={form.gst} onChange={(v) => set("gst", v)} />
          <TextField label="City" value={form.city} onChange={(v) => set("city", v)} />
          <TextField label="State" value={form.state} onChange={(v) => set("state", v)} />
        </div>

        <TextArea label="Description" value={form.description} onChange={(v) => set("description", v)} placeholder="Heritage jewellery house…" />

        <div className="rounded-xl border border-border p-4 bg-muted/25">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">Membership</div>
          <div className="grid sm:grid-cols-4 gap-4">
            <SelectField
              label="Plan"
              value={form.plan}
              onChange={(v) => setForm((f) => ({ ...f, plan: v, amount: String(planAmount[v as PlanTier]) }))}
              options={planTiers}
            />
            <TextField label="Amount (₹)" type="number" value={form.amount} onChange={(v) => set("amount", v)} />
            <TextField label="Start date" type="date" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v, expiryDate: addMonths(v, 12) }))} />
            <TextField label="Expiry date" type="date" value={form.expiryDate} onChange={(v) => set("expiryDate", v)} />
          </div>
          <Toggle
            label="Feature on homepage"
            description="Featured sponsors appear in the hero and featured rails."
            checked={form.featured}
            onChange={(v) => set("featured", v)}
          />
        </div>
      </div>
    </Modal>
  );
}

function seed(s?: Sponsor) {
  return {
    name: s?.name ?? "",
    description: s?.description ?? "",
    email: s?.email ?? "",
    phone: s?.phone ?? "",
    whatsapp: s?.whatsapp ?? "",
    website: s?.website ?? "",
    gst: s?.gst ?? "",
    city: s?.city ?? "Mumbai",
    state: s?.state ?? "Maharashtra",
    plan: (s?.plan ?? "Gold") as string,
    amount: String(s?.amount ?? planAmount.Gold),
    startDate: s?.startDate ?? today(),
    expiryDate: s?.expiryDate ?? addMonths(today(), 12),
    featured: s?.featured ?? false,
    category: s?.category ?? "Gold",
  };
}
