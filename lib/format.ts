const pad = (n: number) => String(n).padStart(2, '0');

export function fmtClock(ts: number, seconds = true): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}${seconds ? `:${pad(d.getSeconds())}` : ''}`;
}

/** "14:02:11" for today, "Oct 28 14:02:11" otherwise. */
export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? fmtClock(ts) : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${fmtClock(ts)}`;
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${pad(s % 60)}s`;
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}

export function fmtAgo(ms: number | null): string {
  if (ms === null) return 'never';
  if (ms < 2000) return 'just now';
  return `${fmtDuration(ms)} ago`;
}

export function fmtNum(v: number | null | undefined, decimals = 1): string {
  return v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(decimals);
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtInt(n: number): string {
  return n.toLocaleString();
}
