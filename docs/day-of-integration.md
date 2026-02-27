# Day-Of Sponsor Integration Runbook

For event day (Friday, February 27, 2026).

## Priority Order

1. Telnyx voice path
2. Tavily research
3. Render deployment health
4. Yutori/Neo4j enrichment
5. Modulate add-on

## Environment Matrix

| Key | Required for Demo | Required for Production Mode | Notes |
|---|---|---|---|
| `TELNYX_API_KEY` | Yes | Yes | Core outbound call path |
| `TELNYX_PHONE_NUMBER` | Yes | Yes | Outbound caller ID |
| `TELNYX_CONNECTION_ID` | Yes | Yes | Telnyx Call Control |
| `TELNYX_WEBHOOK_URL` | Yes | Yes | Must point to live app |
| `TELNYX_WEBHOOK_VERIFY` | No (`false`) | Yes (`true`) | Enable signature checks in prod mode |
| `TELNYX_WEBHOOK_SECRET` | Optional | Recommended | Preferred verification method |
| `TELNYX_WEBHOOK_PUBLIC_KEY` | Optional | Optional | Advanced verification path |
| `TAVILY_API_KEY` | Yes | Yes | Competitor research |
| `YUTORI_API_KEY` | No | No | Optional enrichment |
| `NEO4J_URI` `NEO4J_USER` `NEO4J_PASSWORD` | No | No | Optional graph memory |
| `MODULATE_API_KEY` | No | No | Event-day add-on |

## 10-Minute Bring-Up Checklist

1. Set env vars.
2. Start app and run `npm run smoke`.
3. Open `/api/demo/status` and confirm sponsor readiness statuses.
4. Run one negotiation from UI and confirm live transcript stream.
5. Keep one fallback path ready (scan flow).

## Sponsor Key Arrives Late (No Panic Path)

If any key arrives after demo setup:

1. Add key to environment.
2. Restart service.
3. Verify `/api/demo/status` changed from pending to configured.
4. Do not change code during event unless there is a blocker.

## Configuration Recommendation

For judged demo safety:
- Keep `TELNYX_WEBHOOK_VERIFY=false` unless verification credentials are confirmed.

For production demo/Q&A:
- Set `TELNYX_WEBHOOK_VERIFY=true` and use `TELNYX_WEBHOOK_SECRET`.
