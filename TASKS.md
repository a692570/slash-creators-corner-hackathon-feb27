# Slash - Task Tracker 🔪

**Hackathon:** Autonomous Agents Hackathon SF, Feb 27, 2026
**Deadline:** 8 days from Feb 19
**Goal:** WIN. Ship a working demo that makes a real phone call and negotiates a bill down.

### 🔑 Credentials Strategy
**Do NOT provision Neo4j, Yutori, Modulate, or other sponsor services yourself.**
Sponsors will hand out API keys/instances at the event on Feb 27. All integration code should be written and tested with mocks/graceful degradation. On hackathon day, just plug credentials into `.env` and go.

- **Already have:** Telnyx API key, Tavily API key, OpenAI (via Telnyx AI Assistants)
- **Get at event:** Neo4j instance, Yutori API key, Modulate/Velma API key, AWS credits
- **All services gracefully degrade** if credentials are missing (graph.ts logs warning, research falls back to Tavily-only, etc.)

---

## Codebase State (as of Feb 23)

### What Actually Exists (5,500+ lines total)
- **Backend (Express/TS):** Full route structure (`src/routes/api.ts` ~900 lines), types (`src/types/index.ts` 542 lines)
- **Services:**
  - `voice.ts` (~300 lines): Telnyx Call Control + AI Assistants integration. Webhook handlers for `call.answered`, `call.ai.assistant.transcript`, `call.ai.assistant.completed`, `call.hangup`. SSE emission wired.
  - `assistant.ts` (~150 lines): Creates/manages "Slash Bill Negotiator" Telnyx AI Assistant.
  - `demo-ivr.ts` (~200 lines): Fake Comcast retention IVR for demo (cooperative, always gives discount).
  - `events.ts` (~100 lines): SSE event bus for real-time negotiation updates. Subscribe/unsubscribe/emit pattern.
  - `research.ts` (~200 lines): Tavily + Yutori competitor research. Parallel, fault-tolerant.
  - `yutori.ts` (~300 lines): Yutori Research + Browsing API client. Gracefully degrades if key not set.
  - `strategy.ts` (411 lines): Builds negotiation strategies from competitor data + graph leverage.
  - `graph.ts` (509 lines): Neo4j knowledge graph. Stores providers, rates, retention offers, results.
  - `storage.ts` (428 lines): In-memory storage for users, bills, negotiations. Full CRUD.
  - `demo-seed.ts` (~200 lines): Seeds demo user + 5 bills + graph data on startup.
  - `outcome-parser.ts` (~150 lines): Parses AI transcript to extract success/failure + new rate.
  - `scanner.ts` (280 lines): PDF credit card statement scanner.
- **Frontend (React):**
  - `Dashboard.tsx` (130 lines), `AddBill.tsx` (244 lines), `BillDetail.tsx` (237 lines)
  - `NegotiationLive.tsx` (~400 lines): Live negotiation view with SSE transcript panel + auto-scroll + polling fallback
  - `ScanStatement.tsx` (305 lines): Statement upload + parse
  - `api/client.ts` (~160 lines): API client + demo user init on boot
- **Deploy:** `render.yaml` configured with repo, branch, autoDeploy, Telnyx creds
- **Landing page:** `index.html` deployed on GitHub Pages

### What's Working
- ✅ Full backend API (bills CRUD, negotiations, dashboard, webhooks)
- ✅ Voice service (Telnyx Call Control + AI Assistants)
- ✅ Demo IVR (fake Comcast retention that cooperates)
- ✅ Tavily research integration
- ✅ Yutori research + browsing (graceful degradation)
- ✅ Neo4j graph service + seed data (needs instance at event)
- ✅ Outcome parser (extracts results from AI conversation)
- ✅ SSE live updates (transcript streams to frontend)
- ✅ React frontend (dashboard, add bill, bill detail, live negotiation, statement scan)
- ✅ Demo user auto-setup (no auth needed)
- ✅ render.yaml (Render deployment ready)

### Critical Issues
1. **E2E CALL TEST COMPLETE** ✅ — Successfully tested Feb 23, 2026. Call connected, AI spoke, webhooks received. Bugs found and fixed (webhook parser, call_id vs call_leg_id).
2. **Demo IVR test** — Create the demo assistant, call it, verify it responds as fake Comcast retention.

---

