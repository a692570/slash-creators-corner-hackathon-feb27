# Autonomous Agents Hackathon SF

**Date:** February 27, 2026
**Event:** https://luma.com/sfagents?tk=Zi7oGC

---

## Judges

| Name | Role | Company | LinkedIn |
|------|------|---------|----------|
| Carter Huffman | CTO, Co-Founder | Modulate | [Profile](https://www.linkedin.com/in/carter-huffman-a9aba05b/) |
| Graham Gullans | COO | Modulate AI | [Profile](https://www.linkedin.com/in/grahamgullans/) |
| Dhruv Batra | Co-founder, Chief Scientist | Yutori | [Profile](https://www.linkedin.com/in/dhruv-batra-dbatra/) |
| Anushk Mittal | Co-founder & CEO | Shapes inc | [Profile](https://www.linkedin.com/in/anushkmittal/) |
| Vladimir de Turckheim | Core Maintainer | Node.js | [Profile](https://www.linkedin.com/in/vladimirdeturckheim/) |
| Ojus Save | Developer Relations | Render | [Profile](https://www.linkedin.com/in/ojus/) |
| Shiffra Williams | DevRel | Render | [Profile](https://www.linkedin.com/in/shifra-williams/) |
| Marcelo Chaman Mallqui | Founding Design Engineer | Gumloop | [Profile](https://www.linkedin.com/in/marc-cham/) |

## Sponsors (derived from judges)

**$47k+ in Prizes!**
Teams of 4 max. In-person only. Application required.

### Schedule
- 9:30 AM: Doors Open
- 9:45 AM: Keynote & Opening Remarks
- 11:00 AM: Start Coding!
- 1:30 PM: Lunch
- 4:30 PM: Project Submission Deadline
- 5:00 PM: Finalists Presentations and Judging
- 7:00 PM: Awards Ceremony

**NOTE:** Only ~5.5 hours of coding time (11 AM - 4:30 PM). Most work must be done BEFORE the event.

### Full Sponsor List (from event page)
1. **AWS** (Amazon Web Services)
2. **OpenAI**
3. **Render** (2 judges)
4. **Tavily** (already integrated!)
5. **Yutori** (1 judge)
6. **Neo4j** (already in our architecture!)
7. **Modulate** (2 judges)
8. **Senso**
9. **Numeric**

| Sponsor | What They Do | Integration for Slash | Priority |
|---------|-------------|----------------------|----------|
| **Modulate** | Voice AI safety/intelligence (Velma). Real-time voice monitoring. | Pipe call audio through Velma for quality monitoring + safety guardrails during negotiations. | 🔴 HIGH (2 judges) |
| **Render** | Cloud deployment | Deploy everything on Render. render.yaml. | 🔴 HIGH (2 judges) |
| **Tavily** | AI search/research API | Already integrated for competitor research! Just make sure it's visible in demo. | ✅ DONE |
| **Neo4j** | Graph database | Already in architecture for knowledge graph. Spin up Aura Free. | 🟡 MED (in PRD) |
| **OpenAI** | LLM / Realtime API | Telnyx AI Assistants uses GPT-4o under the hood. Can swap to OpenAI Realtime at event if they provide API keys. | 🟡 MED |
| **AWS** | Cloud / Bedrock / etc | Could use Bedrock for LLM or S3 for call recordings. Light touch. | 🟢 LOW |
| **Yutori** | AI agents platform | Frame pitch around autonomous agents (their thesis). | 🟡 MED (1 judge) |
| **Senso** | AI knowledge management for CX | Could frame our strategy engine as knowledge management for negotiations. | 🟢 LOW |
| **Numeric** | AI for accounting/finance | Bills = financial data. Light mention in pitch. | 🟢 LOW |

## Strategy: Maximize Prize Eligibility

### Must Do (Judge Alignment)
1. **Deploy on Render** - 2 judges from Render. Use render.yaml. Mention it in pitch.
2. **Integrate Modulate** - 2 judges from Modulate (CTO + COO). Their product is voice safety/moderation. Even a light integration (voice analysis on calls) scores huge points.
3. **Node.js best practices** - Core maintainer judging. Clean TypeScript, proper error handling, modern Node patterns.

### Should Do
4. **Yutori angle** - Frame pitch around autonomous agents (their thesis). Slash acts independently on user's behalf.
5. **Shapes angle** - Negotiator persona design. The AI has a defined character: polite, persistent, data-armed.

### Research Needed
- [ ] Modulate has "Velma" - voice intelligence platform. Has a preview at preview.modulate.ai. Their AI Guardrails product monitors AI voice agents in real-time, detects when conversations go off-rails, and flags escalation. PERFECT fit: we use Velma to monitor our negotiation calls for quality + safety. Their CTO + COO are judging. This is our #1 sponsor integration.
- [ ] Does Gumloop have an API we can use for workflow orchestration?
- [ ] Does Yutori have a public API or SDK?

---

## Revised Architecture (Sponsor-Optimized)

```
User → Slash Dashboard (React/Node.js)
  → Tavily (competitor research)
  → Strategy Engine (built-in)
  → Telnyx Call Control (outbound call)
    → Telnyx AI Assistant (negotiation conversation)
    → Modulate ToxMod? (voice safety monitoring)
  → Results Dashboard
  
Deployed on: RENDER ← important
Built with: Node.js/TypeScript ← important
```
