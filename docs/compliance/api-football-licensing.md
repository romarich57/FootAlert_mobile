# API-Football Licensing Validation

LICENSE_STATUS: PENDING
WRITTEN_PROOF_URL: MISSING
VALIDATION_DATE: MISSING
VALIDATED_BY: MISSING

## Scope

- Provider: API-Football
- Usage: FootAlert mobile/web data display and notifications
- Redistribution model: To be validated in writing before public production release

## Required Written Validation

- Explicit authorization for commercial redistribution
- Any territorial restrictions
- Attribution obligations
- Caching, retention, and sublicensing limits

## Release Gate

- CI fails by default while `LICENSE_STATUS` is not `APPROVED`
- To unblock release:
1. Set `LICENSE_STATUS: APPROVED`
2. Add immutable proof link in `WRITTEN_PROOF_URL`
3. Set `VALIDATION_DATE` in `YYYY-MM-DD`
4. Set responsible owner in `VALIDATED_BY`

## Compliance Owner

- Team: Product + Legal
- Technical owner: BFF maintainers