## Test Results (Feb 23, 2026)

**First successful live outbound call test:**
- Call connected to test number
- AI assistant started speaking
- Webhooks received and processed
- Bugs found and fixed:
  1. Webhook parser expected `event.event_type` but Telnyx wraps in `data` object
  2. Payload uses `call_leg_id` not `call_id` - fixed all references
  3. Reverted test override routing calls to USER_PHONE_NUMBER

---

## Task List

### 🔴 P0 - Must Have for Demo Day (Critical Path)

#### T1: Voice Agent Rewrite ✅ DONE
**Owner:** Crabishek | **Est:** 1-2 days | **Blocked by:** Nothing (creds ready)
**What:** Rewrite `src/services/voice.ts` to use Telnyx AI Assistants.
**Note:** Rewrote voice.ts + assistant.ts to use real Telnyx AI Assistants. Fixed instruction passing on call.answered, added transcript/completion/error webhook handlers, fixed voice setting and variable bugs. Compiles clean.
**Approach:** 
1. Create a "Slash Bill Negotiator" assistant via `POST /v2/ai/assistants` with negotiation instructions, GPT-4o model, MiniMax voice, Deepgram transcription.
2. Outbound call: `POST /v2/calls` (Dial) to provider retention number.
3. On call answer: `POST /v2/calls/{call_control_id}/actions/ai_assistant_start` with assistant ID + dynamic instructions (bill details, competitor rates, tactics).
4. Webhooks: `call.conversation.ended` for results, `call.conversation_insights.generated` for transcript.
**Files:** `src/services/voice.ts` (rewrite), `src/services/assistant.ts` (new, manages Telnyx AI Assistant)
**Acceptance:** Can make a real outbound call to a test number, AI speaks the negotiation greeting, converses, and we get transcript back.
**Reference:** Existing assistant pattern from "Crabishek Voice Agent" (assistant-5bf76f01) on the account.

#### T2: Telnyx Account Setup ✅ DONE
**What:** API key, phone number (+14155491552), Call Control connection (2888193300928398948), Tavily key. All in `.env`.

#### T3: Deploy on Render ✅ DONE
**Owner:** Crabishek | **Est:** 2-3 hours
**What:** Create `render.yaml`. Deploy Express backend + serve React frontend from Express. Single service.
**Requirements:**
- Public URL for Telnyx webhooks (call.conversation.ended, call.answered, etc.)
- Environment variables configured on Render dashboard
- Health check at `/health` (already exists)
- Serve frontend: `app.use(express.static('frontend/dist'))` in src/index.ts
**Files:** New `render.yaml`, update `src/index.ts`, update `package.json` build scripts
**Why Render:** 2 judges from Render. Free points.
**Note:** Created `render.yaml` (Render Blueprint), updated `src/index.ts` to serve frontend static files + SPA catch-all, updated `package.json` with build script (builds frontend then backend) and Node.js engines field.

#### T5: Demo Flow (End-to-End) ⬜
**Owner:** TBD | **Est:** 1 day
**What:** Wire the full happy path: Add bill > Research runs > Strategy built > Call initiated > Live updates > Result shown.
**This is the money shot for demo day.** Everything else supports this flow.
**Note:** Webhook → negotiation update wiring complete (Feb 22). The `call.ai.assistant.completed` webhook now parses outcomes via `outcome-parser.ts` and updates negotiation records in storage. Also handles `call.hangup` (marks failed if no completion) and `call.ai.assistant.error`. Negotiations no longer stuck at "negotiating" forever.

### 🟡 P1 - Should Have (Makes Demo Impressive)

#### T10: Yutori Browsing Integration ✅ DONE
**Owner:** Crabishek | **Est:** 3-4 hours
**What:** Created `src/services/yutori.ts` (300+ lines). Full TypeScript client wrapping Yutori's REST API (Browsing + Research endpoints). Integrated into research pipeline via `researchCompetitorWithYutori()`. Gracefully degrades if API key not set.
**Acceptance:** Can call Yutori to research a provider and get structured competitor data back. Falls back to Tavily-only if Yutori key not set.
**Note:** Yutori is a sponsor with 1 judge (chief scientist). Integration scores prize track points.

