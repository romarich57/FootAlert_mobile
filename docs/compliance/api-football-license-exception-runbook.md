# API-Football License Exception Runbook

## Default Policy

- Production release is blocked while API-Football license validation is not approved in writing.

## Temporary Exception Process

1. Exception duration must not exceed 7 calendar days.
2. Exception must be approved by:
- Legal owner
- Product owner
- Engineering manager
3. A dated ticket must document:
- Business reason
- Risk acceptance statement
- Expiration date (hard stop)

## Mandatory Fields

- Exception ticket URL
- Approved by (names + date)
- Start date (`YYYY-MM-DD`)
- End date (`YYYY-MM-DD`)
- Compensating controls

## Expiration Handling

- At expiration date, deployment must be blocked again unless written provider validation is complete.
- Do not renew exceptions without updated legal sign-off.
