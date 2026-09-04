import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/components/admin/topbar";
import { Card } from "@/components/admin/ui-bits";
import {
  getStoreImages,
  createStoreImage,
  updateStoreImage,
  deleteStoreImage,
  IMAGE_CAPS,
  type StoreImage,
  type StoreImageType,
} from "@/lib/api";
import {
  Image as ImageIcon,
  Upload,
  Search,
  FolderOpen,
  Pencil,
  Trash2,
  X,
  CalendarClock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_admin/gallery")({
  head: () => ({ meta: [{ title: "Gallery · Aabharan Admin" }] }),
  component: GalleryPage,
});

const TYPES: StoreImageType[] = ["COVER_PHOTO", "FIRST_PHOTO", "ADVERTISE_PHOTO"];

const TYPE_LABEL: Record<StoreImageType, string> = {
  COVER_PHOTO: "Cover Photo",
  FIRST_PHOTO: "First Photo",
  ADVERTISE_PHOTO: "Advertise Photo",
};

const STORE_ADMIN_API = "https://aabharan.vercel.app/api/admin/store/all";

// ---------------- Store directory types ----------------

interface StoreAdminEntry {
  storeAdminId: string; // storeAdmins[].id
  storeAdminName: string; // storeAdmins[].name
  storeId: string; // storeAdmins[].store.id
  storeName: string; // storeAdmins[].store.name
}

interface StoreAdminApiResponse {
  success: boolean;
  count: number;
  storeAdmins: {
    id: string;
    name: string;
    store: {
      id: string;
      name: string;
    };
  }[];
}

function isExpired(img: StoreImage) {
  return img.expiryDate !== null && new Date(img.expiryDate) <= new Date();
}

