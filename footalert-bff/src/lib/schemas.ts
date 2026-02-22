import { z } from 'zod';

export const numericStringSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Expected a numeric string.');

const positiveIntBaseSchema = z
  .union([z.string(), z.number()])
  .transform(value => Number(value))
  .refine(value => Number.isInteger(value) && value > 0, 'Expected a positive integer.');

export const positiveIntSchema = positiveIntBaseSchema;

export function boundedPositiveIntSchema(min: number, max: number) {
  return positiveIntBaseSchema.refine(
    value => value >= min && value <= max,
    `Expected an integer between ${min} and ${max}.`,
  );
}

export const timezoneSchema = z.string().trim().min(1).max(120);

export const seasonSchema = z
  .union([z.string(), z.number()])
  .transform(value => Number(value))
  .refine(value => Number.isInteger(value) && value >= 1900 && value <= 2300, 'Invalid season.');

export const commaSeparatedIdsSchema = z
  .string()
  .trim()
  .transform(value =>
    value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean),
  )
  .refine(value => value.length > 0, 'Expected at least one id.');

export function commaSeparatedNumericIdsSchema({
  maxItems,
}: {
  maxItems?: number;
} = {}) {
  const baseSchema = z
    .string()
    .trim()
    .transform(value =>
      value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean),
    )
    .refine(value => value.length > 0, 'Expected at least one id.')
    .refine(
      value => value.every(item => /^\d+$/.test(item)),
      'Expected only numeric ids.',
    );

  if (typeof maxItems !== 'number') {
    return baseSchema;
  }

  return baseSchema.refine(
    value => value.length <= maxItems,
    `Expected at most ${maxItems} ids.`,
  );
}
