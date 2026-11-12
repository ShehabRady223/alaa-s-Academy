type D = string | Date | null | undefined;

export const formatDate = (d: D) =>
  d ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';

export const formatDateTime = (d: D) =>
  d ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—';

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function timeAgo(d: D, empty = 'Never') {
  if (!d) return empty;
  const sec = (new Date(d).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, s] of units) if (Math.abs(sec) >= s) return rtf.format(Math.round(sec / s), u);
  return 'Just now';
}

export const formatPercent = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n * 10) / 10}%`);
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');

/** ISO string <-> value of <input type="datetime-local"> (local time, no seconds). */
export const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
