# CallLock Dashboard Architecture

## Overview

CallLock is a Done-For-You missed call recovery service for trades businesses. This dashboard receives data from voice AI calls and provides a mobile-first interface for business owners to manage leads and appointments.

---

## System Diagram

```

  Customer Call       Retell AI Voice       V2 Backend
  (Missed Call)         Receptionist         (Render)
        |                    |                   |
        v                    v                   v
  +----------+         +-----------+       +------------+
  | Business |  ---->  | AI Agent  | ----> | Webhook    |
  | Phone    |         | Qualifies |       | Server     |
  +----------+         | & Books   |       +------------+
                       +-----------+             |
                                                 |
                    +----------------------------+
                    |
                    v
  +-------------------------------------------------------+
  |              Dashboard (This Repo)                    |
  |                                                       |
  |  +-------------+  +-------------+  +-------------+    |
  |  | ACTION Tab  |  | BOOKED Tab  |  |  Settings   |    |
  |  | (Leads)     |  | (Jobs)      |  |             |    |
  |  +-------------+  +-------------+  +-------------+    |
  |                                                       |
  |  +-----------------------------------------------+    |
  |  |           SMS Notification Layer              |    |
  |  | URGENT | STANDARD | REMINDER | BOOKED | DIGEST|    |
  |  +-----------------------------------------------+    |
  +-------------------------------------------------------+
```

---

## Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login, signup, password reset
│   ├── (dashboard)/              # Protected pages
│   │   ├── action/               # ACTION tab (leads)
│   │   ├── booked/               # BOOKED tab (jobs)
│   │   ├── calls/                # Call history
│   │   ├── customers/            # Customer database
│   │   ├── jobs/                 # Job management
│   │   ├── leads/                # Lead details
│   │   ├── history/              # Archive search
│   │   ├── schedule/             # Calendar view
│   │   ├── settings/             # Preferences
│   │   └── today/                # Today's items
│   ├── (onboarding)/             # Setup wizard
│   └── api/                      # API routes
│       ├── webhook/              # Incoming webhooks (V2 backend)
│       ├── action/               # ACTION tab data
│       ├── booked/               # BOOKED tab data
│       ├── leads/                # Lead operations
│       ├── jobs/                 # Job operations
│       ├── retell/               # Retell AI integration
│       └── twilio/               # SMS handling
│
├── components/
│   ├── leads/                    # Lead cards, modals
│   ├── jobs/                     # Job cards, modals
│   ├── scheduling/               # Shared calendar components
│   ├── settings/                 # Settings sections
│   ├── ui/                       # Shadcn/Radix components
│   └── layout/                   # Navigation, shells
│
├── lib/
│   ├── supabase/                 # Database clients
│   ├── schemas/                  # Zod validation schemas
│   ├── sms-commands/             # SMS reply handlers
│   ├── scheduling/               # Calendar utilities
│   ├── middleware/               # Auth middleware
│   └── *.ts                      # Utilities
│
├── hooks/                        # React hooks
│   ├── use-realtime-leads.ts     # Supabase Realtime
│   ├── use-calendar-slots.ts     # Cal.com availability
│   └── use-*.ts                  # Other hooks
│
└── types/
    └── database.ts               # Supabase types
```

---

## Data Flow

### Webhook to UI (Real-Time)

```
1. Customer calls business phone
   ↓
2. Call forwards to Retell AI agent
   ↓
3. Agent qualifies lead, attempts booking
   ↓
4. Call ends → V2 backend receives call-ended webhook
   ↓
5. V2 backend analyzes transcript (priority, revenue)
   ↓
6. V2 backend POSTs to /api/webhook/jobs
   ↓
7. Dashboard validates webhook secret
   ↓
8. Dashboard finds user by email
   ↓
9. Dashboard deduplicates by call_id
   ↓
10. Dashboard creates Lead or Job:
    - scheduled_at present → Job (BOOKED)
    - scheduled_at absent → Lead (ACTION)
   ↓
11. Supabase Realtime broadcasts change
   ↓
