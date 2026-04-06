# Rollback and Deployment Runbook

## Deployment Steps
1. Deploy app build artifact.
2. Run database migrations and verify schema compatibility.
3. Deploy render worker process.
4. Run smoke checks:
   - GET /api/entitlement
   - POST /api/projects
   - POST /api/export/jobs

## Rollback Triggers
- Export queue failure rate exceeds 10% over 15 minutes.
- Stripe webhook processing failures exceed 5 consecutive events.
- API p95 latency doubles and remains elevated for 30 minutes.

## Rollback Procedure
1. Disable worker consumers to stop new processing.
2. Roll app deployment to previous stable version.
3. Re-enable worker consumers.
4. Re-run smoke checks and compare logs.

## Data Safety Checks
- Confirm no stuck jobs in processing for over timeout threshold.
- Confirm queued jobs remain queued after rollback.
- Confirm subscription table updates still occur for webhook events.

## Seed Data Sanity
- Verify one free and one pro test account exist.
- Verify sample project and media assets can be loaded.
- Verify one queued export and one completed export are visible in jobs API.