#### T6: Neo4j Setup ✅ DONE (code ready, credentials at event)
**Owner:** Crabishek | **Est:** 2-3 hours
**What:** Seed code ready. Neo4j Aura instance will be provisioned at the event (sponsor handout). Connect `graph.ts` on-site.
**Output:** Working knowledge graph that gets smarter with each negotiation.
**MUST DO:** Neo4j is a sponsor. Real instance required, no faking. **Get credentials at event.**
**Note:** Graph seed data added to `demo-seed.ts` with `seedGraphData()`. Seeds competitor rates for 5 providers, 10 retention offers, 3 past negotiation results. Called automatically on startup after Neo4j connects. Gracefully skips if Neo4j not configured.

#### T7: Seed Demo Data ✅ DONE
**Owner:** Crabishek | **Est:** 1-2 hours
**What:** Pre-populate storage with demo user, demo bills + Neo4j graph with competitor rates, retention offers, and past results.
**Files:** `src/services/demo-seed.ts` (updated with `seedGraphData()`), `src/index.ts` (calls seedGraphData on startup)
**Note:** In-memory: 5 demo bills (Comcast, AT&T Wireless, State Farm, Spectrum, T-Mobile) with 2 past successful negotiations. Neo4j: competitor rates, retention offers with success rates, negotiation history showing the graph "learning".

#### T8: Auth (Minimal) ✅ DONE (skipped real auth)
**Owner:** Crabishek | **Est:** 3-4 hours
**What:** Demo user auto-setup via `POST /api/demo/setup`. Frontend calls `initDemoUser()` on boot, stores userId in localStorage. No login page needed.
**Files:** No new files needed — using existing demo setup endpoint and client init.

#### T9: Live Negotiation Updates ✅ DONE
**Owner:** Crabishek | **Est:** 3-4 hours
**What:** SSE implemented in `src/services/events.ts`. Wired to webhooks in `voice.ts`. SSE route added to `api.ts`. `NegotiationLive.tsx` updated with live transcript panel + SSE connection. Polling kept as fallback.
**Files:** `src/services/events.ts` (new), updated `NegotiationLive.tsx` with transcript panel

### 🟢 P2 - Nice to Have (Polish)

#### T14: Statement Scanner ⬜
**Owner:** TBD | **Est:** Already built
**What:** Test and polish `scanner.ts`. Upload a real statement, verify parsing.
**Files:** `src/services/scanner.ts`, `frontend/src/pages/ScanStatement.tsx`

#### T11: Landing Page Polish ⬜
**Owner:** TBD | **Est:** Ongoing
**What:** Continue iterating on `index.html`. Add demo video when ready.

#### T13: Modulate Velma Integration ⬜
**Owner:** Crabishek + Abhishek | **Est:** 3-4 hours (at event)
**What:** Integrate Modulate's Velma voice intelligence to monitor negotiation calls.
**Approach:** 
- Research Velma API before event (preview.modulate.ai)
- At event: get API access from Modulate team (Carter/Graham are judges, will be on-site)
- Pipe call audio or use webhook integration for real-time voice monitoring
- Show monitoring dashboard: emotion detection, escalation alerts, call quality score
**Why:** 2 judges from Modulate (CTO + COO). This is the highest-value integration.
**Prep before event:** Stub out the integration code so we just plug in API keys on-site.

#### T12: Pitch Deck / Demo Script ⬜
**Owner:** Abhishek + AI | **Est:** 1 day (closer to event)
**What:** 3-minute pitch. Problem > Solution > Demo > Market > Ask.

---

## Key Decisions (Made)

1. **Voice approach:** Telnyx AI Assistants. Dial via Call Control, then `ai_assistant_start`. Telnyx handles GPT-4o, MiniMax TTS, Deepgram STT. No OpenAI key needed (swap at event if they provide one).
2. **Neo4j:** Code + seed data ready. Get Aura Free instance from sponsor at event. Plug creds into `.env`.
3. **Auth:** Skip. "Login as Demo User" button. Judges don't care.
4. **Deploy target:** Render. Two Render judges. Non-negotiable.
5. **Modulate integration:** Pipe call audio through Velma for voice safety monitoring. Two Modulate judges (CTO + COO). Highest priority sponsor integration.

## Sponsor Integration Checklist

