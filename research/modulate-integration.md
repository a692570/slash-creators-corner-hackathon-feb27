# Modulate AI Integration Research

**Project:** Slash - AI Agent for Bill Negotiation  
**Context:** Autonomous Agents Hackathon SF (Feb 27, 2026) - Carter Huffman from Modulate is a JUDGE  
**Research Date:** February 17, 2026

---

## Executive Summary

Modulate is a frontier voice AI company specializing in real-time voice intelligence and safety. Their core technology is **Velma**, an "Ensemble Listening Model" (ELM) designed to understand conversations holistically—not just transcribing text, but analyzing *how* something was said (tone, emotion, stress, manipulation signals).

**Key Finding for Hackathon:** Modulate does NOT appear to have a public self-service API or developer portal. They are enterprise-focused with sales-driven onboarding. However, their **AI Guardrails** solution is directly relevant to Slash's use case.

---

## Products & Technology

### 1. Velma (Core AI Engine)

- **What it is:** World's first production Ensemble Listening Model (ELM)
- **How it works:** Coordinates hundreds of specialized models, each focused on a specific aspect of speech or behavior (emotion, stress, aggression, fraud signals, deepfake detection)
- **Key differentiator:** Understands *how* something was said—not just what was said
- **Stats:** 21 billion minutes of audio analyzed, 100+ million events detected
- **Languages:** Supports 18 languages

### 2. ToxMod

- **Original product** focused on voice moderation for gaming and social platforms
- **Pricing tiers:**
  - **Starter:** Free (1,500 hours one-time, 7.5¢/hour overage)
  - **Epic:** $5,000/month (50,000 hours included)
  - **Legendary:** $10,000/month (100,000 hours)
  - **Mythic:** $20,000/month (200,000 hours)
  - **Custom:** Enterprise (contact sales)

### 3. AI Guardrails (Most Relevant for Slash)

This is the key product for the hackathon. AI Guardrails enables:
- **Real-time monitoring** of AI voice agents
- **Detection when conversations go off-script** or escalate inappropriately
- **Transparent, auditable decisions**—explains *why* something was flagged
- **Integration with existing voice infrastructure**

Use cases include:
- Flagging AI agent hallucinations
- Detecting when agent is being manipulated or provoked
- Ensuring compliance with scripted behaviors
- Real-time escalation triggers

### 4. Enterprise Platform Features

- **Dashboards & Review Console:** UI for exploring conversations and escalations
- **APIs & Webhooks:** Programmatic access to voice intelligence signals
- **Integrations:** Compatible with telephony, CCaaS, VoIP systems
- **Compliance:** ISO 27001 certified, GDPR/CCPA/HIPAA compliant

---

## API & Developer Access

### Current State: **Enterprise-Only, No Public API**

Based on research:
1. **No public developer portal** found (no api.modulate.ai or similar)
2. **No self-service signup** observed
3. **Sales-driven process:** All tiers require contacting sales
4. **APIs exist** but are enterprise-only (part of their platform)

### What APIs *Could* Do (Based on Platform Description):

From their documentation, the platform supports:
- Real-time audio stream processing
- Webhook-based alerts for events (fraud, escalation, aggression)
- REST APIs for fetching conversation analysis
- Integration with telephony/CCaaS platforms

### Realistic Integration Path for Hackathon:

Since there's no public API, the realistic options are:

1. **Request Early Access / Developer Pilot**
   - Contact Modulate directly via their website
   - Mention the hackathon and Carter Huffman as judge
   - Emphasize the innovative use case (bill negotiation agent monitoring)
   
2. **Demo/Prototype with Mock Data**
   - Build the integration architecture assuming their API structure
   - Create mock responses that mirror what Velma would return
   - Show the *design* of the integration (even without live access)

3. **Post-Hackathon Follow-up**
   - Use the hackathon demo as a proof-of-concept to pitch them
   - Carter Huffman is a judge—this gives you a direct conversation starter

---

## What Would Integration Look Like for Slash?

Given Slash is an AI agent that makes phone calls to negotiate bills, here are the realistic integration points:

### 1. AI Agent Guardrails (Primary)
- **Monitor Slash's behavior** in real-time during calls
- Detect if Slash is being manipulated by the counterparty
- Flag if Slash goes off-script or makes inappropriate concessions
- Ensure compliance with legal/regulatory constraints

### 2. Customer Sentiment Analysis
- Detect frustration, anger, or distress in the human on the call
- Trigger escalation or tone adjustment in real-time
- Identify when the negotiation is going well vs. poorly

### 3. Fraud/Manipulation Detection
- Detect if the human counterparty is using social engineering tactics
- Identify urgency cues, coercive tone, or manipulation attempts
- Protect Slash from being tricked into bad deals

