# HVAC Smart Tag Taxonomy Integration - Testing Guide

## Prerequisites

1. **V2 Backend** must be updated to send `tags` field
2. **Database migration** must be applied: `supabase/migrations/0023_hvac_smart_tag_taxonomy.sql`
3. **Dashboard** must be deployed with taxonomy support

## Manual Testing Steps

### 1. Apply Database Migration

```bash
cd calllock-dashboard
supabase db push
```

Or run SQL manually in Supabase Dashboard:

```sql
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT NULL;

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_tags_gin
ON public.leads USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_jobs_tags_gin
ON public.jobs USING GIN (tags);
```

### 2. Test Webhook Without Tags (Fallback)

Verify dashboard still works with existing behavior:

```bash
curl -X POST https://calllock-dashboard-2.vercel.app/api/webhook/jobs \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "call_id": "test_no_tags_001",
    "customer_name": "Fallback Test",
    "customer_phone": "555-111-2222",
    "customer_address": "123 Fallback St",
    "service_type": "hvac",
    "urgency": "high",
    "end_call_reason": "callback_later",
    "ai_summary": "AC not cooling - system running but warm air coming out",
    "user_email": "your-email@example.com",
    "sentiment_score": 3,
    "work_type": "service"
  }'
```

**Expected Result:**
- ✓ Success response with `lead_id`
- ✓ Lead appears in dashboard ACTION tab
- ✓ Tags generated from transcript analysis (fallback behavior)

### 3. Test HAZARD Classification

```bash
curl -X POST https://calllock-dashboard-2.vercel.app/api/webhook/jobs \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "call_id": "test_hazard_001",
    "customer_name": "Gas Leak Customer",
    "customer_phone": "555-222-3333",
    "customer_address": "456 Hazard Ave, Dallas, TX",
    "service_type": "hvac",
    "urgency": "emergency",
    "end_call_reason": "callback_later",
    "ai_summary": "Customer reports rotten egg smell from furnace - gas leak suspected",
    "user_email": "your-email@example.com",
    "sentiment_score": 1,
    "work_type": "service",
    "tags": {
      "HAZARD": ["GAS_LEAK", "OCCUPIED_HOME"],
      "URGENCY": ["CRITICAL_EVACUATE"],
      "SERVICE_TYPE": ["REPAIR_HEATING"],
      "REVENUE": [],
      "RECOVERY": [],
      "LOGISTICS": [],
      "CUSTOMER": ["EXISTING_CUSTOMER", "OWNER_OCCUPIED"],
      "NON_CUSTOMER": [],
      "CONTEXT": ["PEAK_WINTER", "ELDERLY_OCCUPANT"]
    }
  }'
```

**Expected Result:**
- ✓ Success response with `lead_id`
- ✓ Lead appears at TOP of ACTION queue (HAZARD priority)
- ✓ Card shows "Gas Leak" tag (red, AlertTriangle icon)
- ✓ Archetype displayed as "HAZARD"
- ✓ Card styling: Red background, pulsing animation

### 4. Test REVENUE Classification

```bash
curl -X POST https://calllock-dashboard-2.vercel.app/api/webhook/jobs \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "call_id": "test_revenue_001",
    "customer_name": "Commercial Office",
    "customer_phone": "555-333-4444",
    "customer_address": "789 Business Blvd, Suite 100",
    "service_type": "hvac",
    "urgency": "high",
    "end_call_reason": "callback_later",
    "ai_summary": "Commercial building needs new rooftop unit - old system died, considering replacement",
    "user_email": "your-email@example.com",
    "sentiment_score": 4,
    "work_type": "install",
    "tags": {
      "HAZARD": [],
      "URGENCY": ["EMERGENCY_SAMEDAY"],
      "SERVICE_TYPE": ["INSTALL_REPLACEMENT"],
      "REVENUE": ["COMMERCIAL_LEAD", "REPLACE_OPP", "HOT_LEAD"],
      "RECOVERY": [],
      "LOGISTICS": ["LANDLORD_AUTH", "NTE_LIMIT"],
      "CUSTOMER": ["COMMERCIAL_ACCT", "PROPERTY_MANAGER"],
      "NON_CUSTOMER": [],
      "CONTEXT": []
    }
  }'
```

**Expected Result:**
- ✓ Success response with `lead_id`
- ✓ Lead appears high in ACTION queue (REVENUE priority)
- ✓ Card shows "Commercial $$$" tag (green, Building2 icon)
- ✓ Card shows "Replacement" tag (amber)
- ✓ Archetype displayed as "REVENUE"
- ✓ Card styling: Amber/gold background, dollar sign icon

