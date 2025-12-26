# CallLock Dashboard API Reference

## Overview

This document provides complete API documentation for the CallLock Dashboard endpoints.

---

## Authentication

### User Authentication
- All non-webhook endpoints require Supabase Auth user session
- User identity extracted from request cookies
- Authorization ensures users can only access their own data

### Webhook Authentication
- All `/api/webhook/*` endpoints require `X-Webhook-Secret` header
- Secret must match `WEBHOOK_SECRET` environment variable
- Validated via `validateWebhookAuth()` middleware

---

## Webhook Endpoints

These endpoints receive data from the V2 backend after voice calls.

### POST `/api/webhook/jobs`

Sync leads/jobs from Retell AI voice agent after calls end.

**Headers:**
```
X-Webhook-Secret: <WEBHOOK_SECRET>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  // Required
  customer_name: string,      // Min 1 char
  customer_phone: string,     // Min 1 char
  customer_address: string,   // Min 1 char
  service_type: 'hvac' | 'plumbing' | 'electrical' | 'general',
  urgency: 'low' | 'medium' | 'high' | 'emergency',
  user_email: string,         // Email format

  // Optional
  ai_summary?: string,
  scheduled_at?: string,      // ISO datetime - if present, creates Job
  call_transcript?: string,
  call_id?: string,           // For deduplication

  // Auto-extracted from issue_description if not provided:
  equipment_type?: string,    // "AC Unit", "Furnace", "Heat Pump", etc.
  equipment_age?: string,     // "5 years old", "installed 2019", etc.

  // Revenue
  estimated_value?: number,
  revenue_tier?: 'replacement' | 'major_repair' | 'standard_repair' | 'minor' | 'diagnostic',
  revenue_tier_label?: '$$$$' | '$$$' | '$$' | '$' | '$$?',

  // Call outcome
  end_call_reason?: 'wrong_number' | 'callback_later' | 'safety_emergency' |
                    'urgent_escalation' | 'out_of_area' | 'waitlist_added' |
                    'completed' | 'customer_hangup' | 'sales_lead' | 'cancelled',

  // V3 Triage
  caller_type?: 'residential' | 'commercial' | 'vendor' | 'recruiting' | 'unknown',
  status_color?: 'red' | 'green' | 'blue' | 'gray'
}
```

**Response:**
```json
{
  "success": true,
  "lead_id": "uuid",        // or "job_id" if booking
  "type": "lead",           // or "job"
  "action": "created",      // or "updated" (dedup)
  "status": "callback_requested"
}
```

**Logic:**
- If `scheduled_at` present → creates **Job**
- If `scheduled_at` absent → creates **Lead** (based on end_call_reason)
- Deduplicates by `call_id` (checks `original_call_id` column)

---

### POST `/api/webhook/calls`

Sync call records with transcripts.

**Headers:**
```
X-Webhook-Secret: <WEBHOOK_SECRET>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  // Required
  call_id: string,
  phone_number: string,
  user_email: string,
  started_at: string,         // ISO datetime

  // Optional
  customer_name?: string,
  ended_at?: string,
  duration_seconds?: number,
  direction?: 'inbound' | 'outbound',
  outcome?: string,
  transcript_object?: Array<{ role: 'agent' | 'user', content: string }>,
  job_id?: string,
  lead_id?: string
}
```

**Response:**
```json
{
  "success": true,
  "call_id": "uuid",
  "action": "created"
}
```

---

### POST `/api/webhook/emergency-alerts`

Sync urgent Tier 2 alerts.

**Request Body:**
```typescript
{
  // Required
  phone_number: string,
  problem_description: string,
  user_email: string,
  sms_sent_at: string,              // ISO datetime
  callback_promised_minutes: number, // Positive integer

  // Optional
  alert_id?: string,
  call_id?: string,
  customer_name?: string,
  customer_address?: string
}
```

**Response:**
```json
{
  "success": true,
  "alert_id": "uuid",
  "action": "created"
}
```

---

### PATCH `/api/webhook/emergency-alerts`

Update emergency alert status.

**Request Body:**
```typescript
{
  alert_id?: string,           // Either alert_id or backend_alert_id required
  backend_alert_id?: string,
  callback_status?: string,
  callback_delivered_at?: string,
  resolved_at?: string,
  resolution_notes?: string
}
```

---

### POST `/api/webhook/operator-notes`

Sync operator notes from SMS or backend.

**Request Body:**
```typescript
{
  // Required
  customer_phone: string,
  note_text: string,
  user_email: string,

  // Optional
  customer_name?: string,
  expires_at?: string,
  job_id?: string,
  lead_id?: string
}
```

---

## Core Business Endpoints

### GET `/api/action`

Fetch leads needing human attention (ACTION tab).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `priority_color` | string | Filter: 'red', 'green', 'blue', 'gray' |
| `include_snoozed` | boolean | Include leads with future `remind_at` |

**Response:**
```json
{
  "leads": [
    {
      "id": "uuid",
      "customer_name": "John Smith",
      "customer_phone": "+15551234567",
      "customer_address": "123 Main St",
      "issue_description": "AC not cooling",
      "ai_summary": "Customer reports AC blowing warm air...",
      "priority_color": "red",
      "status": "callback_requested",
      "created_at": "2024-12-20T10:00:00Z",
      "notes": []
    }
  ],
  "counts": {
    "total": 5,
    "red": 1,
    "green": 2,
    "blue": 2,
    "gray": 0
  },
  "bookedCount": 3,
  "pendingOutcome": null
}
```

---

### GET `/api/booked`

Fetch confirmed appointments (BOOKED tab).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `days` | number | Days ahead to fetch (default: 14) |
| `include_past` | boolean | Include past times from today |

