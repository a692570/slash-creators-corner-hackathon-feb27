# Yutori API Integration

> AI-powered web automation for bill negotiation workflows.

## Overview

[Yutori](https://yutori.com) is a web agent platform providing browser automation, web research, and monitoring APIs. For Slash, Yutori enables:
- Finding retention phone numbers on provider websites
- Scraping bill line items from account pages
- Researching competitor pricing

## API Tiers

| API | Use Case | Pricing |
|-----|----------|---------|
| **n1** | Low-level pixel-to-action browser control | $0.75/1M input tokens |
| **Browsing** | Managed browser automation | $0.015/step (n1) or $0.10/step (Claude) |
| **Research** | Deep web research with 100+ MCP tools | $0.35/task |
| **Scouting** | Scheduled recurring monitoring | $0.35/scout-run |

## Authentication

Simple API key header:

```bash
curl -X POST https://api.yutori.com/v1/browsing/tasks \
  -H "X-API-Key: yt_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"task": "...", "start_url": "..."}'
```

Get API keys at [platform.yutori.com/settings](https://platform.yutori.com/settings).

## Endpoints

### Browsing API

```typescript
// POST /v1/browsing/tasks
{
  task: "Find retention phone number",
  start_url: "https://provider.com/support",
  max_steps: 50,
  output_schema: {
    type: "object",
    properties: {
      phone: { type: "string" },
      hours: { type: "string" }
    }
  }
}

// GET /v1/browsing/tasks/{id}
// Response: { task_id, status, result, structured_result }
```

### Research API

```typescript
// POST /v1/research/tasks
{
  query: "Compare AT&T and Verizon mobile plan pricing",
  user_timezone: "America/Los_Angeles",
  output_schema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        carrier: { type: "string" },
        price: { type: "string" }
      }
    }
  }
}
```

## TypeScript Client

```typescript
// src/lib/yutori.ts
const API_KEY = process.env.YUTORI_API_KEY!;
const BASE = "https://api.yutori.com/v1";

export async function createBrowsingTask(
  task: string,
  startUrl: string,
  outputSchema?: object
) {
  const res = await fetch(`${BASE}/browsing/tasks`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task, start_url: startUrl, output_schema: outputSchema }),
  });
  return res.json();
}

export async function getTaskResult(taskId: string) {
  const res = await fetch(`${BASE}/browsing/tasks/${taskId}`, {
    headers: { "X-API-Key": API_KEY },
  });
  return res.json();
}

export async function pollUntilComplete<T>(taskId: string, timeout = 300000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const { status, structured_result } = await getTaskResult(taskId);
    if (status === "succeeded") return structured_result as T;
    if (status === "failed") throw new Error("Task failed");
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Timeout");
}
```

## Cost Estimates

| Task | Steps | Cost |
|------|-------|------|
| Find retention phone | ~15 | $0.23 |
| Scrape bill (w/ login) | ~30 | $0.45 |
| Competitor research | 1 task | $0.35 |

**Monthly (100 negotiations):** ~$85

## Slash Integration Points

```typescript
// Find retention phone number
const { task_id } = await createBrowsingTask(
  "Find the customer retention department phone number",
  "https://comcast.com/support",
  { type: "object", properties: { phone: { type: "string" } } }
);

// Scrape bill (requires auth)
const { task_id: billTask } = await createBrowsingTask(
  `Log in and extract bill line items`,
  "https://provider.com/account",
  { require_auth: true }
);

// Competitor pricing research
const researchRes = await fetch(`${BASE}/research/tasks`, {
  method: "POST",
  headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ query: "Compare T-Mobile unlimited plans" }),
});
```

## Considerations

- **No free tier** — requires credit card
- **No official JS SDK** — use REST directly
- **Auth flows** — passing credentials to cloud service
- **CAPTCHAs** — may block some provider sites
- **Async only** — use webhooks or polling

## Resources

- [Docs](https://docs.yutori.com)
- [Platform](https://platform.yutori.com)
- [Python SDK](https://github.com/yutori-ai/yutori-sdk-python)
- [MCP Server](https://github.com/yutori-ai/yutori-mcp)