# CLAUDE.md — AI Agent Entry Point

Read this first. This is the single source of truth for understanding and working on this codebase.

## What Is Slash

AI agent that makes real phone calls to negotiate bills down. User adds a bill, Slash researches competitors, calls the provider's retention line via Telnyx AI Assistants, negotiates a lower rate, and shows the savings.

**Hackathon project** for Autonomous Agents Hackathon SF (Feb 27, 2026). Individual sponsor prizes. 5.5 hours of coding at event. Most code written beforehand.

## Hackathon

- **Event:** Autonomous Agents Hackathon SF, Feb 27, 2026
- **Coding window:** 11:00 AM - 4:30 PM (5.5 hours)
- **Goal:** Working demo that makes a real call and negotiates a bill down

## Read Order

1. **This file** — architecture, flows, gotchas
2. **TASKS.md** — current status of all tasks, sprint plan, what's done/open
3. **PRD.md** — full product requirements (reference, don't need to read top-to-bottom)
4. **DEVLOG.md** — chronological dev history, key decisions

## Day-Of Zero-Context Bootstrap (For Any AI Agent)

If an AI is invoked on event day with no prior context, do this in order:

1. Read `CLAUDE.md` (this file) fully.
2. Read `AGENTS.md` for operating constraints and demo-vs-prod rules.
3. Read `README.md` for current run commands and demo reliability checklist.
4. Read these runbooks:
   - `docs/demo-script.md`
   - `docs/day-of-integration.md`
   - `docs/release-freeze.md`
5. Run validation before making changes:
   - `npm run smoke` (requires backend running)
   - `npm run build`
6. Preserve demo-first behavior:
   - Do not break core flow (`/`, `/bills`, `/bills/:id`, `/scan`, `/negotiations/:id`)
   - Keep graceful degradation when sponsor keys are missing
7. Only after all above, start feature/bug work.

Required outcome from any day-of AI session:
- Be able to explain current hackathon strategy, sponsor integration state, demo script, and fallback plan without asking for extra context.

## Architecture

- **Backend:** Express 5 + TypeScript (ES modules, .js extensions in imports)
- **Frontend:** React + Vite (dark theme, #00ff88 green accent)
- **Voice:** Telnyx Call Control + AI Assistants (outbound call, AI negotiates)
- **Research:** Tavily (competitor pricing) + Yutori (deep research, browsing)
- **Knowledge Graph:** Neo4j (stores provider data, leverage, outcomes)
- **Real-time:** SSE (Server-Sent Events) for live transcript during calls
- **Deploy:** Render (render.yaml ready, creds set at event)

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Express server, middleware, static serving, startup |
| `src/routes/api.ts` | All API routes (~900 lines) |
| `src/services/voice.ts` | Telnyx Call Control + AI Assistant integration |
| `src/services/assistant.ts` | Creates/manages "Slash Bill Negotiator" AI assistant |
| `src/services/demo-ivr.ts` | Fake Comcast retention IVR for demo (cooperative, always gives discount) |
| `src/services/events.ts` | SSE event bus for real-time updates |
| `src/services/research.ts` | Tavily competitor rate research |
| `src/services/yutori.ts` | Yutori Research + Browsing API client |
| `src/services/strategy.ts` | Negotiation strategy builder |
| `src/services/graph.ts` | Neo4j knowledge graph |
| `src/services/storage.ts` | In-memory storage (dies on restart, fine for demo) |
| `src/services/outcome-parser.ts` | Parses AI conversation to extract negotiation results |
| `src/services/demo-seed.ts` | Seeds 5 demo bills + graph data on startup |
| `src/services/scanner.ts` | PDF credit card statement parser |
| `src/types/index.ts` | All TypeScript types |
| `frontend/src/pages/Dashboard.tsx` | Main dashboard with stats + bill list |
| `frontend/src/pages/AddBill.tsx` | Add new bill form |
| `frontend/src/pages/BillDetail.tsx` | Bill detail + "Negotiate" button |
| `frontend/src/pages/NegotiationLive.tsx` | Live negotiation view with SSE transcript |
| `frontend/src/pages/ScanStatement.tsx` | PDF upload + parse |
| `frontend/src/api/client.ts` | API client + demo user init |
| `render.yaml` | Render deployment blueprint |

## File Map

```
slash/
├── src/                          # Backend (Express + TypeScript)
│   ├── index.ts                  # Server entry. Serves API + frontend static files.
│   ├── routes/
│   │   └── api.ts                # ALL API routes. Auth, bills, negotiations, dashboard, webhooks, demo setup.
│   ├── services/
│   │   ├── voice.ts              # Telnyx Call Control + AI Assistant. Outbound calls, webhook handler.
│   │   ├── assistant.ts          # Creates/finds the "Slash Bill Negotiator" Telnyx AI Assistant.
│   │   ├── demo-ivr.ts           # Creates a fake Comcast retention line (AI assistant) for demo calls.
│   │   ├── events.ts             # SSE event bus for real-time negotiation updates.
│   │   ├── research.ts           # Tavily + Yutori competitor research. Parallel, fault-tolerant.
│   │   ├── yutori.ts             # Yutori Research + Browsing API client. Gracefully degrades.
│   │   ├── strategy.ts           # Negotiation strategy engine. Picks tactics based on leverage + category.
│   │   ├── graph.ts              # Neo4j knowledge graph. Stores providers, rates, retention offers, results.
│   │   ├── storage.ts            # In-memory storage (users, bills, negotiations). Dies on restart. Fine for demo.
│   │   ├── demo-seed.ts          # Seeds demo user + 5 bills + graph data on startup.
│   │   ├── outcome-parser.ts     # Parses AI transcript to extract success/failure + new rate. No LLM needed.
│   │   └── scanner.ts            # PDF credit card statement scanner (OpenAI Vision). Nice-to-have.
│   └── types/
│       └── index.ts              # ALL type definitions. Providers, bills, negotiations, tactics, etc.
├── frontend/                     # React + Vite + Tailwind
│   └── src/
│       ├── App.tsx               # Router + demo user init on boot
│       ├── api/client.ts         # API client. Auto-sends x-user-id header. Unwraps { success, data } responses.
│       ├── components/           # Layout, StatCard, StatusBadge, ProviderLogo
│       └── pages/
│           ├── Dashboard.tsx     # Bills list + stats + recent negotiations
│           ├── BillDetail.tsx    # Single bill view + negotiate button + polling for updates
│           ├── NegotiationLive.tsx # Live progress stepper + transcript panel + SSE + confetti on success
│           ├── AddBill.tsx       # Category → provider → rate form
│           └── ScanStatement.tsx # PDF upload + detected bills
├── research/                     # API research docs for sponsor integrations
├── docs/                         # GitHub Pages landing page
├── render.yaml                   # Render deployment config
├── TASKS.md                      # Task tracker with priorities and status
├── DEVLOG.md                     # Chronological development log
└── PRD.md                        # Full product requirements document
```

## Critical Flow: The Negotiate Path

This is the entire product in one flow:

```
User clicks "Negotiate" on a bill
    │
    ▼
POST /api/bills/:id/negotiate          [src/routes/api.ts:460]
    │
    ├─ Validates bill exists + belongs to user
    ├─ Creates negotiation record           [storage.ts:createNegotiation]
    ├─ Researches competitors               [research.ts:researchCompetitorRates]
    │   ├─ Tavily search (always)
    │   └─ Yutori research (if key configured, parallel)
    ├─ Builds strategy                      [strategy.ts:buildStrategy]
    │   └─ Gets leverage from Neo4j         [graph.ts:getLeverage]
    ├─ Initiates outbound call              [voice.ts:initiateCall]
    │   ├─ Gets/creates AI assistant        [assistant.ts:getOrCreateAssistant]
    │   ├─ POST /v2/calls (Telnyx)
    │   └─ POST /v2/calls/{id}/actions/ai_assistant_start
    └─ Returns 202 { negotiationId, status }
    
    ... call happens ...
    
Telnyx sends webhooks to POST /api/webhooks/telnyx
    │
    ▼
handleWebhook()                            [voice.ts:handleWebhook]
    │
    ├─ call.answered → starts AI assistant if not already running
    ├─ call.ai.assistant.transcript → emits SSE event, logs live transcript
    │   └─ emitTranscript()               [events.ts]
    ├─ call.ai.assistant.completed → THE MONEY SHOT:
    │   ├─ Parses outcome                  [outcome-parser.ts:parseNegotiationOutcome]
    │   ├─ Updates negotiation record       [storage.ts:updateNegotiation]
    │   ├─ Updates bill status              [storage.ts:updateBillStatus]
    │   ├─ Stores result in graph           [graph.ts:storeNegotiationResult]
    │   └─ Emits completion via SSE         [events.ts:emitCompletion]
    ├─ call.ai.assistant.error → marks negotiation failed, emits SSE error
    └─ call.hangup → marks failed if AI didn't complete first

Frontend connects to GET /api/negotiations/:id/events (SSE)
    ├─ Receives real-time transcript events
    ├─ Receives status change events
    └─ On completion → shows savings + confetti
    
(Fallback: polling GET /api/negotiations/:id every 3 seconds)
```

## API Response Convention

**Every backend response** follows this shape:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message" }
```

**The frontend client** (`frontend/src/api/client.ts`) unwraps this. The `fetchJSON` wrapper adds:
- `Content-Type: application/json`
- `x-user-id` header from localStorage (set during demo init)

Individual API methods (e.g., `api.getBills()`) further unwrap `data` into the expected type. If you add a new endpoint, match this pattern or the frontend will break.

## Auth Model (Demo Mode)

There is no real auth. On app boot:
1. Frontend calls `POST /api/demo/setup`
2. Backend creates/finds demo user, seeds bills, returns `{ data: { userId: "user_xxx" } }`
3. Frontend stores userId in `localStorage` as `slash_demo_user_id`
4. Every subsequent request sends `x-user-id` header
5. Backend routes check this header and return 401 if missing

## Demo Data

On server start (`src/index.ts`):
1. `seedDemoBills()` creates a demo user (demo@slash.ai) with 5 bills across 4 categories
2. Two bills have pre-completed successful negotiations (State Farm, T-Mobile)
3. If Neo4j is connected, `seedGraphData()` adds competitor rates, retention offers, and past results

**Do NOT** call `initializeSampleData()` in storage.ts — it's a legacy function that creates duplicate data. It exists but must not be auto-invoked.

## Gotchas

**Backend:**
- `storage.ts` is in-memory. Server restart = all data gone. This is intentional for hackathon.
- `telnyxRequest()` is copy-pasted in 3 files (voice.ts, assistant.ts, demo-ivr.ts). Don't add a 4th — refactor if you touch these.
- The negotiate endpoint (`POST /bills/:id/negotiate`) is async but returns 202 immediately. The actual negotiation continues in the background via webhooks.
- `graph.ts` gracefully degrades. If Neo4j isn't configured, all graph functions return null/empty. Never throw on missing Neo4j.
- `outcome-parser.ts` uses regex/heuristics, not LLM. It's good enough for demo but will need tuning with real transcripts.

**Frontend:**
- `AddBill.tsx` and `ScanStatement.tsx` import types from `../../../src/types/index` (path escape into backend). Fragile but works.
- `ProviderLogo` color map uses display names but bills have provider IDs, so colors always fall back to gray. Cosmetic.
- `NegotiationLive.tsx` has a mock fallback: if API polling fails, it auto-advances the status. Good for demo, masks real failures.
- No error boundaries in React. An API failure = white screen.

**Environment:**
- `TELNYX_API_KEY`, `TELNYX_PHONE_NUMBER`, `TELNYX_CONNECTION_ID` are required for calls
- `TAVILY_API_KEY` is required for research
- Everything else (Neo4j, Yutori, OpenAI, Modulate) gracefully degrades if not set
- `TELNYX_WEBHOOK_URL` must point to a publicly reachable URL (ngrok for local, Render URL for prod)

## Telnyx Webhook Payloads

Example payloads the webhook handler receives:

```json
// call.answered
{
  "event_type": "call.answered",
  "payload": {
    "call_id": "v3:xxx",
    "call_control_id": "v3:yyy",
    "state": "answered"
  }
}

// call.ai.assistant.transcript (live, multiple events)
{
  "event_type": "call.ai.assistant.transcript",
  "payload": {
    "call_id": "v3:xxx",
    "call_control_id": "v3:yyy",
    "transcript": "I see that Spectrum is offering $49.99 per month...",
    "role": "assistant"
  }
}

// call.ai.assistant.completed (end of call)
{
  "event_type": "call.ai.assistant.completed",
  "payload": {
    "call_id": "v3:xxx",
    "call_control_id": "v3:yyy",
    "summary": "Successfully negotiated rate from $129.99 to $104.99. Customer retention applied $25/month loyalty credit for 12 months.",
    "outcome": "completed"
  }
}

// call.hangup
{
  "event_type": "call.hangup",
  "payload": {
    "call_id": "v3:xxx",
    "call_control_id": "v3:yyy",
    "state": "hangup",
    "duration": 342
  }
}
```

## Sponsor Integrations (Priority Order)

| Priority | Sponsor | # Judges | Status | Service File |
|----------|---------|----------|--------|-------------|
| 🔴 | Render | 2 | Config ready, deploy at event | render.yaml |
| 🔴 | Modulate | 2 | No public API, get access at event | research/modulate-integration.md |
| 🟡 | Yutori | 1 | Code ready, needs API key at event | src/services/yutori.ts |
| 🟡 | Neo4j | sponsor | Code + seed ready, needs instance at event | src/services/graph.ts |
| ✅ | Tavily | sponsor | Fully integrated | src/services/research.ts |
| ✅ | OpenAI | sponsor | Via Telnyx AI Assistants | src/services/assistant.ts |

## Credentials (.env)

```
PORT=3000
TELNYX_API_KEY=<set in Render dashboard>
TELNYX_PHONE_NUMBER=+14155491552
TELNYX_CONNECTION_ID=2888193300928398948
TELNYX_WEBHOOK_URL=<Render URL>/api/webhooks/telnyx
TAVILY_API_KEY=<already configured>
YUTORI_API_KEY=<get at event from sponsor>
NEO4J_URI=<get at event from sponsor>
NEO4J_USER=<get at event>
NEO4J_PASSWORD=<get at event>
```

## What Works

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

## What Needs Testing Before Hackathon

- ✅ REAL OUTBOUND CALL TEST - Done Feb 23, 2026. Call connected, AI spoke, webhooks received. Bugs found and fixed.
- ⚠️ Demo IVR test - Create the demo assistant, call it, verify it responds as fake Comcast retention.

### Test Results (Feb 23, 2026)

**First successful live outbound call test:**
- Call connected to test number (+1XXXXXXXXXX)
- AI assistant started and spoke
- Webhooks received and processed
- Bugs found and fixed:
  1. Webhook parser expected `event.event_type` but Telnyx wraps events in `data` object
  2. Payload uses `call_leg_id` not `call_id` - fixed all references in voice.ts
  3. Reverted test override that routed calls to USER_PHONE_NUMBER

### Telnyx Connection Setup

The Call Control Application "Voice Bridge Call Control" (ID: 2888193300928398948) was configured:
- Connection was enabled (was disabled)
- Outbound Voice Profile "Default" (ID: 2800648158680450136) was assigned
- **Note:** Webhook URL needs to be updated to the deployment URL when deploying

## What to Build at Hackathon (5.5 hours)

1. Plug in Neo4j Aura creds (sponsor handout)
2. Plug in Yutori API key (sponsor handout)
3. Integrate Modulate Velma for voice monitoring (2 judges from Modulate - HIGH priority)
4. Deploy to Render
5. Polish demo flow end-to-end
6. Pitch deck / demo script

## What NOT to Touch

- `docs/index.html` — Landing page, deployed on GitHub Pages. Separate concern.
- `initializeSampleData()` in storage.ts — Legacy, creates duplicate data. Do not call.
- Voice settings in assistant.ts — `Minimax.speech-2.8-turbo.English_SadTeen` is confirmed working. Don't change the voice.

## Build & Run

```bash
# Backend
npm install
npm run dev              # tsx watch, hot reload

# Frontend (separate terminal)
cd frontend && npm install && npm run dev

# Full build (what Render runs)
npm run build            # builds frontend + backend
npm start                # serves everything from Express

# Type check
npx tsc --noEmit         # backend
cd frontend && npx tsc -b # frontend
```

## Modulate Velma-2 Integration (NEW)

Service file: `src/services/modulate.ts` (ready to use)
API docs: `research/modulate-apis/` (batch, streaming, vfast)

**Key functions:**
- `isModulateConfigured()` — checks for API key
- `analyzeBatchAudio(buffer, filename)` — POST audio, get transcript + emotions + accents + PII
- `buildVoiceIntelligence(utterances)` — aggregate into dashboard summary

**Wiring needed:**
1. In `voice.ts`: after `call.ai.assistant.completed`, download recording and call `analyzeBatchAudio()`
2. Add `GET /api/negotiations/:id/voice-intelligence` endpoint in `api.ts`
3. Add Voice Intelligence panel to `NegotiationLive.tsx`
4. Stretch: use WebSocket streaming API for real-time emotion during call

**API:** `POST https://modulate-developer-apis.com/api/velma-2-stt-batch`
**Auth:** `X-API-Key` header
**Features:** emotion detection, speaker diarization, accent detection, PII/PHI tagging
