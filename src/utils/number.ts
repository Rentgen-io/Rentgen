export function clamp(value: number, min = -Infinity, max = Infinity): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeDecimal(value: number, fractionDigits = 2): number {
  return !value || Number.isInteger(value) ? value : Number(value.toFixed(fractionDigits));
}

/** 850 → '850 ms', 12340 → '12.3 s', 125000 → '2m 5s', 3725000 → '1h 2m' */
export function formatDuration(milliseconds: number): string {
  // Thresholds account for rounding, so 999.6 ms shows as '1 s' (not '1000 ms') and 59.96 s as '1m 0s' (not '60 s').
  if (milliseconds < 999.5) return `${Math.round(milliseconds)} ms`;
  if (milliseconds < 59_950) return `${normalizeDecimal(milliseconds / 1000, 1)} s`;

  const totalSeconds = Math.round(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;
}
