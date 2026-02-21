import type { ZodType } from 'zod';

import { ValidationBffError } from './errors.js';

export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationBffError(parsed.error.flatten());
  }

  return parsed.data;
}
