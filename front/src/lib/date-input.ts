/** Helpers for Spanish date display (DD/MM/YYYY) ↔ ISO (YYYY-MM-DD). */

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function isoToDisplay(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed || !ISO_RE.test(trimmed)) return "";
  const [y, m, d] = trimmed.split("-");
  return `${d}/${m}/${y}`;
}

/** Returns ISO string, "" if blank, or null if invalid. */
export function displayToIso(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return "";
  const match = trimmed.match(DISPLAY_RE);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== year || d.getMonth() + 1 !== month || d.getDate() !== day) {
    return null;
  }
  return iso;
}

/** Digits-only → progressive DD/MM/YYYY mask while typing. */
export function formatPartialDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
