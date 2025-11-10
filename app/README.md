# Agentic Gmail Outreach (Next.js)

Full-stack Outreach Control Tower built with Next.js 16, Tailwind, Prisma, and serverless route handlers. The application connects multiple Gmail inboxes via OAuth, imports lead lists, generates AI-personalised messaging, and schedules automated sends with safe throttling.

## Quickstart

```bash
cp .env.example .env          # populate with Gmail, Sheets & OpenAI secrets
npm install
npx prisma db push            # sync schema to your Postgres instance
npm run dev
```

Navigate to `http://localhost:3000` to access the dashboard.

## Core Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start local development server |
| `npm run build` | Production build (Next.js) |
| `npm run lint` | ESLint health check |
| `npm run prisma:migrate` | Apply migrations in production |

## Architecture

- `src/app/page.tsx` – Outreach cockpit UI
- `src/lib/*` – Gmail OAuth helpers, OpenAI personalisation, scheduler/dispatcher logic
- `src/app/api/*` – REST endpoints for OAuth, lead ingestion, queue runner
- `prisma/schema.prisma` – Relational model for accounts, campaigns, leads, jobs, messages

## Deployment

Deploy via Vercel:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-69d27148
```

Provision a Postgres database (Vercel Postgres, Neon, Supabase, etc.) and configure environment variables before deploying.

## Automation Notes

- Trigger `POST /api/dispatcher` on a schedule (e.g. Vercel Cron each minute) to send queued outreach
- Gmail delays and account rotation are enforced server-side to stay within safe limits
- Follow-up jobs are pre-generated according to campaign settings

## Troubleshooting

- Ensure OAuth redirect matches `GOOGLE_OAUTH_REDIRECT_URI`
- `prisma generate` runs automatically post-install; rerun via `npm run prisma:generate` if needed
- Check Vercel logs for failed dispatch attempts – errors are persisted on `OutreachJob.error`
