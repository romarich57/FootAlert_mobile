export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function truncateJsonList<T>(items: T[], limit: number = 8): T[] {
  return items.slice(0, limit);
}
