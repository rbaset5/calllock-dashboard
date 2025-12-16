# CallLock V4 - Mobile Web App & Notification System

## Project Overview

**CallLock** is a Done-For-You missed call recovery service for trades businesses (HVAC, plumbing, electrical).
When a customer calls and the business misses the call, it redirects to CallLock's AI receptionist which:
- Qualifies the lead
- Captures key information
- Books appointments automatically OR alerts the business owner via SMS

**This repo** implements the mobile web app and SMS notification system per PRD v4.

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Customer Call  │ ───► │  Retell AI Voice │ ───► │ V2 Webhook Server│
└─────────────────┘      │    Receptionist  │      │   (Express)     │
                         └──────────────────┘      └────────┬────────┘
                                                           │
                    ┌──────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     V4 Dashboard (This Repo)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ ACTION Tab  │  │ BOOKED Tab  │  │   History   │  │  Settings  │ │
│  │  (Triage)   │  │ (Schedule)  │  │  (Archive)  │  │            │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   SMS Notification Layer                     │   │
│  │  URGENT | STANDARD | REMINDER | BOOKED | DIGEST             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Design Principles

1. **SMS-First Communication** - All critical interactions work via text message
2. **Zero Install Friction** - PWA, no app store download required
3. **Under 10 Seconds to Action** - Notification → callback in <10 seconds
4. **Triage, Not Management** - Show what AI couldn't complete, not full CRM
5. **Done-For-You Philosophy** - Minimal contractor effort

## Key Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** Radix UI + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **SMS:** Twilio
- **Calendar:** Cal.com API v2
- **Auth:** Supabase Auth (passwordless SMS)

## Information Architecture

### Two-State Model

| State | Description | Goal |
|-------|-------------|------|
| **ACTION** | Leads needing human attention | Get to zero cards |
| **BOOKED** | AI-confirmed appointments | Know what's coming |

### Priority Color System

| Color | Badge | Trigger |
|-------|-------|---------|
| RED | CALLBACK RISK | Customer frustrated, mentioned previous issue, demanded manager |
| GREEN | COMMERCIAL $$$ | Commercial property, multi-unit, business account, >$1000 job |
| BLUE | NEW LEAD | Standard residential, no urgency flags |
| GRAY | SPAM/VENDOR | Sales call, vendor inquiry, non-customer |

## SMS Notification Tiers

| Tier | Behavior | Quiet Hours | Example |
|------|----------|-------------|---------|
| URGENT | Immediate | Bypass | Callback risk, commercial lead |
| STANDARD | May batch (5 min) | Queue | New residential lead |
| REMINDER | Scheduled | Queue | Follow-up reminder |
| BOOKED | Confirmation | Queue | AI booking confirmation |
| DIGEST | Daily summary | Not sent | End of day recap |

## SMS Reply Commands

| Command | Action |
|---------|--------|
| `1` | Contacted/Called |
| `2` | Left voicemail |
| `3 [text]` | Add note |
| `4` or `4 TUE 2PM` | Booked/Scheduled (with optional time) |
| `5` | Lost/Not interested |
| `SNOOZE [1H\|3H\|TOMORROW]` | Snooze reminder |
| `CALL` | Get customer phone |
| `STOP` | Unsubscribe |
| `START` | Resubscribe |

## Data Models

### Lead (ACTION items)

```typescript
interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  address?: string;
  issue_description: string;
  ai_summary: string;

  // V4 Priority
  priority_color: 'red' | 'green' | 'blue' | 'gray';
  priority_reason?: string;

  // Status
  status: 'callback_requested' | 'thinking' | 'voicemail_left' |
          'abandoned' | 'sales_opportunity' | 'converted' | 'lost';

  // Outcome tracking
  callback_outcome?: 'booked' | 'resolved' | 'try_again' | 'no_answer';
  callback_outcome_at?: string;
  last_call_tapped_at?: string; // For outcome prompt detection

  // Revenue
  revenue_tier?: string;
  revenue_tier_label?: string;

  // Timing
  created_at: string;
  remind_at?: string;
}
```

### Job (BOOKED items)

```typescript
interface Job {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  service_type: string;

  // Scheduling
  scheduled_at: string;
  duration_minutes: number;
  is_ai_booked: boolean;

  // Status
  status: 'confirmed' | 'en_route' | 'on_site' | 'complete' | 'cancelled';

  // Revenue
  revenue_tier?: string;
  estimated_value?: number;
}
```

## API Routes