### 4. Post-Call Analytics
- Analyze full conversation for quality assurance
- Identify patterns in successful vs. failed negotiations
- Generate reports on negotiation performance

### Proposed Architecture

```
[Twilio/Vonage] → [Slash AI Agent] → [Modulate Velma API (enterprise)]
                      ↑                        ↓
                 Real-time              Alerts & Insights
                 audio stream           (webhooks)
```

---

## Carter Huffman - What He Cares About

Based on Modulate's positioning and public information:

### Background
- **Role:** CTO of Modulate
- **Company founded:** ~2017 (based on "nearly a decade of operation" mentioned in compliance docs)
- **Location:** Boston/Somerville, MA
- **Focus:** Voice AI, trust & safety, ethics in AI

### What Impresses Him (Inferred from Company Positioning)

1. **Real-world Impact**
   - Modulate emphasizes practical, enterprise-ready solutions
   - They highlight "tens of millions in business value created and preserved"
   - They care about *solving real problems*, not just cool tech

2. **Transparency & Auditability**
   - Their ELM architecture is designed for transparency
   - Every decision can be traced back to specific audio moments
   - They explicitly contrast with "black-box AI" approaches

3. **Voice-Native AI**
   - They differentiate from "LLM wrappers" that just transcribe and analyze text
   - Velma processes audio directly, understanding tone, emotion, context
   - They value understanding *how* something is said, not just *what*

4. **Safety & Ethics**
   - Trust & safety is their core business
   - They emphasize privacy, compliance, and responsible AI
   - Their hiring process uses their own voice-masking technology (anonymized interviews)

5. **Enterprise-Grade Reliability**
   - ISO 27001 certified
   - GDPR/CCPA/HIPAA compliant
   - Focus on cost-efficiency at scale (their benchmark shows highest accuracy at lowest cost)

### How to Impress Him at the Hackathon

1. **Show Understanding of Voice AI Nuance**
   - Don't just transcript and analyze—demonstrate you understand tone, emotion, subtext
   - Use concepts like "ensemble listening" or "voice-native analysis"

2. **Address Safety & Trust**
   - Show how your agent handles edge cases, manipulation, or inappropriate responses
   - Demonstrate transparent, auditable decision-making

3. **Real-World Utility**
   - Focus on tangible outcomes (saving money on bills)
   - Show the business value, not just the tech

4. **Directly Mention His Work**
   - Ask informed questions about Velma and their approach
   - Show you've researched their technology

---

## Recommendations for the Hackathon

### Short-Term (During Hackathon)

1. **Reach out to Modulate NOW**
   - Email their team (via contact page) mentioning:
     - Carter Huffman as judge
     - Your innovative use case
     - Request for developer access or API preview
   - Give them 24-48 hours to respond

2. **Build the Integration Architecture**
   - Even without API access, design the integration
   - Document the API calls, webhook handlers, data flows
   - This shows technical competence even without live access

3. **Create a Mock Integration**
   - Simulate Velma responses for demo purposes
   - Show what the dashboard would look like
   - Be transparent that it's a mock (actually, this impresses judges—shows you planned ahead)

4. **Prepare Questions for Carter**
   - Ask about the ELM architecture
   - Ask about real-time guardrails for AI agents
   - Ask about pricing for startups/hackathon projects

### Long-Term (Post-Hackathon)

1. **Follow Up with Carter**
   - Share your demo/video
   - Pitch the use case for bill negotiation
   - Explore partnership or pilot opportunities

2. **Build the Real Integration**
   - Once you have access, integrate Velma for real-time monitoring
   - Use the hackathon as a proof-of-concept

---

## Key Contacts & Resources

- **Website:** https://www.modulate.ai
- **Contact Page:** https://www.modulate.ai/contact
- **Velma Demo:** http://preview.modulate.ai/
- **Pricing:** https://www.modulate.ai/pricing (ToxMod)
- **LinkedIn:** https://www.linkedin.com/company/modulate-ai
- **Twitter/X:** @modulateai

---

## Summary

| Aspect | Finding |
|--------|---------|
| **Public API?** | No—enterprise-only, sales-driven |
| **Free Tier?** | Yes (Starter: 1,500 hours one-time), but requires signup |
| **Hackathon Access?** | Unlikely for live API, but worth asking |
| **Best Use Case for Slash** | AI Agent Guardrails—monitor Slash's behavior in real-time |
| **Key Differentiator** | Voice-native analysis (not just transcript + LLM) |
| **What impresses Carter** | Real-world impact, transparency, safety-focused AI |

---

*Research compiled for the Autonomous Agents Hackathon SF, Feb 27, 2026*