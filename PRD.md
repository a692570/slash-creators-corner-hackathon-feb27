# Slash - AI Bill Negotiation Agent

## Product Requirements Document (PRD)

**Version:** 1.1  
**Hackathon:** Autonomous Agents Hackathon SF, Feb 27, 2026  
**Status:** MVP Planning  
**Focus:** 4 Verticals (Internet, Cell Phone, Insurance, Medical)

---

## 1. Problem Statement

### The Pain
- **Americans overpay on recurring bills** — average household spends $400+/month on telecom, cell, insurance, and medical
- **Sitting on hold for 30-60 minutes to negotiate is painful** — most people give up
- **Existing services take 40% of savings** — Trim, Billshark, and similar take a massive cut
- **No leverage** — individual customers have no bargaining power vs. billion-dollar providers

### Market Size
- **Total Addressable Market**: 130M+ American households with recurring bills
- **Average savings potential per household**: $200-600/year across all verticals
- **Breakdown by vertical**:
  - Internet/Cable: $20-50/month ($240-600/year)
  - Cell Phone: $15-40/month ($180-480/year)
  - Insurance: $30-100/month ($360-1200/year)
  - Medical: 20-50% savings on individual bills
- **Total US market**: $500B+ in recurring bills annually

---

## 2. Solution

### Value Proposition
**Slash** is an AI agent that:
1. **Researches** competitor pricing to build leverage
2. **Calls** your provider (via Telnyx Voice AI)
3. **Negotiates** on your behalf using proven tactics
4. **Takes only 10%** of savings (vs 40% for competitors)

### Verticals
Slash operates across 4 major recurring bill categories:

| Category | Example Providers | Savings Potential |
|----------|-------------------|-------------------|
| **Internet/Cable** | Xfinity, Spectrum, AT&T, Verizon Fios, Cox, Optimum | $20-50/month |
| **Cell Phone** | T-Mobile, Verizon, AT&T, Mint Mobile, Cricket | $15-40/month |
| **Insurance** | State Farm, Geico, Progressive, Allstate, Liberty Mutual, USAA | $30-100/month |
| **Medical Bills** | Hospitals, clinics, labs (user-entered) | 20-50% off total |

### Key Differentiators
| Feature | Slash | Trim | Billshark |
|---------|-------|------|-----------|
| Fee | 10% | 25-40% | 40% |
| AI Voice Calls | ✅ | ❌ | ❌ |
| Competitor Research | ✅ | Limited | Limited |
| Knowledge Graph | ✅ | ❌ | ❌ |
| Verticals | 4 (Internet, Cell, Insurance, Medical) | Broad | Broad |
| CC Statement Scanner | ✅ | ❌ | ❌ |

---

## 3. User Flow

### Step-by-Step Journey

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sign Up   │────▶│ Add Bills   │────▶│ Confirm     │
│   (30s)     │     │ (2 min)     │     │ Auth        │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                    ┌───────────────────│   Research  │
                    │                   │  (Automated)│
                    │                   └─────────────┘
                    │                         │
                    ▼                         ▼
              ┌─────────────┐          ┌─────────────┐
              │   Call      │◀─────────│  Strategy   │
              │ In Progress │          │   Engine    │
              └─────────────┘          └─────────────┘
                    │
                    ▼
              ┌─────────────┐          ┌─────────────┐
              │   Success   │─────────▶│  Dashboard  │
              │ (New Rate!) │          │   Updated   │
              └─────────────┘          └─────────────┘