**Response:**
```json
{
  "groups": [
    {
      "label": "Today",
      "date": "2024-12-20",
      "jobs": [
        {
          "id": "uuid",
          "customer_name": "Jane Doe",
          "scheduled_at": "2024-12-20T14:00:00Z",
          "service_type": "hvac",
          "status": "confirmed",
          "is_ai_booked": true
        }
      ]
    }
  ],
  "counts": {
    "total": 10,
    "today": 2,
    "tomorrow": 3,
    "thisWeek": 7,
    "aiBooked": 4
  }
}
```

---

### GET `/api/leads`

Fetch all active leads.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `priority` | string | Filter: 'hot', 'warm', 'cold' |

---

### GET `/api/leads/[id]`

Fetch single lead details.

---

### PATCH `/api/leads/[id]`

Update lead status or snooze.

**Request Body:**
```typescript
{
  status?: string,
  priority?: string,
  remind_at?: string,    // Snooze until this time
  lost_reason?: string
}
```

---

### POST `/api/leads/[id]/track-call`

Record when user taps "Call" button.

**Response:**
```json
{
  "success": true,
  "lead_id": "uuid",
  "tracked_at": "2024-12-20T10:00:00Z"
}
```

---

### POST `/api/leads/[id]/outcome`

Record callback outcome.

**Request Body:**
```typescript
{
  outcome: 'booked' | 'resolved' | 'try_again' | 'no_answer',
  note?: string,
  snooze_until?: string
}
```

**Response:**
```json
{
  "success": true,
  "message": "Outcome recorded: booked",
  "lead": { /* Updated lead */ },
  "next_action": "Proceed to booking flow"
}
```

---

### GET `/api/jobs`

Fetch jobs with optional filtering.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `needs_action` | boolean | Jobs with conflicts |

---

### POST `/api/jobs`

Manually create a job.

**Request Body:**
```typescript
{
  customer_name: string,      // Min 2 chars
  customer_phone: string,     // Min 10 chars
  customer_address: string,   // Min 5 chars
  service_type: string,
  urgency: string,
  scheduled_at: string,       // Must be future
  notes?: string,
  estimated_value?: number
}
```

---

### GET `/api/jobs/[id]`

Fetch single job details.

---

### PATCH `/api/jobs/[id]`

Update job (only for 'new' status).

---

### GET `/api/calls`

Fetch call history.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `phone` | string | Filter by phone |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset |

---

### GET `/api/history`

Fetch archived records (completed/cancelled jobs, converted/lost leads).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search name, phone, address |
| `filter` | string | 'all', 'booked', 'completed', 'lost', 'cancelled' |
| `startDate` | string | ISO datetime |
| `endDate` | string | ISO datetime |
| `limit` | number | Max 100 |
| `offset` | number | Pagination |

---

## Retell Integration

### POST `/api/retell/book-service`

Retell custom function tool - check availability and book.

**Request Body:**
```typescript
{
  call: {
    call_id: string,
    agent_id: string
  },
  args: {
    customer_name: string,
    customer_phone: string,
    service_address?: string,
    preferred_time: string,      // "Monday 9am", "tomorrow morning"
    issue_description: string
  }
}
```

**Response:**
```json
{
  "success": true,
  "booked": true,
  "appointment_date": "Monday, December 23",
  "appointment_time": "9:00 AM",
  "message": "You're all set for Monday, December 23 at 9:00 AM..."
}
```

**Time Parsing:**
- Day: "Monday", "Tuesday", etc.
- Relative: "tomorrow", "next week"
- Time: "morning" (6am-12pm), "afternoon" (12pm-6pm), "9am"
- Quick: "soonest", "earliest", "asap"

---

### GET `/api/retell/book-service`

Health check.

**Response:**
```json
{
  "status": "ok",
  "endpoint": "retell-book-service"
}
```

---

## SMS Endpoints

### POST `/api/twilio/inbound`

Handle SMS replies from business owner.

**Commands:**
| Command | Action |
|---------|--------|
| `1` | Mark as contacted |
| `2` | Left voicemail |
| `3 [text]` | Add note |
| `4` or `4 TUE 2PM` | Booked |
| `5` | Lost/not interested |
| `SNOOZE [1H\|3H\|TOMORROW]` | Snooze |
| `CALL` | Get customer phone |
| `STOP` | Unsubscribe |
| `START` | Resubscribe |

---

## Summary Table

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/webhook/jobs` | POST | Secret | Sync leads/jobs |
| `/api/webhook/calls` | POST | Secret | Sync call records |
| `/api/webhook/emergency-alerts` | POST/PATCH | Secret | Sync alerts |
| `/api/webhook/operator-notes` | POST | Secret | Sync notes |
| `/api/action` | GET | User | ACTION tab data |
| `/api/booked` | GET | User | BOOKED tab data |
| `/api/leads` | GET | User | All leads |
| `/api/leads/[id]` | GET/PATCH | User | Single lead |
| `/api/leads/[id]/track-call` | POST | User | Track call tap |
| `/api/leads/[id]/outcome` | POST | User | Record outcome |
| `/api/jobs` | GET/POST | User | Jobs list/create |
| `/api/jobs/[id]` | GET/PATCH | User | Single job |
| `/api/calls` | GET | User | Call history |
| `/api/history` | GET | User | Archive search |
| `/api/retell/book-service` | GET/POST | None | AI booking tool |
| `/api/twilio/inbound` | POST | Twilio | SMS commands |

---

## Error Responses

All endpoints return errors in consistent format:

```json
{
  "error": "Error message",
  "status": 400
}
```

Common status codes:
- `400` - Bad request (validation failed)
- `401` - Unauthorized (missing/invalid auth)
- `404` - Not found
- `500` - Internal server error
