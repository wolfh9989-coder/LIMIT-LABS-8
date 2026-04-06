# GitHub + Vercel Deployment

## Architecture
- Vercel hosts the Next.js app.
- Supabase hosts database and auth.
- Stripe handles billing.
- A separate worker host runs `npm run render-worker` for export jobs.

## 1. Push To GitHub

```powershell
git add .
git commit -m "Prepare production deployment"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

If `origin` already exists:

```powershell
git remote set-url origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

## 2. Create Vercel Project
- Import the GitHub repository in Vercel.
- Framework preset: Next.js.
- Root directory: project root.
- Build command: `npm run build`
- Output setting: leave default for Next.js.

## 3. Configure Environment Variables In Vercel
Add these from `.env.example`:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- Optional: `OLLAMA_ENABLED`, `OLLAMA_HOST`, `OLLAMA_MODEL`

Recommended production values:
- `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`
- `OLLAMA_ENABLED=false` unless `OLLAMA_HOST` points to an externally reachable Ollama server.

## 4. Configure Supabase
- Run the SQL in `supabase/schema.sql`.
- Verify `subscriptions`, `projects`, `media_assets`, and `export_jobs` exist.
- Verify your Supabase auth redirect URLs include the Vercel domain.

## 5. Configure Stripe
- Set checkout and portal env vars in Vercel.
- Point the Stripe webhook endpoint to:

```text
https://your-app.vercel.app/api/billing/webhook
```

## 6. Deploy The Worker Separately
Vercel should not run the export worker.
Use a VPS, Railway, Render, Fly.io, or another long-running Node host.

Worker command:

```bash
npm run render-worker
```

Worker env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RENDER_WORKER_INTERVAL_MS`
- `RENDER_WORKER_FFMPEG_TIMEOUT_MS`
- `RENDER_WORKER_MAX_ATTEMPTS`

## 7. Smoke Checks
- `GET /api/entitlement`
- `POST /api/projects`
- `POST /api/export/jobs`
- Stripe checkout opens correctly.
- Worker moves a queued export job to completed.

## Vercel-Specific Notes
- Local Whisper CLI and local FFmpeg process execution are disabled automatically on Vercel.
- If no OpenAI key is configured, transcription and media-analysis routes will not have a hosted speech fallback.
- Local Ollama defaults are skipped on Vercel unless the host is external.
