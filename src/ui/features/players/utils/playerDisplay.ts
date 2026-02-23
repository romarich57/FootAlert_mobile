export function toDisplayValue(value: string | number | null | undefined): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
  }

  return '';
}

export function toSeasonLabel(season: number | null): string {
  if (typeof season !== 'number' || !Number.isFinite(season)) {
    return '';
  }

  return `${season}/${season + 1}`;
}

export function toHeightValue(height: string | null): string {
  if (!height) {
    return '';
  }

  const normalized = height.replace(' cm', '').trim();
  return normalized.length > 0 ? normalized : '';
}

export function getRatingColor(ratingStr: string | null | undefined): string {
  if (!ratingStr) return '#9CA3AF';
  const rating = parseFloat(ratingStr);
  if (isNaN(rating)) return '#9CA3AF';
  if (rating >= 7.5) return '#22C55E'; // bright green
  if (rating >= 7.0) return '#16A34A'; // green
  if (rating >= 6.5) return '#EAB308'; // yellow
  if (rating >= 6.0) return '#F97316'; // orange
  return '#EF4444'; // red
}