```

### Detailed Steps

1. **Sign Up** (30 seconds)
   - Email + password
   - Phone number for auth
   - Select bill categories (Internet first)

2. **Add Bills** (2 minutes)
   - Provider name (dropdown: Comcast, Spectrum, AT&T, etc.)
   - Current plan/rate
   - Account number (for verification)
   - Optional: screenshot of bill

3. **Confirm Authorization**
   - One-click approval for Slash to call on your behalf
   - Verbal consent script provided

4. **Research Phase** (automated, background)
   - Tavily scrapes competitor rates
   - Neo4j stores leverage data
   - Strategy engine builds negotiation plan

5. **Negotiation Call** (3-8 minutes)
   - Telnyx initiates outbound call
   - AI agent negotiates with retention rep
   - Real-time status via webhook

6. **Success & Savings**
   - New rate confirmed
   - User approves final offer
   - 10% fee applied to monthly savings
   - Dashboard updated

---

## 4. MVP Scope (10-Day Hackathon)

### What We're Building

| Feature | Priority | Days |
|---------|----------|------|
| Web Dashboard (React) | P0 | 2 |
| User Auth + Bill CRUD | P0 | 2 |
| Competitor Research (Tavily) | P0 | 2 |
| Voice Agent (Telnyx + OpenAI) | P0 | 3 |
| Knowledge Graph (Neo4j) | P1 | 2 |
| Strategy Engine | P1 | 2 |
| Deployment (Render) | P1 | 1 |

### Out of Scope (v1)
- Mobile apps (web only)
- Real payment processing (manual invoicing)
- SMS notifications (email only)
- Live chat support
- Enterprise features

### Vertical Focus
**4 Verticals at Launch:**
1. **Internet/Cable** — Highest call volume for retention departments, competitor pricing readily available, strong retention incentives
2. **Cell Phone** — Similar dynamics to internet, high switching costs, competitive market
3. **Insurance (Auto/Home)** — Annual renewals, competitor quotes as leverage, bundle discounts
4. **Medical Bills** — Unique negotiation tactics (cash pay discount, payment plans, itemized bill review)

---

## 5. Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│                    dash.slash.ai (Render)                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express/TS)                       │
│                   api.slash.ai (Render)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Auth Module │  │  Bill Module │  │  Call Module │          │
│  │  (JWT)       │  │  (CRUD)      │  │  (Webhooks)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Neo4j         │  │    Tavily       │  │    Telnyx       │
│  (Knowledge    │  │  (Competitor    │  │  (Voice AI)     │
│   Graph)       │  │   Research)     │  │  (Outbound      │
│                 │  │                 │  │   Calls)        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────┐                    ┌─────────────────┐
│  OpenAI (GPT-4)│                    │  Provider       │
│  (Strategy +   │                    │  Retention      │
│   Negotiation) │                    │  Departments    │
└─────────────────┘                    └─────────────────┘
```

### Service Boundaries

| Service | Responsibility | Tech |
|---------|---------------|------|
| Frontend | Dashboard, bill management | React, Tailwind |
| Backend | Auth, business logic, API | Express, TypeScript |
| Database | User data, bills | PostgreSQL (Render) |
| Knowledge Graph | Leverage data, history | Neo4j Aura |
| Research | Competitor intel | Tavily API |
| Voice | Call orchestration | Telnyx Call Control |
| AI | Strategy, negotiation | OpenAI GPT-4 |

### Data Flow

1. **Bill Added** → Backend stores in PostgreSQL → Triggers research job
2. **Research Complete** → Tavily results → Neo4j (leverage node)
3. **Call Initiated** → Telnyx outbound → OpenAI realtime
4. **Negotiation Active** → Real-time webhook updates → Dashboard
5. **Call Complete** → Final offer stored → Success notification

---

## 6. API Design

### Core Endpoints

#### Auth
```
POST   /api/auth/register     # Create account
POST   /api/auth/login        # Get JWT
GET    /api/auth/me           # Current user
```

#### Bills
```
GET    /api/bills             # List user's bills
POST   /api/bills             # Add new bill
GET    /api/bills/:id         # Get bill details
PUT    /api/bills/:id         # Update bill
DELETE /api/bills/:id         # Remove bill
POST   /api/bills/:id/negotiate  # Start negotiation
```

#### Negotiations
```
GET    /api/negotiations      # List negotiations
GET    /api/negotiations/:id  # Get negotiation status
POST   /api/negotiations/webhook   # Telnyx webhook (internal)
```

#### Users
```
GET    /api/users/savings     # Total savings summary
GET    /api/users/stats       # Dashboard stats
```

#### CC Statement Scanner
```
POST   /api/scan              # Upload PDF, detect bills
```

### Request/Response Examples

#### Add Bill
```json
POST /api/bills
{
  "provider": "comcast",
  "accountNumber": "123456789",
  "currentRate": 89.99,
  "planName": "Xfinity Performance",
  "billDate": "2026-02-01"
}

Response: 201 Created
{
  "id": "bill_abc123",
  "provider": "comcast",
  "currentRate": 89.99,
  "status": "active",
  "createdAt": "2026-02-17T18:00:00Z"
}
```

#### Start Negotiation
```json
POST /api/bills/bill_abc123/negotiate

Response: 202 Accepted
{
  "negotiationId": "neg_xyz789",
  "status": "researching",
  "estimatedDuration": "5-10 minutes"
}
```

---

## 7. Negotiation Strategy Engine

### How It Works

The strategy engine builds a negotiation plan by:
1. **Analyzing leverage** from Neo4j (competitor rates, retention offers)
2. **Selecting tactics** based on provider, tenure, and plan type
3. **Executing escalation** if first attempt fails

