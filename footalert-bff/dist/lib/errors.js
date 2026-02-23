export class BffError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
export class ValidationBffError extends BffError {
    constructor(details) {
        super(400, 'VALIDATION_ERROR', 'Invalid request parameters.', details);
    }
}
export class UpstreamBffError extends BffError {
    constructor(statusCode, code, message, details) {
        super(statusCode, code, message, details);
    }
}