function daysUntil(dateStr: string) {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function ExpiryLabel({ img }: { img: StoreImage }) {
  if (!img.expiryDate) return <>Never expires</>;
  if (isExpired(img)) {
    return <span className="text-red-600 font-medium">Expired</span>;
  }
  const days = daysUntil(img.expiryDate);
  return (
    <>
      Expires in {days} day{days !== 1 ? "s" : ""}
    </>
  );
}

// ---------------- Main page ----------------

function GalleryPage() {
  const [images, setImages] = useState<StoreImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store admin directory — fetched once on mount, refetched only on a hard page refresh.
  const [storeAdmins, setStoreAdmins] = useState<StoreAdminEntry[]>([]);
  const [storeAdminsLoading, setStoreAdminsLoading] = useState(true);
  const [storeAdminsError, setStoreAdminsError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | StoreImageType>("ALL");

  const [showUpload, setShowUpload] = useState(false);
  const [editTarget, setEditTarget] = useState<StoreImage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreImage | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await getStoreImages();
    if (res.success) {
      setImages(res.images);
    } else {
      setError(res.error || "Failed to load images");
    }
    setLoading(false);
  }

  async function loadStoreAdmins() {
    setStoreAdminsLoading(true);
    setStoreAdminsError(null);
    try {
      const res = await fetch(STORE_ADMIN_API);
      const data: StoreAdminApiResponse = await res.json();
      if (!data.success) throw new Error("Failed to load stores");
      setStoreAdmins(
        data.storeAdmins.map((sa) => ({
          storeAdminId: sa.id,
          storeAdminName: sa.name,
          storeId: sa.store.id,
          storeName: sa.store.name,
        }))
      );
    } catch (e) {
      setStoreAdminsError(e instanceof Error ? e.message : "Failed to load stores");
    } finally {
      setStoreAdminsLoading(false);
    }
  }

  // Both fetches run once per mount. A browser refresh re-mounts the app and
  // re-triggers these; nothing inside the component re-triggers them on its own.
  useEffect(() => {
    load();
    loadStoreAdmins();
  }, []);

  // Derived lookups — recomputed only when the fetched storeAdmins data changes,
  // never trigger a network call themselves.
  const storeAdminById = useMemo(() => {
    const map = new Map<string, StoreAdminEntry>();
    for (const sa of storeAdmins) map.set(sa.storeAdminId, sa);
    return map;
  }, [storeAdmins]);

  function storeLabel(storeAdminId: string) {
    return storeAdminById.get(storeAdminId)?.storeName ?? `${storeAdminId.slice(0, 12)}…`;
  }

  // Group by storeAdmin → type (the "collections" view)
  const grouped = useMemo(() => {
    const map = new Map<string, StoreImage[]>();
    for (const img of images) {
      const list = map.get(img.storeAdminId) ?? [];
      list.push(img);
      map.set(img.storeAdminId, list);
    }
    return Array.from(map.entries()).map(([storeAdminId, imgs]) => ({
      storeAdminId,
      images: imgs,
    }));
  }, [images]);

  const filtered = useMemo(() => {
    return grouped
      .map((g) => ({
        ...g,
        images: g.images.filter(
          (i) =>
            (typeFilter === "ALL" || i.type === typeFilter) &&
            (search === "" ||
              storeLabel(i.storeAdminId).toLowerCase().includes(search.toLowerCase()) ||
              i.type.toLowerCase().includes(search.toLowerCase()))
        ),
      }))
      .filter((g) => g.images.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grouped, search, typeFilter, storeAdminById]);

  return (
    <>
      <AdminTopbar
        title="Gallery"
        subtitle={``}
        actions={
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-95"
          >
            <Upload className="h-4 w-4" /> Upload image
          </button>
        }
      />
      <div className="px-6 lg:px-10 py-8 space-y-6">
        {/* Search + type filter */}
        <Card className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by store name or type…"
              className="w-full h-9 pl-10 pr-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="ml-auto flex flex-wrap gap-1">
            {(["ALL", ...TYPES] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`h-8 px-3 rounded-md text-xs font-medium ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "ALL" ? "All" : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </Card>

        {error && (
          <Card className="p-4 text-sm text-red-600">
            {error}{" "}
            <button onClick={load} className="underline ml-2">
              Retry
            </button>
          </Card>
        )}

        {loading ? (
          <GallerySkeleton />
        ) : filtered.length === 0 ? (
          <Card className="p-16 text-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No images found Upload one to get started.</p>
          </Card>
        ) : (
          <div className="space-y-10">
            {filtered.map((group) => (
              <StoreGroup
                key={group.storeAdminId}
                storeAdminId={group.storeAdminId}
                storeName={storeLabel(group.storeAdminId)}
                images={group.images}
                onEdit={(img) => setEditTarget(img)}
                onDelete={(img) => setDeleteTarget(img)}
              />
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          storeAdmins={storeAdmins}
          storeAdminsLoading={storeAdminsLoading}
          storeAdminsError={storeAdminsError}
          onRetryStoreAdmins={loadStoreAdmins}
          onClose={() => setShowUpload(false)}
          onCreated={() => {
            setShowUpload(false);
            load();
          }}
        />
      )}

      {editTarget && (
        <EditModal
          image={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          image={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            load();
          }}
        />
      )}
    </>
  );
}

// ---------------- Skeleton loading ----------------

function SkeletonImageCard() {
  return (
    <Card className="overflow-hidden">
      <div className="h-40 bg-muted animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
        <div className="flex gap-2 pt-1">
          <div className="h-8 w-16 bg-muted rounded-md animate-pulse" />
          <div className="h-8 w-16 bg-muted rounded-md animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

function GallerySkeleton() {
  return (
    <div className="space-y-10">
      {[0, 1].map((groupIdx) => (
        <div key={groupIdx}>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="h-4 w-4 text-muted-foreground/40" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonImageCard key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- One store group ----------------

function StoreGroup({
  storeAdminId,
  storeName,
  images,
  onEdit,
  onDelete,
}: {
  storeAdminId: string;
  storeName: string;
  images: StoreImage[];
  onEdit: (img: StoreImage) => void;
  onDelete: (img: StoreImage) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          Store: <span title={storeAdminId}>{storeName}</span>
        </h3>
        <span className="text-xs text-muted-foreground">
          {images.length} image{images.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {images.map((img) => (
          <ImageCard key={img.id} img={img} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ---------------- Single image card ----------------

function ImageCard({
  img,
  onEdit,
  onDelete,
}: {
  img: StoreImage;
  onEdit: (img: StoreImage) => void;
  onDelete: (img: StoreImage) => void;
}) {
  const expired = isExpired(img);
  const hidden = !img.isActive || expired;

  return (
    <Card className="overflow-hidden hover:shadow-elevated transition-shadow">
      <div className="relative h-40 bg-muted">
        <img src={img.img} alt={img.type} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-white">
          {TYPE_LABEL[img.type]}
        </div>
        {hidden && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-red-600/80 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-white">
            {expired ? "Expired" : "Hidden"}
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          <ExpiryLabel img={img} />
        </div>
        <div className="text-xs text-muted-foreground">
          Order: {img.displayOrder} · {img.isActive ? "Active" : "Inactive"}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onEdit(img)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={() => onDelete(img)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </Card>
  );
}

// ---------------- Shared modal shell ----------------

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-elevated">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------- Upload (create) modal ----------------

function UploadModal({
  storeAdmins,
  storeAdminsLoading,
  storeAdminsError,
  onRetryStoreAdmins,
  onClose,
  onCreated,
}: {
  storeAdmins: StoreAdminEntry[];
  storeAdminsLoading: boolean;
  storeAdminsError: string | null;
  onRetryStoreAdmins: () => void;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<StoreImageType>("ADVERTISE_PHOTO");
  const [storeAdminId, setStoreAdminId] = useState("");
  const [manualId, setManualId] = useState(false);
  const [manualStoreId, setManualStoreId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Default the selection to the first store once the directory has loaded.
  useEffect(() => {
    if (!manualId && !storeAdminId && storeAdmins.length > 0) {
      setStoreAdminId(storeAdmins[0].storeAdminId);
    }
  }, [storeAdmins, manualId, storeAdminId]);

  const selected = useMemo(
    () => storeAdmins.find((sa) => sa.storeAdminId === storeAdminId) ?? null,
    [storeAdmins, storeAdminId]
  );

  function onFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!file) return setError("Please choose an image file.");
    if (!storeAdminId) return setError("Store is required.");
    if (manualId && !manualStoreId) return setError("Store id is required.");

    setSubmitting(true);
    setError(null);

    // storeAdminId -> storeAdmin, storeId -> store, kept distinct and sent as-is.
    const storeId = manualId ? manualStoreId : selected?.storeId ?? "";

    const res = await createStoreImage({
      file,
      type,
      storeAdminId,
      storeId,
      expiryDate: expiryDate || null,
    });

    setSubmitting(false);
    if (res.success) onCreated();
    else setError(res.error || "Upload failed");
  }

  return (
    <Modal title="Upload image" onClose={onClose}>
      <div className="p-5 space-y-4">
        {/* file */}
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Image (jpg/png/webp, max 5MB)</span>
          <div className="mt-1 border-2 border-dashed border-border rounded-lg h-32 grid place-items-center cursor-pointer hover:bg-muted/50 relative overflow-hidden">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <img src={preview} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="text-center text-muted-foreground">
                <Upload className="h-6 w-6 mx-auto mb-1" />
                <span className="text-xs">Click to choose a file</span>
              </div>
            )}
          </div>
        </label>

        {/* type */}
        <div>
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <div className="mt-1 flex gap-1">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`h-8 px-3 rounded-md text-xs font-medium ${
                  type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Max {IMAGE_CAPS[type]} active {TYPE_LABEL[type].toLowerCase()}(s) per store.
          </p>
        </div>

        {/* store name */}
        <div>
          <span className="text-xs font-medium text-muted-foreground">Store name</span>
          {storeAdminsLoading ? (
            <div className="mt-1 h-9 w-full bg-muted rounded-md animate-pulse" />
          ) : storeAdminsError ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-red-600">
              {storeAdminsError}
              <button onClick={onRetryStoreAdmins} className="underline">
                Retry
              </button>
            </div>
          ) : storeAdmins.length > 0 && !manualId ? (
            <div className="mt-1 flex gap-2">
              <select
                value={storeAdminId}
                onChange={(e) => setStoreAdminId(e.target.value)}
                className="flex-1 h-9 px-2 rounded-md border border-border bg-background text-sm"
              >
                {storeAdmins.map((sa) => (
                  <option key={sa.storeAdminId} value={sa.storeAdminId}>
                    {sa.storeName}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setManualId(true)}
                className="h-9 px-3 rounded-md border border-border text-xs hover:bg-muted"
              >
                Enter manually
              </button>
            </div>
          ) : (
            <div className="mt-1 space-y-2">
              <input
                value={storeAdminId}
                onChange={(e) => setStoreAdminId(e.target.value)}
                placeholder="Store admin id"
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
              />
              <input
                value={manualStoreId}
                onChange={(e) => setManualStoreId(e.target.value)}
                placeholder="Store id"
                className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
              />
              {storeAdmins.length > 0 && (
                <button
                  onClick={() => setManualId(false)}
                  className="text-xs underline text-muted-foreground"
                >
                  Choose from list instead
                </button>
              )}
            </div>
          )}
        </div>

        {/* expiry */}
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Expiry date (leave empty = never expires)
          </span>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
          />
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-border text-sm hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Edit modal ----------------

function EditModal({
  image,
  onClose,
  onUpdated,
}: {
  image: StoreImage;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState(
    image.expiryDate ? image.expiryDate.slice(0, 10) : ""
  );
  const [clearExpiry, setClearExpiry] = useState(image.expiryDate === null);
  const [isActive, setIsActive] = useState(image.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);

    const payload: Parameters<typeof updateStoreImage>[1] = {
      isActive,
    };

    if (clearExpiry) {
      payload.expiryDate = null; // never expires
    } else if (expiryDate) {
      payload.expiryDate = new Date(expiryDate).toISOString();
    }

    if (file) payload.file = file; // multipart path

    const res = await updateStoreImage(image.id, payload);
    setSubmitting(false);

    if (res.success) onUpdated();
    else setError(res.error || "Update failed");
  }

  return (
    <Modal title="Edit image" onClose={onClose}>
      <div className="p-5 space-y-4">
        {/* current + new preview */}
        <div className="flex gap-3">
          <div className="flex-1">
            <span className="text-xs font-medium text-muted-foreground">Current</span>
            <img
              src={image.img}
              alt="current"
              className="mt-1 w-full h-24 object-cover rounded-md border border-border"
            />
          </div>
          {file && (
            <div className="flex-1">
              <span className="text-xs font-medium text-muted-foreground">New</span>
              <img
                src={URL.createObjectURL(file)}
                alt="new"
                className="mt-1 w-full h-24 object-cover rounded-md border border-border"
              />
            </div>
          )}
        </div>

        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">
            Replace image (optional — leave empty to keep current)
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
        </label>

        <div>
          <span className="text-xs font-medium text-muted-foreground">Expiry</span>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="date"
              value={clearExpiry ? "" : expiryDate}
              disabled={clearExpiry}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm disabled:opacity-50"
            />
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={clearExpiry}
                onChange={(e) => setClearExpiry(e.target.checked)}
              />
              Never expires
            </label>
          </div>
        </div>

        <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          {isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          Visible on customer site
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-border text-sm hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Delete confirm ----------------

function DeleteConfirm({
  image,
  onClose,
  onDeleted,
}: {
  image: StoreImage;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setDeleting(true);
    setError(null);
    const res = await deleteStoreImage(image.id);
    setDeleting(false);
    if (res.success) onDeleted();
    else setError(res.error || "Delete failed");
  }

  return (
    <Modal title="Delete image" onClose={onClose}>
      <div className="p-5 space-y-4">
        <img
          src={image.img}
          alt="to delete"
          className="w-full h-32 object-cover rounded-md border border-border"
        />
        <p className="text-sm text-muted-foreground">
          This permanently removes the image from storage and the database. This
          action cannot be undone.
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-border text-sm hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete permanently
          </button>
        </div>
      </div>
    </Modal>
  );
}