### Leverage Data (Neo4j Schema)

```typescript
// Node types
Provider {
  id: string
  name: string
  retentionDepartments: string[]
}

CompetitorOffer {
  provider: string
  planType: string
  monthlyRate: number
  contractTerms: string
}

RetentionOffer {
  provider: string
  trigger: string  // "threaten_churn", "30_days_left", etc.
  typicalDiscount: number
  successRate: number
}

NegotiationHistory {
  provider: string
  tactic: string
  successRate: number
  avgSavings: number
}
```

### Core Tactics

#### Telecom Tactics (Internet/Cable/Cell Phone)

| Tactic | When Used | Script Summary |
|--------|-----------|----------------|
| **Competitor Conquest** | Competitor has lower rate | "I see X is offering Y for $Z" |
| **Loyalty Play** | Customer >2 years | "I've been loyal for X years..." |
| **Churn Threat** | High competitor offer | "I'm considering switching to..." |
| **Retention Close** | Rep offers discount | "Can you do one better?" |
| **Supervisor Request** | Rep stalls | "I'd like to speak with your supervisor" |

#### Insurance Tactics

| Tactic | When Used | Script Summary |
|--------|-----------|----------------|
| **Competitor Conquest** | Quote competitor rates | "Geico quoted me $X for the same coverage" |
| **Loyalty Play** | Long-term customer | "I've been with you for X years..." |
| **Bundle Discount** | Multiple policies | "What if I add home/renters insurance?" |
| **Churn Threat** | Better quote available | "I'm considering switching..." |

#### Medical Bill Tactics

| Tactic | When Used | Script Summary |
|--------|-----------|----------------|
| **Itemized Bill Review** | First step always | "I'd like an itemized breakdown..." |
| **Cash Pay Discount** | No insurance/underinsured | "What's the self-pay rate?" |
| **Payment Plan** | Large bill | "Can I set up interest-free payments?" |

### Escalation Path

```
Tactic 1: Competitor Offer
    │ (No movement)
    ▼
Tactic 2: Loyalty + Churn Threat
    │ (Rep checks system)
    ▼
Tactic 3: Supervisor Request
    │ (Supervisor has authority)
    ▼
Tactic 4: Final Offer Accept
    └─► Success OR No Deal (log & notify user)
```

### System Prompts (OpenAI)

**Negotiation Persona:**
> You are a professional bill negotiator representing a customer. Your goal is to reduce their monthly bill. You are polite but persistent. You know the provider's retention policies. You never lie but you use negotiation tactics. You escalate appropriately. You aim for at least 20% savings.

---

## 8. Screen Inventory

### MVP Screen List

| # | Screen | Purpose | Key Elements |
|---|--------|---------|--------------|
| 1 | **Landing** | Convert visitors | Hero, value prop, CTA |
| 2 | **Sign Up** | Registration | Email, password, phone |
| 3 | **Login** | Authentication | Email, password |
| 4 | **Dashboard** | Overview | Savings total, active bills, status cards |
| 5 | **Add Bill** | Bill entry | Category selector, provider dropdown, account #, rate input |
| 6 | **Scan Statement** | PDF scanner | Drag-drop zone, detected bills list, "Add to Slash" buttons |
| 7 | **Bill List** | Manage bills | Cards with status, actions |
| 8 | **Bill Detail** | Single bill view | Full details, negotiation history |
| 9 | **Negotiation In Progress** | Real-time status | Live call status, timer, progress |
| 10 | **Negotiation Complete** | Result | Success/fail, offer details, accept/decline |
| 11 | **Profile/Settings** | User management | Account, billing history |

### Wireframe Notes

**Dashboard (Screen 4)**
- Top: Total savings this month, all-time savings
- Main: Active negotiations (if any) with progress
- List: Your bills with status badges
- Bottom: "Add New Bill" CTA

**Bill Detail (Screen 7)**
- Header: Provider logo, plan name
- Current rate, potential savings
- History: Previous negotiations with outcomes
- Actions: "Negotiate Now" button (if not active)

**Negotiation In Progress (Screen 8)**
- Center: Animated phone/agent graphic
- Status text: "Researching competitor rates..." → "Connecting to provider..." → "Negotiating..."
- Estimated time remaining
- "Cancel" button (cancels call)

**Scan Statement (Screen 6)**
- Drag-and-drop zone for PDF upload
- Progress indicator during scanning
- List of detected bills with confidence scores
- "Add to Slash" button per detected bill
- Category and provider badges

---

## 8.5. CC Statement Scanner Feature

