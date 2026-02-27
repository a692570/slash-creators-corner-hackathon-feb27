# Slash 🔪

**AI agent that calls your providers and negotiates your bills down. You do nothing. It takes 10%.**

Americans overpay $50B+ annually on recurring bills. Slash researches competitor pricing, calls your providers over real phone lines, and negotiates better rates — while you sleep.

> 🏆 Built for the [**Autonomous Agents Hackathon SF**](https://luma.com/sfagents?tk=Zi7oGC) — Feb 27, 2026 — Individual sponsor prizes

---

## How It Works

1. **Add your bills** — internet, phone, insurance, subscriptions
2. **Slash researches** — finds competitor offers, builds your leverage profile
3. **Slash calls** — dials your provider's retention line and negotiates live
4. **You save** — average $240/year per bill. We take 10% of savings.

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User UI   │────▶│   Slash Server   │────▶│  Telnyx Voice   │
│  (Render)   │     │   (Node.js)      │     │  AI Assistants  │
└─────────────┘     └──────┬───────────┘     └────────┬────────┘
                           │                          │
                    ┌──────┴───────┐           ┌──────┴────────┐
                    │              │           │               │
              ┌─────▼─────┐ ┌─────▼─────┐  ┌──▼───┐   ┌──────▼──────┐
              │  Tavily    │ │  Yutori   │  │ PSTN │   │  Modulate   │
              │  Research  │ │  Browse   │  │ Call │   │  Velma      │
              └─────┬──────┘ └───────────┘  └──────┘   └─────────────┘
                    │                                         │
              ┌─────▼─────┐  ┌───────────┐  ┌──────────────┐
              │   Neo4j   │  │    SSE    │  │   Render     │
              │   Graph   │  │  Live Tx  │  │   Deploy     │
              └───────────┘  └───────────┘  └──────────────┘
```

**Tech Stack:**
- **Backend:** Express 5 + TypeScript (ES modules)
- **Frontend:** React + Vite (dark theme, #00ff88 accent)
- **Voice:** Telnyx Call Control + AI Assistants (GPT-4o, MiniMax TTS, Deepgram STT)
- **Research:** Tavily API + Yutori Browsing + Research API
- **Knowledge Graph:** Neo4j Aura
- **Real-time:** SSE (Server-Sent Events) for live transcript
- **Deployment:** Render

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/a692570/slash.git
cd slash
npm install

# Configure environment
cp .env.example .env
# Add your API keys to .env

# Development
npm run dev            # Backend at localhost:3000
cd frontend && npm run dev  # Frontend dev server
npm run smoke          # Endpoint smoke check (run with backend up)

# Production build
npm run build          # Builds frontend + backend
npm start              # Serves everything from Express
```

### Required API Keys

| Key | Purpose | Required |
|-----|---------|----------|
| `TELNYX_API_KEY` | Voice calls + AI assistants | Yes |
| `MODULATE_API_KEY` | Voice intelligence (emotion, PII) | No (graceful) |
| `TELNYX_PHONE_NUMBER` | Outbound caller ID | Yes |
| `TELNYX_CONNECTION_ID` | Call Control connection | Yes |
| `TAVILY_API_KEY` | Competitor research | Yes |
| `YUTORI_API_KEY` | Deep research + browsing | No (graceful fallback) |
| `NEO4J_URI/USER/PASSWORD` | Knowledge graph | No (graceful fallback) |
| `MODULATE_API_KEY` | Event-day voice safety integration | No (event day) |
| `TELNYX_WEBHOOK_VERIFY` | Enforce webhook verification (`true`/`false`) | No (recommended for prod) |
| `TELNYX_WEBHOOK_SECRET` or `TELNYX_WEBHOOK_PUBLIC_KEY` | Webhook signature credentials | Required when verification is enabled |

Recommended default for production hardening:
- Set `TELNYX_WEBHOOK_VERIFY=true`
- Use `TELNYX_WEBHOOK_SECRET` first (simpler setup)
- Keep `TELNYX_WEBHOOK_PUBLIC_KEY` as advanced/optional

> **For AI agents:** See [CLAUDE.md](./CLAUDE.md) for architecture details and [AGENTS.md](./AGENTS.md) for operating instructions.

---

## Sponsor Integrations

We integrate **6+ sponsor APIs** to maximize prize track eligibility:

| Sponsor | Integration | Status |
|---------|------------|--------|
| **Telnyx** | Call Control + AI Assistants | ✅ Done |
| **Tavily** | Competitor pricing research | ✅ Done |
| **Render** | Deployment platform | ✅ Config ready |
| **Neo4j** | Knowledge graph | ✅ Code ready, plug creds |
| **Yutori** | Deep research + browsing | ✅ Code ready, plug key |
| **Modulate** | Velma voice monitoring | 🔲 Integrate at event |

---

## Demo Instructions

1. Start the server: `npm run dev`
2. Open `http://localhost:3000`
3. Demo user auto-logs in (no auth needed)
4. Click a bill → "Negotiate" → Watch live transcript
5. Or add a new bill → Negotiate

The demo IVR creates a fake Comcast retention line for testing without real calls.

### Demo Reliability Checklist (Hackathon)

- Open `/bills` and verify bill list renders (route is now wired)
- Start one negotiation and confirm live transcript updates via SSE
- Upload one statement PDF and confirm `/api/scan` succeeds
- Check dashboard "Sponsor Integration Status" panel before presenting
- Keep `TELNYX_WEBHOOK_VERIFY=false` in local demo mode unless webhook credentials are configured

### Operational Playbooks

- Demo script: [`docs/demo-script.md`](./docs/demo-script.md)
- Pitch variants (30s/60s/90s/2m + Q&A): [`docs/pitch-versions.md`](./docs/pitch-versions.md)
- Day-of sponsor wiring: [`docs/day-of-integration.md`](./docs/day-of-integration.md)
- 24-hour release freeze policy: [`docs/release-freeze.md`](./docs/release-freeze.md)

---

## Team

Built by Abhishek at the [**Autonomous Agents Hackathon SF**](https://luma.com/sfagents?tk=Zi7oGC) — Feb 27, 2026

*Slash saves you money so you don't have to sit on hold.*
