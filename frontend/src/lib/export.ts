import { toast } from "sonner";

export function downloadFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: { key: keyof T; label: string }[],
) {
  if (!rows.length) {
    toast.error("Nothing to export");
    return;
  }
  const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[]).map((k) => ({ key: k, label: String(k) }));
  const header = cols.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((r) => cols.map((c) => escapeCell(r[c.key])).join(",")).join("\n");
  downloadFile(filename, `${header}\n${body}`, "text/csv;charset=utf-8");
  toast.success(`${filename} downloaded`, { description: `${rows.length} rows exported` });
}

export function exportJson(filename: string, data: unknown) {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json");
  toast.success(`${filename} downloaded`);
}