### Overview
The CC Statement Scanner allows users to upload a credit card statement PDF, automatically detect recurring bills that are negotiable, and add them to Slash with one click.

### How It Works
1. **Upload**: User drags & drops or selects a PDF credit card statement
2. **Parse**: Backend extracts text using pdf-parse library
3. **Detect**: Pattern matching identifies known provider names in transaction descriptions
4. **Classify**: Each detected bill is categorized (internet, cell_phone, insurance, medical)
5. **Present**: UI shows detected bills with confidence scores
6. **Add**: User clicks "Add to Slash" to create the bill

### Detection Logic
```typescript
// Provider patterns matched against transaction descriptions
const PROVIDER_PATTERNS = {
  'xfinity': { providerId: 'comcast', category: 'internet' },
  'tmobile': { providerId: 'tmobile', category: 'cell_phone' },
  'geico': { providerId: 'geico', category: 'insurance' },
  // ... etc
};

// Confidence scoring
- Direct substring match: 90% confidence
- Partial word match: 70% confidence
- Fuzzy match: 50% confidence
```

### Technical Implementation
| Component | Technology |
|-----------|------------|
| PDF Parsing | pdf-parse (npm) |
| File Upload | multer (multipart/form-data) |
| Pattern Matching | Regex + substring matching |
| API Endpoint | POST /api/scan |

### Benefits
- **Frictionless onboarding**: Users don't need to manually enter bill details
- **Bill discovery**: Users may find bills they forgot were negotiable
- **Higher conversion**: Lower barrier to adding bills = more negotiations

---

## 9. Tech Decisions

### Why This Stack

| Tool | Choice | Alternatives | Why |
|------|--------|--------------|-----|
| **Voice/Telephony** | Telnyx | Twilio, Vapi | Better AI integration + pricing |
| **Research** | Tavily | Custom scraper | Fast, reliable, no blocking |
| **Knowledge Graph** | Neo4j | PostgreSQL | Relationship queries for leverage |
| **AI/Strategy** | OpenAI | Anthropic, local | Ecosystem, realtime voice support |
| **Hosting** | Render | Vercel, Railway | Cheapest PostgreSQL + easy deploy |
| **Frontend** | React | Vue, Svelte | Team familiarity |
| **Backend** | Express | Fastify, Hono | TypeScript support, maturity |

### Cost Estimates (Monthly)

| Service | Free Tier | Paid (MVP) |
|---------|-----------|------------|
| Telnyx | $0 | ~$50 (50 calls) |
| Tavily | 1000 searches | $15 (10k searches) |
| Neo4j Aura | Free | $0 (Aura Free) |
| OpenAI | $0 | ~$30 (500 negotiation calls) |
| Render | Free | $0 (free tier) |
| **Total** | | **~$95/mo** |

---

## 10. Post-Hackathon Roadmap

### Q1 2026 (Post-Launch)

| Week | Feature | Impact |
|------|---------|--------|
| 1 | Phone verification | Trust + security |
| 2 | Email notifications | Reduce dashboard dependency |
| 3 | Mobile web优化 | Better mobile UX |
| 4 | Analytics dashboard | User engagement insights |

### Q2 2026 (Expansion)

| Month | Vertical | Notes |
|-------|----------|-------|
| April | TV/Streaming | Netflix, Hulu, cable TV |
| May | Wireless | AT&T, Verizon, T-Mobile |
| June | Insurance | Bundles with telecom |

### V2 Features

- [ ] Real payment processing (Stripe)
- [ ] SMS notifications
- [ ] Multi-language support
- [ ] iOS/Android native apps
- [ ] Browser extension
- [ ] API for partners (real estate, fintech)
- [ ] Enterprise B2B (employer-sponsored)

### Growth Targets

| Metric | Month 1 | Month 3 | Month 6 |
|--------|---------|---------|---------|
| Users | 100 | 1,000 | 10,000 |
| Negotiations | 50 | 500 | 5,000 |
| Revenue | $500 | $10K | $100K |

---

## Appendix

### Provider List (v1)

- Comcast (Xfinity)
- Spectrum
- AT&T Internet
- Verizon Fios
- Cox
- Optimum

### Success Metrics

- **Negotiation success rate**: >70%
- **Average savings**: >$20/month
- **Call completion**: >80%
- **User satisfaction**: >4.5/5

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Providers block AI calls | Rotate numbers, human-like pacing |
| OpenAI rate limits | Queue system, cache strategies |
| Neo4j costs | Use Aura Free, optimize queries |
| Legal (TCPA) | User consent, compliance docs |