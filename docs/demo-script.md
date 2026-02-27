# Slash Hackathon Demo Script (3 Minutes)

Date target: Friday, February 27, 2026  
Audience: judges + sponsor reps

## Goal

Show one complete user story:
1. Bills are tracked.
2. Slash negotiates autonomously.
3. Savings are visible.
4. Sponsor integrations are real and visible.

## Pre-Demo Setup (T-10 minutes)

1. Start backend: `npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Run smoke test in a second terminal: `npm run smoke`
4. Open app and confirm:
   - Dashboard loads
   - Sponsor Integration Status card is visible
   - At least one bill exists

If smoke fails, do not start demo until fixed.

## Live Script (timeboxed)

### 0:00-0:20 - Problem framing

"Recurring bills are a tax on attention. Slash negotiates those bills for you over real phone rails."

### 0:20-0:50 - Show dashboard and sponsor status

1. Open Dashboard.
2. Point to Sponsor Integration Status panel.
3. Mention enabled adapters (Telnyx, Tavily, Yutori/Neo4j fallback, Render deploy).

### 0:50-1:40 - Start negotiation

1. Click into an existing bill.
2. Click Negotiate.
3. Navigate to live negotiation page.
4. Call out real-time status updates (`researching -> calling -> negotiating`).

### 1:40-2:20 - Show live transcript + result

1. Keep the live screen up.
2. Point to transcript updates.
3. When completed, show monthly/annual savings.

If call is slow:
"The call is live; while that completes, I’ll show statement ingestion."

### 2:20-2:45 - Statement scan fallback demo

1. Go to Scan Statement.
2. Upload demo PDF.
3. Show detected bills and add one.

### 2:45-3:00 - Close with business + platform angle

"Slash charges 10% of realized savings. It’s an autonomous agent that does research, calls, and negotiation, with production hardening already staged behind flags."

## Failure Lines (use only if needed)

- If Telnyx is unavailable:
  "Voice rail is degraded right now; the product degrades gracefully and still shows research + workflow orchestration."
- If one sponsor key is missing:
  "Integration is adapter-based; missing keys are isolated and surfaced in status without breaking the core flow."
- If webhook verification is off:
  "Verification is flag-gated for demo safety; production mode is one env flip plus secret."

## Hard Stop Rule

At 2:50, start closing statement no matter what state the call is in.
