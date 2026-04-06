# LIMIT LABS 8

AI Mobile Video and Content Studio MVP.

One input (YouTube link, blog post, transcript, or raw idea) becomes a complete multi-platform content pack:

- Scene-based short video scripts
- Clip breakdown with overlay text
- 100+ caption options
- Tweets and thread output
- Hooks and blog variations
- Font style preset system

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Supabase (projects + subscriptions)
- Stripe (checkout + portal + webhook)

## API Surface

- POST /api/repurpose
- GET /api/entitlement
- GET /api/projects
- POST /api/projects
- POST /api/billing/checkout
- POST /api/billing/portal
- GET /api/billing/summary
- POST /api/billing/webhook
- POST /api/export
- GET /api/export/jobs
- POST /api/export/jobs
- GET /api/media-assets
- POST /api/media-assets

## Run Locally

1. Install dependencies (already done if you scaffolded this project with npm):

```bash
npm install
```

2. Create environment file from template:

```bash
cp .env.example .env.local
```

3. Fill required variables in .env.local:

- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- OPENAI_API_KEY (optional, fallback generator works without it)
- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET

4. Create Supabase tables by running SQL in [supabase/schema.sql](supabase/schema.sql).

5. Start dev server:

```bash
npm run dev
```

6. Build for production:

```bash
npm run build
npm run start
```

7. Start the background render worker for queued MP4 jobs:

```bash
npm run render-worker
```

For a single pass over the queue:

```bash
npm run render-worker:once
```

## Testing

Run unit and integration tests:

```bash
npm run test
```

Run end-to-end happy path tests:

```bash
npm run test:e2e
```

## Operational Docs

- QA checklist: docs/qa-checklist.md
- Rollback and deployment runbook: docs/rollback-and-runbook.md
- GitHub and Vercel deployment guide: docs/deploy-github-vercel.md
- Performance and scale plan: docs/performance-and-scale.md
- Security access audit checklist: docs/security-access-audit.md

## Stripe Webhook (Local)

Forward Stripe events to this endpoint:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Use the printed webhook signing secret for STRIPE_WEBHOOK_SECRET.

## Notes

- Server-side entitlement enforces clip limits and export locking.
- Supabase Auth can be used for cross-device login via email magic link.
- Billing summary returns customer email and recent invoices when Stripe is configured.
- MP4 export jobs are processed by a real FFmpeg worker script and stored in export_jobs.
- Production hosting is split: deploy the Next.js app to Vercel and run the render worker on a separate long-running host.
- Upload background, logo, and audio assets from the app and attach them to queued render jobs.
- Project, billing, media, and export APIs require Supabase session tokens in production.
- Free plan is capped at 2 saved projects.
- Pro plan unlocks export and up to 10 clips.
- If Stripe or Supabase are missing, local fallbacks keep the app usable for development.