| Sponsor | Integration | Status | Priority |
|---------|------------|--------|----------|
| Tavily | Competitor research API | ✅ Code exists, API key configured | Done |
| Neo4j | Knowledge graph for provider data | ✅ Code + seed ready, plug creds at event | HIGH (sponsor) |
| Render | Deployment platform | ✅ render.yaml configured, ready to deploy | HIGH (2 judges) |
| Modulate | Velma voice monitoring on calls | 🔲 Research API, integrate at event | HIGH (2 judges) |
| OpenAI | GPT-4o via Telnyx AI Assistants | ✅ Indirect (Telnyx handles it) | Done |
| Yutori | Deep research + browsing API | ✅ Client ready, plug key at event | MED (1 judge) |
| AWS | Could use for call recordings (S3) | 🔲 Stretch goal | LOW |
| Senso | Pitch framing (knowledge for CX) | N/A - narrative only | LOW |
| Numeric | Pitch framing (financial data) | N/A - narrative only | LOW |

## Hackathon Day Schedule (Feb 27)

- 9:30 AM: Doors open
- 9:45 AM: Keynote
- 11:00 AM: START CODING (5.5 hrs only!)
- 1:30 PM: Lunch
- 4:30 PM: SUBMISSION DEADLINE
- 5:00 PM: Finalists present
- 7:00 PM: Awards

**⚠️ Only 5.5 hours at event. Everything must work BEFORE we walk in. Event time = Modulate integration + polish + demo prep.**

## Sprint Plan (Feb 19-27)

| Day | Date | Focus |
|-----|------|-------|
| 1 | Feb 19 (Wed) | ✅ Setup: Telnyx creds, Tavily key, hackathon research |
| 2 | Feb 20 (Thu) | ✅ Voice Agent: T1 rewrite, assistant created, T3 config done |
| 3 | Feb 21 (Sat) | ✅ Deploy to Render, test real outbound call |
| 4 | Feb 22 (Sat) | ✅ Neo4j seed code + graph data (T6, T7) |
| 5 | Feb 23 (Sun) | ✅ SSE live updates, webhook wiring, transcript panel, render config cleanup |
| 6 | Feb 24 (Mon) | Polish demo flow, bug fixes |
| 7 | Feb 25 (Tue) | Landing page polish + bug fixes |
| 8 | Feb 26 (Wed) | Pitch deck + rehearse + final fixes |
| 🏆 | Feb 27 (Thu) | Hackathon: Modulate on-site, demo, win |

---

## How to Resume (Session Recovery)

If context is lost, read these files in order:
1. `TASKS.md` (this file) - current state of all tasks
2. `PRD.md` - full product requirements
3. `src/services/voice.ts` - the most critical piece to get right
4. `src/routes/api.ts` - all API endpoints
5. `src/types/index.ts` - data models

The repo is at `github.com/a692570/slash`. Clone to `/tmp/slash`.
Landing page is live at `https://a692570.github.io/slash/`.

## Hackathon Day Status (Feb 27, 2026)

### Phase 0: COMPLETE ✅
- [x] Modulate API key secured (admin, Velma-2 STT)
- [x] Neo4j sandbox created (blank, write access)
- [x] Yutori API key secured
- [x] Tavily API key confirmed
- [x] Telnyx API key confirmed
- [x] `src/services/modulate.ts` written and pushed
- [x] `render.yaml` updated with cron job (2 services)
- [x] `CLAUDE.md` updated with Modulate wiring guide
- [x] Modulate API docs saved to `research/modulate-apis/`

### Phase 1: Deploy (11:00-11:45)
- [ ] Deploy to Render
- [ ] Set all env vars
- [ ] Update TELNYX_WEBHOOK_URL
- [ ] Hit /health, confirm 200

### Phase 2: Wire Modulate (11:45-1:00)
- [ ] Hook analyzeBatchAudio into voice.ts post-call
- [ ] Add GET /api/negotiations/:id/voice-intelligence
- [ ] Add Voice Intelligence panel to NegotiationLive.tsx
- [ ] Update /api/demo/status with Modulate status

### Phase 3: E2E Test (1:00-1:30)
- [ ] Full negotiate flow on live deployment
- [ ] Confirm all sponsor integrations visible

### Phase 4: Polish + Submit (1:30-4:30)
- [ ] Provider insights panel (Neo4j graph data visible)
- [ ] Persist transcripts in storage
- [ ] Demo rehearsal
- [ ] Submit by 4:30
