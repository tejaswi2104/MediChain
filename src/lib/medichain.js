// Small shared helpers for MediChain pages.

export const splitList = (text) =>
  String(text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const isValidAbhaId = (id) => /^ABHA-\d{3,12}$/.test(String(id || "").trim().toUpperCase());

export const normalizeAbhaId = (raw) => String(raw || "").trim().toUpperCase();

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}