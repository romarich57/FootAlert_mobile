export class BffError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export class ValidationBffError extends BffError {
  constructor(details: unknown) {
    super(400, 'VALIDATION_ERROR', 'Invalid request parameters.', details);
  }
}

export class UpstreamBffError extends BffError {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(statusCode, code, message, details);
  }
}
