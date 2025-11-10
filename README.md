# Gmail Outreach Automation Agent

Production-ready Next.js/Vercel application that automates cold email outreach through Gmail with AI-personalised copywriting, multi-account rotation, lead ingestion, and queue-based delivery controls.

> All source lives inside the `app/` directory. The rest of this README describes how to set up, run, and deploy the agent.

## Features

- OAuth2 Gmail integration with rotating inbox management and configurable rate limits
- Lead ingestion from CSV uploads or Google Sheets (service-account authenticated)
- Campaign builder with AI prompt controls, follow-up cadence, and send-window scheduling
- Prisma/PostgreSQL data model covering inboxes, leads, jobs, and message logs
- Dispatcher endpoint that batches sends with 30–120s jitter and follow-up scheduling
- React Query dashboard for real-time stats, quick actions, and campaign orchestration

## Stack

- **Frontend**: Next.js App Router, Tailwind CSS, React Query
- **Backend**: Next.js Route Handlers, Prisma ORM, PostgreSQL
- **Integrations**: Google APIs (Gmail & Sheets), OpenAI Responses API

## Local Development

```bash
cd app
cp .env.example .env            # Fill in secrets described below
npm install
npx prisma db push              # Or run migrations against your Postgres instance
npm run dev
```

Visit `http://localhost:3000` to access the Outreach Control Tower dashboard.

### Environment Variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (serverless friendly for Vercel) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth credentials for Gmail |
| `GOOGLE_OAUTH_REDIRECT_URI` | Redirect URL (e.g. `http://localhost:3000/api/google/callback`) |
| `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SHEETS_PRIVATE_KEY` | Service account for Sheets ingestion |
| `OPENAI_API_KEY` | API key for AI-driven personalisation |
| `CAMPAIGN_FROM_NAME` | Default display name for outbound emails |
| `DEFAULT_REPLY_TO` | Optional reply-to override |

### Database

Run `npx prisma migrate dev --name init` during initial setup and commit the generated migration. In production, invoke `npm run prisma:migrate`.

### Dispatcher Automation

Trigger `POST /api/dispatcher` on a cron (for example, Vercel Cron every minute) to process pending jobs. Each run respects send windows, account throttles, and follow-up limits.

## Deployment

The app is designed for Vercel:

1. Ensure all environment variables are configured in the project dashboard.
2. Provision a managed Postgres instance (Vercel Postgres/Supabase/etc).
3. Deploy using the CLI:
   ```bash
   cd app
   vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-69d27148
   ```
4. After the first deployment, run `vercel env pull` locally if needed.

## Project Structure (inside `app/`)

```
src/
  app/                       # Next.js routes and UI
    api/                     # Route handlers for OAuth, leads, dispatcher
    page.tsx                 # Outreach dashboard UI
  components/                # Shared UI primitives/providers
  lib/                       # Prisma, Google, OpenAI, scheduler logic
prisma/
  schema.prisma              # Database schema
```

## Verification Checklist

- `npm run lint` – ESLint (passes)
- `npm run build` – Next.js production build (passes)
- Gmail OAuth flow stores refresh tokens and surfaces accounts in UI
- CSV and Google Sheets imports deduplicate and normalise lead records
- Dispatcher enforces send jitter, follow-up scheduling, and account rotation

## Next Steps

- Add a background worker (e.g. edge queue or serverless cron) for autonomous dispatching
- Extend analytics with reply tracking and pipeline attribution
- Hook up webhook ingestion for Gmail replies to transition leads automatically

---

Built as an autonomous outreach agent to keep your pipeline full on autopilot. Configure the env, plug in your data sources, and let the system run.***
