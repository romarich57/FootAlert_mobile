import { ValidationBffError } from './errors.js';
export function parseOrThrow(schema, data) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
        throw new ValidationBffError(parsed.error.flatten());
    }
    return parsed.data;
}
