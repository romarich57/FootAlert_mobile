import { BffError } from '../errors.js';
export class ReadStoreSnapshotUnavailableBffError extends BffError {
    constructor(details) {
        super(503, 'READ_STORE_SNAPSHOT_UNAVAILABLE', 'No valid read-store snapshot is available for this resource.', details);
    }
}
export class ReadStoreSnapshotInvalidBffError extends BffError {
    constructor(details) {
        super(503, 'READ_STORE_SNAPSHOT_INVALID', 'The freshly generated read-store snapshot is incomplete.', details);
    }
}