12. Browser receives WebSocket update (<2 seconds)
   ↓
13. UI updates with new card + toast notification
```

### Lead vs Job Determination

```typescript
// end_call_reason mapping
customer_hangup    → Lead (status: 'abandoned', RED)
callback_later     → Lead (status: 'callback_requested')
sales_lead         → Lead (status: 'sales_opportunity', RED)
out_of_area        → Lead (status: 'lost')
wrong_number       → No record created
completed          → Job (if scheduled_at)
waitlist_added     → Lead (status: 'deferred')
```

### Deduplication Strategy

```typescript
// Check before insert
if (body.call_id) {
  const existing = await supabase
    .from('leads')
    .select('id')
    .eq('original_call_id', body.call_id)
    .single();

  if (existing) {
    // UPDATE instead of INSERT
    return { action: 'updated' };
  }
}
```

---

## Database Schema

### Core Tables

**leads** - ACTION items needing callback
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users
customer_name, customer_phone, customer_address TEXT
status TEXT  -- callback_requested, thinking, voicemail_left, etc.
priority_color TEXT  -- red, green, blue, gray
callback_outcome TEXT  -- booked, resolved, try_again, no_answer
last_call_tapped_at TIMESTAMPTZ  -- For outcome prompt
original_call_id TEXT  -- Dedup key
remind_at TIMESTAMPTZ  -- Snooze until
created_at TIMESTAMPTZ
```

**jobs** - BOOKED appointments
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users
customer_name, customer_phone, customer_address TEXT
service_type TEXT  -- hvac, plumbing, electrical, general
status TEXT  -- new, confirmed, en_route, on_site, complete, cancelled
scheduled_at TIMESTAMPTZ
is_ai_booked BOOLEAN
original_call_id TEXT  -- Dedup key
created_at TIMESTAMPTZ
```

**calls** - Call history with transcripts
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users
backend_call_id TEXT  -- Links to Retell
duration_seconds INT
transcript_object JSONB  -- [{role, content}]
created_at TIMESTAMPTZ
```

**customers** - Customer database
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users
name, phone, email, address TEXT
equipment JSONB[]  -- [{type, brand, model}]
lifetime_value DECIMAL
total_jobs INT
```

### Key Indexes
```sql
idx_leads_action_view (user_id, priority_color, status)
idx_leads_pending_outcome (user_id, last_call_tapped_at)
idx_jobs_scheduled (user_id, scheduled_at, status)
```

---

## External Integrations

### Supabase (Database + Auth + Realtime)

**Purpose:** PostgreSQL database, authentication, real-time subscriptions

**Clients:**
```typescript
// Browser (user-scoped, uses RLS)
import { createClient } from '@/lib/supabase/client';

// Server API routes (bypasses RLS)
import { createAdminClient } from '@/lib/supabase/admin';
```

**Realtime:**
```typescript
const channel = supabase
  .channel('leads-realtime')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'leads',
    filter: `user_id=eq.${userId}`
  }, payload => {
    // Update UI immediately
  })
  .subscribe();
