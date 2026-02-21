export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: string,
  ) {
    super(message);
  }
}

export type HttpGetOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
};

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  signal?.addEventListener('abort', () => controller.abort(), { once: true });
  controller.signal.addEventListener('abort', () => clearTimeout(timeout), {
    once: true,
  });

  return controller.signal;
}

export async function httpGet<T>(url: string, options: HttpGetOptions = {}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 15_000;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
    signal: withTimeout(options.signal, timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(`HTTP ${response.status}`, response.status, body.slice(0, 500));
  }

  return (await response.json()) as T;
}