### 5. Test RECOVERY Classification

```bash
curl -X POST https://calllock-dashboard-2.vercel.app/api/webhook/jobs \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "call_id": "test_recovery_001",
    "customer_name": "Angry Customer",
    "customer_phone": "555-444-5555",
    "customer_address": "321 Angry Ln",
    "service_type": "hvac",
    "urgency": "medium",
    "end_call_reason": "callback_later",
    "ai_summary": "Customer furious - tech was here yesterday and system still broken. Demands to speak to manager",
    "user_email": "your-email@example.com",
    "sentiment_score": 1,
    "work_type": "service",
    "tags": {
      "HAZARD": [],
      "URGENCY": ["URGENT_24HR"],
      "SERVICE_TYPE": ["REPAIR_AC"],
      "REVENUE": [],
      "RECOVERY": ["CALLBACK_RISK", "REPEAT_ISSUE", "COMPLAINT_TECH", "ESCALATION_REQ"],
      "LOGISTICS": [],
      "CUSTOMER": ["EXISTING_CUSTOMER", "OWNER_OCCUPIED"],
      "NON_CUSTOMER": [],
      "CONTEXT": []
    }
  }'
```

**Expected Result:**
- ✓ Success response with `lead_id`
- ✓ Lead appears high in ACTION queue (RECOVERY priority)
- ✓ Card shows "Callback Risk" tag (red, AlertCircle icon)
- ✓ Card shows "Repeat Issue" tag (amber)
- ✓ Archetype displayed as "RECOVERY"
- ✓ Card styling: Dark slate background, phone callback icon

### 6. Test LOGISTICS Classification

```bash
curl -X POST https://calllock-dashboard-2.vercel.app/api/webhook/jobs \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "call_id": "test_logistics_001",
    "customer_name": "Regular Customer",
    "customer_phone": "555-555-6666",
    "customer_address": "654 Normal St, Apt 4B",
    "service_type": "hvac",
    "urgency": "medium",
    "end_call_reason": "callback_later",
    "ai_summary": "Need AC tune-up before summer. Gate code is 1234. Have dogs that need to be secured.",
    "user_email": "your-email@example.com",
    "sentiment_score": 4,
    "work_type": "maintenance",
    "tags": {
      "HAZARD": [],
      "URGENCY": ["STANDARD"],
      "SERVICE_TYPE": ["TUNEUP_AC"],
      "REVENUE": [],
      "RECOVERY": [],
      "LOGISTICS": ["GATE_CODE", "PET_SECURE", "ALARM_CODE"],
      "CUSTOMER": ["EXISTING_CUSTOMER", "OWNER_OCCUPIED"],
      "NON_CUSTOMER": [],
      "CONTEXT": ["SHOULDER", "FIRST_EXTREME_DAY"]
    }
  }'
```

**Expected Result:**
- ✓ Success response with `lead_id`
- ✓ Lead appears in ACTION queue (LOGISTICS priority)
- ✓ Card shows "Gate Code" tag (blue, Key icon)
- ✓ Card shows "Pet" tag (amber, Dog icon)
- ✓ Archetype displayed as "LOGISTICS"
- ✓ Card styling: Blue/gray background, clipboard icon

### 7. Test Deduplication

Send same webhook twice to verify deduplication works:

```bash
# First call - should create
curl -X POST https://calllock-dashboard-2.vercel.app/api/webhook/jobs \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "call_id": "test_dedup_001",
    "customer_name": "Dedup Test",
    "customer_phone": "555-777-8888",
    "customer_address": "987 Dedup Way",
    "service_type": "hvac",
    "urgency": "medium",
    "end_call_reason": "callback_later",
    "ai_summary": "Test deduplication",
    "user_email": "your-email@example.com",
    "tags": { "HAZARD": [], "SERVICE_TYPE": ["REPAIR_AC"] }
  }'
# Response: { "success": true, "lead_id": "...", "action": "created" }

# Second call - should update
curl -X POST https://calllock-dashboard-2.vercel.app/api/webhook/jobs \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "call_id": "test_dedup_001",
    "customer_name": "Dedup Test Updated",
    "customer_phone": "555-777-8888",
    "customer_address": "987 Dedup Way",
    "service_type": "hvac",
    "urgency": "high",
    "end_call_reason": "callback_later",
    "ai_summary": "Test deduplication - updated info",
    "user_email": "your-email@example.com",
    "tags": { "HAZARD": [], "SERVICE_TYPE": ["REPAIR_AC"], "RECOVERY": ["CALLBACK_RISK"] }
  }'
# Response: { "success": true, "lead_id": "...", "action": "updated" }
```

