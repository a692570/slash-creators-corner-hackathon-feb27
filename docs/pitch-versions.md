# Pitch Versions (Hackathon)

Use this file as the single source of truth for live delivery.

## 30-Second Version

Slash is an autonomous bill-negotiation agent. You add a bill once, Slash researches competitor offers, makes a real outbound call over Telnyx, negotiates live, and returns measurable monthly savings. This is not a chatbot wrapper, it is an execution loop with outcome tracking. We align on outcomes with a simple model: users keep most of the savings, we take 10 percent of realized reduction.

## 60-Second Version

Slash is an autonomous bill-negotiation agent. Users add a bill once, and Slash does the rest: it researches competitor offers, places a real outbound call over Telnyx, negotiates in real time, and returns measurable monthly savings. The key here is not just a chatbot UI, it is an end-to-end agent loop with execution, feedback, and outcome tracking. We built it to be reliable under hackathon conditions: live status streaming, fallback-safe integrations, smoke checks, and a freeze policy before demo day. Business-wise, we align on outcomes with a simple model: users keep most of the savings, we take 10 percent of realized reduction. This can expand from consumer bills to any recurring cost workflow where negotiation is painful and high-friction. Slash turns hold-time and negotiation anxiety into an automated service.

## 90-Second Version

Slash automates one of the worst recurring tasks in consumer finance: calling providers and negotiating bills down.

The user gives us a bill once. Then Slash runs the full loop. It researches current competitor pricing, builds leverage, places a real outbound call over Telnyx, negotiates live, and returns exact monthly and annual savings in the app.

What matters is this is an execution system, not a chat demo. It handles real call flow, live state updates, and outcome parsing. Every negotiation adds provider-specific signal about what arguments and offers work, so the system improves over time. That learning loop is our defensibility.

On stack, we use Telnyx for actual call execution and Tavily for market research, with adapter-based integrations so missing credentials do not break the core product path. That lets us stay reliable in demo conditions while keeping a clear production hardening path.

Business model is outcome-aligned and simple: users keep most of the savings, Slash takes 10 percent of realized reduction. Initial wedge is high-friction recurring categories with clear ROI: internet, mobile, insurance, and medical billing.

Net: Slash turns hold-time and negotiation anxiety into an autonomous service with measurable financial impact.

## 2-Minute Version

Slash automates one of the most hated consumer tasks: negotiating recurring bills. The user flow is simple. Add a bill, confirm details, and Slash runs the rest of the loop end to end.

First, Slash does market research. It pulls current competitor pricing and builds leverage. Second, it initiates a real outbound call using Telnyx call control and AI assistant infrastructure. Third, it negotiates in real time with provider retention logic and continuously updates status in the app. Finally, it parses outcome, records savings, and shows exact monthly and annual impact.

The important part is that this is not a static script. Each negotiation contributes structured outcome data, so every future call gets sharper on provider-specific tactics and offer patterns. That learning loop is the defensibility layer, and we pair it with operational reliability so it actually works on demo day and in production paths.

We use Telnyx for the actual calls and Tavily for research, and the rest of the stack is adapter-based so integrations can be swapped without breaking core flow. Optional integrations degrade gracefully if credentials are missing.

The business model is simple and aligned: we win only when users save money. We take 10 percent of realized savings, far below legacy negotiation services. Our wedge is high-friction recurring categories where savings are obvious: internet, mobile, insurance, and medical billing where pain and upside are both large.

Slash turns hold-time and negotiation anxiety into an autonomous service with measurable ROI.

## Q&A Bank

1. What is defensible here?
Every negotiation teaches the system what works for that provider, then we compound that with a reliable execution stack for real calls.

2. Why will users trust this?
Clear user control, transparent savings reporting, and outcomes tied to real bill reductions.

3. What if a sponsor API is down?
Adapters are isolated. Core flow still runs with graceful degradation and visible status.

4. Why Telnyx vs alternatives?
We need real call control and production telephony primitives, not a voice demo wrapper.

5. How is this more than a scripted flow?
Research, strategy selection, live call handling, and outcome parsing are dynamic per bill and provider.

6. How do you handle safety/compliance?
Verification and guardrails are implemented or staged behind flags, with stricter production mode controls.

7. What is the GTM wedge?
High-friction recurring categories where savings are obvious: internet, mobile, insurance, and medical billing.

8. What is next after hackathon?
Real auth, persistent storage, stronger compliance controls, and tighter post-call quality analytics.