```

### Cal.com (Calendar Integration)

**Purpose:** Check availability, create bookings

**Endpoint:** `/api/retell/book-service`

**Flow:**
1. Parse natural language time ("Monday 9am")
2. Fetch available slots from Cal.com API
3. Book slot if available
4. Create job in Supabase

**Environment:**
```env
CAL_COM_API_KEY=cal_live_...
CAL_COM_EVENT_TYPE_ID=3877847
```

### Twilio (SMS)

**Purpose:** Send notifications, receive SMS replies

**Outbound:** `/api/sms/send`
**Inbound:** `/api/twilio/inbound`

**Notification Tiers:**
| Tier | Behavior | Quiet Hours |
|------|----------|-------------|
| URGENT | Immediate | Bypass |
| STANDARD | May batch 5 min | Respects |
| REMINDER | Scheduled | Respects |
| BOOKED | Immediate | Respects |
| DIGEST | Daily summary | N/A |

### Retell AI (Voice Agent)

**Purpose:** Voice AI that qualifies leads and books appointments

**Integration Points:**
- `/api/retell/book-service` - Custom function tool
- V2 backend receives call-ended webhook
- V2 backend posts to dashboard webhooks

---

## Key Components

### LeadCardV4

**File:** `src/components/leads/lead-card-v4.tsx`

Priority-colored lead card with actions.

```typescript
interface LeadCardV4Props {
  lead: LeadWithNotes;
  onCall?: () => void;
  onBook?: () => void;
  onArchive?: () => void;
  hidePriorityBadge?: boolean;
}
```

**Priority Colors:**
| Color | Badge | Trigger |
|-------|-------|---------|
| RED | CALLBACK RISK | Frustrated, previous issues, demanded manager |
| GREEN | COMMERCIAL $$$ | Business, multi-unit, >$1000 job |
| BLUE | NEW LEAD | Standard residential |
| GRAY | SPAM | Sales, vendor, non-customer |

### Outcome Prompt

**File:** `src/components/leads/outcome-prompt.tsx`

Modal shown after user calls a lead.

**Flow:**
1. User taps "Call" → sets `last_call_tapped_at`
2. Native dialer opens
3. User returns to ACTION page
4. Check for leads with recent `last_call_tapped_at`
5. Show modal: Booked / Resolved / Try Again

### Realtime Hook

**File:** `src/hooks/use-realtime-leads.ts`

Live updates via Supabase Realtime with polling fallback.

```typescript
const { leads, counts, loading, realtimeConnected } = useRealtimeLeads({
  priorityColor: 'red',
  onNewLead: (lead) => showToast(lead),
});
```

**Latency:** <2 seconds from webhook to UI
**Fallback:** Poll every 30s if WebSocket fails

---

## Design Patterns

### Idempotent Webhooks
- Check `original_call_id` before insert
- If exists → UPDATE instead of INSERT
- V2 backend can safely retry failed calls

### SMS Command Pattern
- Commands registered in `src/lib/sms-commands/registry.ts`
- Each command is a handler with `match()` and `execute()`
- Route handler is ~91 lines (was 1,065)

### Component Extraction
- Settings page split into 5 section components
- Scheduling modals share DatePicker, TimeSlotGrid, CustomerSummary
- Each component has clear props interface

### Memoization
- `LeadCardV4` wrapped in `React.memo` with custom comparator
- `AgendaJobCard` wrapped in `React.memo`
- Prevents unnecessary re-renders on list updates

---

## Environment Variables

**Required:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
WEBHOOK_SECRET=<32-byte hex>
```

**Optional:**
```env
CAL_COM_API_KEY=cal_live_...
CAL_COM_EVENT_TYPE_ID=3877847
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
RETELL_API_KEY=key_...
```

---

## Development

### Local Setup
```bash
npm install
npm run dev  # http://localhost:3000
```

### Database
```bash
# Apply migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/types/database.ts
```

### Testing
```bash
npm run test        # Watch mode
npm run test:run    # Single run
```

### Seed Data
```bash
npm run seed:demo           # Sample data
npm run seed:clear          # Wipe test data
```

---

## File Reference

| Concept | Key Files |
|---------|-----------|
| Webhook Handler | `src/app/api/webhook/jobs/route.ts` |
| ACTION Tab | `src/app/(dashboard)/action/page.tsx` |
| BOOKED Tab | `src/app/(dashboard)/booked/page.tsx` |
| Lead Card | `src/components/leads/lead-card-v4.tsx` |
| Realtime | `src/hooks/use-realtime-leads.ts` |
| Outcome Prompt | `src/components/leads/outcome-prompt.tsx` |
| Cal.com Booking | `src/app/api/retell/book-service/route.ts` |
| SMS Commands | `src/lib/sms-commands/` |
| Schemas | `src/lib/schemas/webhook-schemas.ts` |
| Text Extraction | `src/lib/extract-signals.ts` |
| Database Types | `src/types/database.ts` |
