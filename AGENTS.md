# AGENTS.md - Slash AI System Guide

This file is for coding agents and automation systems working on Slash.

## Mission

Slash has two parallel goals:

1. Demo-ready reliability for hackathon judging.
2. Production-ready guardrails without slowing demo momentum.

When in doubt, preserve demo flow first, then add safe hardening behind flags.

## Zero-Context Startup (Event Day)

If invoked with no prior context, read in this exact order:

1. `CLAUDE.md`
2. `AGENTS.md`
3. `README.md`
4. `docs/demo-script.md`
5. `docs/day-of-integration.md`
6. `docs/release-freeze.md`

Then run:

```bash
npm run smoke
npm run build
```

Do not begin implementation until these steps are complete.

## Current Product Flow

1. Demo user is initialized via `POST /api/demo/setup`.
2. User adds bills or scans a PDF statement.
3. Negotiation starts (`POST /api/bills/:id/negotiate`).
4. Research adapters run (Tavily + optional Yutori).
5. Telnyx call starts, live state streams over SSE.
6. Dashboard shows status, savings, and sponsor readiness.

## Non-Negotiable Reliability Rules

- Do not break `/`, `/bills`, `/bills/:id`, `/scan`, `/negotiations/:id`.
- Keep graceful fallback behavior when sponsor APIs are missing.
- Avoid hard dependencies on event-day keys.
- Keep TypeScript strict mode passing for frontend and backend builds.

## Security Modes

Use environment flag `TELNYX_WEBHOOK_VERIFY`:

- `false` (default): demo mode, accepts webhooks without signature enforcement.
- `true`: production mode, requires one of:
  - `TELNYX_WEBHOOK_SECRET` with header `x-telnyx-webhook-secret`.
  - `TELNYX_WEBHOOK_PUBLIC_KEY` with Telnyx signature headers.

Never force verification on in demo branches unless credentials are present.

## Sponsor Adapter Expectations

Track sponsor state in `/api/demo/status` and expose it in dashboard.

Required adapters:

- Telnyx (voice): must be operational.
- Tavily (research): should be visible in demo.
- Yutori (research): optional, graceful fallback.
- Neo4j (graph): optional, graceful fallback.
- Render (deployment): config should remain present.
- Modulate (voice safety): may be stubbed until event-day key is available.

## Day-Of Integration Pattern

For any sponsor API arriving at event time:

1. Add env vars to `.env.example`.
2. Add adapter in `src/services/` with isolated error handling.
3. Add status row in `/api/demo/status`.
4. Surface readiness in dashboard sponsor panel.
5. Keep a fallback path if adapter fails.

## Quick Validation Commands

```bash
npm install
npm run build
cd frontend && npm run build
```

If build fails, fix correctness issues before cosmetic changes.