**Expected Result:**
- ✓ First call returns `action: "created"`
- ✓ Second call returns `action: "updated"`
- ✓ Only one lead exists in database
- ✓ Lead has updated info (high urgency, RECOVERY tag)

## Dashboard UI Verification

For each test case, verify in the dashboard:

### ACTION Tab

1. Open dashboard → ACTION tab
2. Find the test lead by phone number
3. Verify:
   - [ ] Archetype badge displays correctly
   - [ ] Priority color matches classification
   - [ ] Tags displayed (up to 4)
   - [ ] Tag variants (red/amber/green/blue) correct
   - [ ] Icons display for high-priority tags

### Lead Card Expansion

1. Tap on the lead card
2. Verify details:
   - [ ] AI summary shows
   - [ ] Address displays
   - [ ] All taxonomy tags stored (view in network tab)
   - [ ] Velocity score calculated correctly

### Database Verification

Query Supabase to verify tags stored:

```sql
SELECT
  id,
  customer_name,
  tags,
  priority_color,
  sentiment_score,
  work_type
FROM public.leads
WHERE customer_phone LIKE '555-%'
ORDER BY created_at DESC
LIMIT 10;
```

Expected output should show `tags` JSONB column with taxonomy data.

## Rollback Testing

Test fallback behavior by sending webhook with empty tags:

```bash
curl -X POST https://calllock-dashboard-2.vercel.app/api/webhook/jobs \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: YOUR_WEBHOOK_SECRET" \
  -d '{
    "call_id": "test_empty_tags_001",
    "customer_name": "Fallback Customer",
    "customer_phone": "555-999-0000",
    "customer_address": "111 Fallback Rd",
    "service_type": "hvac",
    "urgency": "medium",
    "end_call_reason": "callback_later",
    "ai_summary": "AC making grinding noise and not cooling well",
    "user_email": "your-email@example.com",
    "sentiment_score": 3,
    "work_type": "service",
    "tags": {}
  }'
```

**Expected Result:**
- ✓ Success response
- ✓ Tags generated from transcript (e.g., "Noise", "AC")
- ✓ Dashboard displays tags normally
- ✓ No errors in console

## Troubleshooting

### Issue: Webhook returns 401 Unauthorized

**Solution:** Check `WEBHOOK_SECRET` matches between backend and dashboard

```bash
# Dashboard .env
WEBHOOK_SECRET=your-secret-here

# Backend env
DASHBOARD_WEBHOOK_SECRET=your-secret-here  # Must match!
```

### Issue: Tags not displaying in dashboard

**Solution 1:** Check database migration applied

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('leads', 'jobs')
AND column_name = 'tags';
```

Should show `tags | jsonb`

**Solution 2:** Check network response

1. Open browser DevTools → Network tab
2. Reload dashboard ACTION page
3. Find `/api/action` request
4. Verify `tags` field in response

### Issue: Archetype wrong

**Solution:** Check tag mapper logic in `src/lib/tag-taxonomy-mapper.ts`

```typescript
// Verify archetype mapping logic
// HAZARD should trigger on any HAZARD tag
// RECOVERY should trigger on specific recovery tags
// REVENUE should trigger on revenue tags
// LOGISTICS is default
```

### Issue: Build errors

**Solution:** Verify types include `tags` field

```bash
cd calllock-dashboard
npm run build
```

Should compile without errors. If failing, check:
- `src/types/database.ts` has `tags` field in both Job and Lead
- `src/lib/velocity.ts` imports `ItemWithTags` type

## Success Criteria

Complete integration when:

- [x] Database migration applied
- [x] V2 backend sends `tags` field
- [x] Dashboard receives and stores tags
- [x] Archetype determined from tags
- [x] Display tags shown on cards
- [x] Fallback to transcript analysis works
- [x] Deduplication with tags works
- [x] UI displays correctly for all archetypes

## Production Deployment

1. **Apply migration:** `supabase db push` or run SQL in production
2. **Deploy dashboard:** Vercel auto-deploys from git push
3. **Deploy V2 backend:** Update Render with tag classification logic
4. **Monitor:** Check webhook logs, dashboard tags, user feedback

## Contact

Questions? Check documentation:
- V2: `V2/HVAC_SMART_TAG_TAXONOMY.md`
- Dashboard: `calllock-dashboard/src/lib/tag-taxonomy-mapper.ts`
