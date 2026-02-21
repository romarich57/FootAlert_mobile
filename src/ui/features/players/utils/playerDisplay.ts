export function toDisplayValue(value: string | number | null | undefined): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '?';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '?';
  }

  return '?';
}

export function toSeasonLabel(season: number | null): string {
  if (typeof season !== 'number' || !Number.isFinite(season)) {
    return '?/?';
  }

  return `${season}/${season + 1}`;
}

export function toHeightValue(height: string | null): string {
  if (!height) {
    return '?';
  }

  const normalized = height.replace(' cm', '').trim();
  return normalized.length > 0 ? normalized : '?';
}
