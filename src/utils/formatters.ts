/**
 * Formats byte values using standard binary IEC prefixes (1024 base).
 * Common in operating system RAM reporting (KiB, MiB, GiB represented colloquially as KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i]}`;
}

/**
 * Formats byte values using decimal SI units (1000 base).
 * Aligns with device manufacturer marketing (e.g. 8 GB RAM, 128 GB ROM) and Android's Formatter.formatFileSize.
 */
export function formatMetricBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 B';
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return `${val} ${sizes[i]}`;
}

export function formatPercentage(part: number, total: number): number {
  if (!total || total <= 0 || isNaN(total) || !part || part <= 0 || isNaN(part)) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