### Core Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/action` | Fetch ACTION items (priority ordered) |
| GET | `/api/booked` | Fetch BOOKED items (chronological) |
| GET | `/api/history` | Search archived calls |
| POST | `/api/leads/[id]/outcome` | Record callback outcome |
| POST | `/api/leads/[id]/track-call` | Track call tap for outcome prompt |
| POST | `/api/twilio/inbound` | Handle SMS replies |

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── action/page.tsx      # ACTION tab
│   │   ├── booked/page.tsx      # BOOKED tab
│   │   ├── history/page.tsx     # Archive search
│   │   └── settings/page.tsx    # Preferences
│   ├── (onboarding)/
│   │   └── onboarding/page.tsx  # 5-step wizard
│   └── api/
│       ├── action/route.ts
│       ├── booked/route.ts
│       ├── history/route.ts
│       ├── leads/[id]/outcome/route.ts
│       ├── leads/[id]/track-call/route.ts
│       └── admin/simulate-lead/route.ts
├── components/
│   ├── leads/
│   │   ├── lead-card-v4.tsx     # Priority card component
│   │   ├── outcome-prompt.tsx   # Post-callback modal
│   │   └── action-empty-state.tsx
│   └── onboarding/
│       ├── step-phone-numbers.tsx
│       ├── step-calendar.tsx
│       ├── step-business-hours.tsx
│       ├── step-call-forwarding.tsx
│       └── step-test-call.tsx
├── hooks/
│   └── use-realtime-leads.ts    # Supabase Realtime subscription
└── lib/
    ├── notification-tiers.ts    # SMS tier logic
    ├── sms-smart-logic.ts       # De-dupe, batch, escalate
    ├── sms-time-parser.ts       # Parse "TUE 2PM", "tomorrow 10am"
    ├── carrier-detection.ts     # Carrier lookup for forwarding
    ├── feature-flags.ts         # V4 rollout flags
    └── retry-queue.ts           # SMS/calendar retry logic
```

## Onboarding Flow (5 Steps)

1. **Phone Numbers** - Business line + Cell for SMS alerts
2. **Calendar Connection** - Cal.com OAuth
3. **Business Hours** - Weekly schedule setup
4. **Call Forwarding** - Carrier-specific setup instructions:
   - AT&T: `*61*[CallLock#]#`
   - Verizon: `*71[CallLock#]`
   - T-Mobile: `*61*[CallLock#]#`
   - VoIP: Manual portal configuration
5. **Test Call** - Verify AI receptionist works end-to-end

## Outcome Prompt Flow

Database-driven approach (not client-side sessionStorage):

1. User taps "Call" on lead card
2. API updates `lead.last_call_tapped_at = NOW()`
3. Native dialer opens
4. When user returns to ACTION page, check for leads with `last_call_tapped_at` within 30 min
5. Show outcome prompt modal for that lead
6. Options: **Book** → Slot picker | **Resolved** → Archive | **Try Again** → Snooze
7. Clear `last_call_tapped_at` after outcome recorded

## Real-Time Updates

Using Supabase Realtime (WebSocket):

```typescript
const channel = supabase
  .channel('leads-realtime')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'leads',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    addLeadToQueue(payload.new);
    showNewLeadToast(payload.new);
  })
  .subscribe();
```

**Latency Target:** < 2 seconds from webhook receipt to UI update
**Fallback:** Polling every 30 seconds if Realtime fails

## Priority Detection Logic

Located in V2 backend (`V2/src/services/priority-detection.ts`):

```typescript
// RED: Callback Risk
const redKeywords = ['angry', 'frustrated', 'manager', 'supervisor', 'refund',
  'complaint', 'lawsuit', 'again', 'third time', 'still broken'];

// GREEN: Commercial
const greenKeywords = ['property management', 'commercial', 'business',
  'office', 'retail', 'warehouse', 'multiple units'];

// GRAY: Spam/Vendor
const grayKeywords = ['selling', 'vendor', 'sales', 'marketing', 'offer',
  'insurance', 'warranty', 'duct cleaning'];

// BLUE: Default for valid residential
```

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run database migrations
npx supabase db push

# Type generation
npx supabase gen types typescript --local > src/types/database.ts

# Seed test data
npm run seed:test-leads

# Simulate webhook (for testing)
npm run simulate:webhook
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cal.com
CAL_COM_API_KEY=
CAL_COM_EVENT_TYPE_ID=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_ENV=staging|production
WEBHOOK_SECRET=
```

## Error Handling

### SMS Delivery Failure
- Retry 3x with exponential backoff (1s, 5s, 30s)
- Log to `sms_failures` table
- Cron job retries every 5 min
- After 3 cron attempts: Mark failed, alert admin

### Calendar Sync Failure
- Store booking locally first (optimistic)
- Retry Cal.com API with backoff
- Mark job as "pending_sync" if fails
- Manual "Retry Sync" button in UI

### Webhook Failure
- Dashboard polls V2 health every 5 min
- Alert if no webhooks in 1 hour during business hours
- Fallback: Dashboard can pull via API

## Migration Path

**Feature Flag Rollout:**
1. New routes (`/action`, `/booked`) alongside old routes
2. `v4_ui_enabled` flag per user (default: false)
3. Gradual rollout: 5 beta → 20% → 50% → 100%
4. Old routes redirect after 100% rollout

**Backfill Priority Colors:**
```sql
UPDATE public.leads
SET priority_color = CASE
  WHEN status = 'abandoned' THEN 'red'
  WHEN revenue_tier IN ('$$$$', '$$$') THEN 'green'
  WHEN status = 'spam' THEN 'gray'
  ELSE 'blue'
END
WHERE priority_color IS NULL;
```

## Success Metrics

| Metric | Target |
|--------|--------|
| Lead response rate | >70% within 1 hour |
| Lead-to-book conversion | >40% |
| AI book rate | >30% |
| Week 1 retention | >95% |
| Time to action | <10 seconds |
