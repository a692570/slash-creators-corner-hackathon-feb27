# Demo IVR Configuration

## Overview

This document describes the **Comcast Retention Demo IVR** - a simulated provider retention line for Slash hackathon demos.

## Purpose

The demo IVR provides a **guaranteed-successful demo experience**:
- No dependency on real company phone lines
- Consistent, predictable behavior
- Designed to eventually offer a discount (demo always succeeds)
- Professional voice different from Slash's negotiation agent

## Components

### 1. Demo IVR Assistant (`src/services/demo-ivr.ts`)

Creates a Telnyx AI Assistant that simulates a Comcast retention agent.

**Configuration:**
- **Name:** `Comcast Customer Retention Demo`
- **Model:** `openai/gpt-4o`
- **Voice:** `Telnyx.NaturalHD.astra` (professional female voice)
- **Background Audio:** Call center ambient noise
- **Max Duration:** 15 minutes

**Behavior:**
1. **Greets** as Comcast Customer Retention
2. **Accepts any account number** for verification
3. **Initially resists** discounts ("your plan is already competitive")
4. **Responds to competitor mentions** with 10% off offer
5. **Escalates under pressure** to 15-20% off
6. **Eventually agrees** to $25/month loyalty credit for 12 months
7. **Ends pleasantly** - demo success!

### 2. Demo Seed Data (`src/services/demo-seed.ts`)

Pre-populates the dashboard with realistic demo bills.

**Demo Bills:**

| Provider | Category | Monthly Rate | Status | Savings |
|----------|----------|--------------|--------|---------|
| Comcast (Xfinity) | Internet | $129.99 | Ready to negotiate | - |
| AT&T Wireless | Cell Phone | $185.00 | Ready to negotiate | - |
| State Farm | Insurance | $247.00 | ✅ Negotiated | $47/mo |
| Spectrum | Internet | $89.99 | Ready to negotiate | - |
| T-Mobile | Cell Phone | $140.00 | ✅ Negotiated | $30/mo |

**Demo User:**
- Email: `demo@slash.ai`
- Password: `demo123`
- Phone: `+15551234567`

### 3. API Endpoints

#### `POST /api/demo/setup`

Sets up the complete demo environment:
1. Creates/finds the demo IVR assistant
2. Seeds demo bills
3. Returns assistant ID and demo user credentials

**Response:**
```json
{
  "success": true,
  "data": {
    "ivr": {
      "assistantId": "assistant_xxx",
      "phoneNumber": "+1xxx",
      "status": "created" | "existing"
    },
    "bills": {
      "seeded": true,
      "count": 5
    },
    "demoUser": {
      "email": "demo@slash.ai",
      "password": "demo123"
    }
  }
}
```

#### `GET /api/demo/status`

Checks demo environment status.

## Demo Flow

### Step 1: Setup
```bash
curl -X POST http://localhost:3000/api/demo/setup
```

### Step 2: Login
Use the demo user credentials:
- Email: `demo@slash.ai`
- Password: `demo123`

### Step 3: Start Negotiation
1. Navigate to the Comcast bill ($129.99/month)
2. Click "Negotiate"
3. Slash will call the demo IVR

### Step 4: Watch the Magic
The demo IVR will:
1. Answer as Comcast retention
2. Ask for account verification (accepts anything)
3. Initially resist discounts
4. When Slash mentions competitors or pushes, offer 10-20% off
5. Eventually agree to a $25/month loyalty credit
6. Confirm and end the call

### Step 5: Success!
- Dashboard shows the savings
- Negotiation marked as successful
- Demo complete!

## Expected Conversation

```
IVR: "Thank you for calling Comcast Customer Retention. My name is Sarah, how can I help you today?"

Slash: "Hi, I'm calling about my account, I'm looking to get a better rate on my bill."

IVR: "I understand you're looking for a better rate, but I have to say your current plan is already very competitive for your area."

Slash: "I've been looking at Spectrum and they're offering $79/month for similar speeds."

IVR: "Oh, I see you've been doing your research... Let me see what I can do. I can offer you a 10% loyalty discount - that would bring your bill down to about $117/month."

Slash: "That's still pretty high compared to what I'm seeing elsewhere."

IVR: "Okay, okay... Let me check if I have any additional authorization. [pause] Alright, I found something. I can offer 15% off, bringing you to about $110/month."

Slash: "Can you do any better? I'm really thinking about switching."

IVR: "You know what, let me talk to my supervisor... [pause] I got approval. I can apply a $25/month loyalty credit for the next 12 months. That brings your bill to $104.99/month, locked in for a year. How does that sound?"

Slash: "That sounds good, I'll take it."

IVR: "Great! I've applied that to your account. You'll see the credit on your next bill. Thank you so much for being a Comcast customer!"
```

## Technical Details

### Telnyx API Integration

The demo IVR uses Telnyx's AI Assistants API:
- **Endpoint:** `https://api.telnyx.com/v2/ai/assistants`
- **Authentication:** Bearer token via `TELNYX_API_KEY` env var

### Caching

- Assistant ID is cached in memory after first lookup/creation
- Prevents duplicate assistants on server restart
- Use `clearDemoCache()` to reset for testing

### Error Handling

- If IVR creation fails, the demo setup still succeeds (bills are seeded)
- Error is logged and assistant ID returns as "failed"
- Demo can still proceed with bill data

## Testing

### Local Testing
```bash
# Start the server
npm run dev

# Setup demo
curl -X POST http://localhost:3000/api/demo/setup

# Check status
curl http://localhost:3000/api/demo/status
```

### Manual IVR Test
Call the assistant directly (if phone number is configured) or use Telnyx's test call feature in the portal.

## Maintenance

### Updating Demo Bills
Edit `src/services/demo-seed.ts` and modify the `DEMO_BILLS` array.

### Updating IVR Behavior
Edit `src/services/demo-ivr.ts` and modify the `DEMO_INSTRUCTIONS` constant.

### Adding New Demo Providers
1. Add to `DEMO_BILLS` array
2. Ensure provider ID exists in `src/types/index.ts`
3. Optionally create additional IVR assistants for other providers

## Notes for Demo Day

1. **Call `POST /api/demo/setup` before the demo** to ensure everything is ready
2. **Login as `demo@slash.ai`** to see pre-populated bills
3. **The demo is designed to succeed** - the IVR will eventually offer a discount
4. **Two bills already show savings** (State Farm, T-Mobile) to demonstrate value immediately
5. **Comcast bill is the target** for live demo negotiation

---

*Created for Slash hackathon demo - February 2026*
