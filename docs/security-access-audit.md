# Security and Access Audit Checklist

## Protected API Verification
- Confirm these endpoints require authenticated identity and user scoping:
  - /api/projects
  - /api/export/jobs
  - /api/export/jobs/[jobId]
  - /api/media-assets
  - /api/media-analysis
  - /api/entitlement
- For each protected endpoint:
  - Missing token/fallback user returns 401 in production mode.
  - User cannot access resources belonging to another user.
  - Object lookups include user_id filters where applicable.

## Webhook Hardening
- Verify stripe-signature is mandatory and validated.
- Verify duplicate Stripe event IDs are ignored (idempotent behavior).

## Upload Authorization
- Ensure uploaded media always binds to resolved identity.userId.
- Ensure delete flow checks both asset id and user id before deletion.

## Regression Tests To Keep
- Unit test for export jobs entitlement guard (free plan blocked, pro allowed).
- Integration test for idempotency conflict on duplicate queue key.
- E2E create -> edit -> queue export happy path.

## Manual Abuse Tests
- Attempt to read or delete another user's media asset by id.
- Attempt to fetch another user's export job by job id.
- Attempt duplicate webhook replay with same event id.
