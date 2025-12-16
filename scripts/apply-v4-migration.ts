/**
 * Apply V4 Migration
 *
 * Applies the V4 migration SQL directly to the database using service role.
 * This includes:
 * - 0004: Add 'abandoned' status to lead_status enum
 * - 0005: Add 'sales_opportunity' status to lead_status enum
 * - 0016: V4 ACTION/BOOKED model (priority colors, outcome tracking)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to run SQL via REST API
async function runSQL(sql: string, description: string): Promise<boolean> {
  console.log(`\n📝 ${description}...`);

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.log(`  ❌ Failed: ${text}`);
    return false;
  }

  console.log(`  ✅ Success`);
  return true;
}

async function main() {
  console.log('\n🚀 Applying V4 Migrations\n');
  console.log('='.repeat(60));

  // Migration 0004: Add 'abandoned' status
  console.log('\n📦 Migration 0004: Add abandoned status');
  const migration0004 = `ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'abandoned';`;

  // Migration 0005: Add 'sales_opportunity' status
  console.log('\n📦 Migration 0005: Add sales_opportunity status');
  const migration0005 = `ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'sales_opportunity';`;

  // Migration 0016: V4 ACTION/BOOKED Model
  console.log('\n📦 Migration 0016: V4 ACTION/BOOKED Model');
  const migration0016 = `
-- Add priority_color column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_color TEXT DEFAULT 'blue';
COMMENT ON COLUMN public.leads.priority_color IS 'V4 priority: red (callback_risk), green (commercial), blue (new_lead), gray (spam)';

-- Add priority_reason column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_reason TEXT;
COMMENT ON COLUMN public.leads.priority_reason IS 'Human-readable explanation for priority assignment';

-- Callback outcome tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_outcome TEXT;
COMMENT ON COLUMN public.leads.callback_outcome IS 'Outcome: booked, resolved, try_again, no_answer';

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_outcome_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_outcome_note TEXT;

-- Call tap tracking for outcome prompt
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_call_tapped_at TIMESTAMPTZ;
COMMENT ON COLUMN public.leads.last_call_tapped_at IS 'Timestamp of last Call button tap - used to show outcome prompt';

-- Time preference
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS time_preference TEXT;
COMMENT ON COLUMN public.leads.time_preference IS 'Customer time preference: tomorrow morning, weekends only, etc.';

-- Add priority columns to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority_color TEXT DEFAULT 'blue';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority_reason TEXT;
`;

  // Since we can't run raw SQL directly, let's use a workaround
  // by checking each column and creating test data to verify

  console.log('\n⚠️  Direct SQL execution requires Supabase Dashboard access.');
  console.log('\nPlease run the following SQL in the Supabase Dashboard SQL Editor:');
  console.log('\n' + '='.repeat(60));
  console.log('\n-- Step 1: Add enum values (run one at a time if needed)\n');
  console.log(migration0004);
  console.log(migration0005);
  console.log('\n-- Step 2: Add V4 columns\n');
  console.log(migration0016);
  console.log('\n' + '='.repeat(60));

  console.log('\n📋 Quick SQL for copy/paste:\n');

  const fullSQL = `
-- CallLock V4 Migration - Run in Supabase SQL Editor
-- ===================================================

-- 1. Add enum values (may show error if already exists - that's OK)
DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'abandoned';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'sales_opportunity';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add V4 columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_color TEXT DEFAULT 'blue';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_reason TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_outcome TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_outcome_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS callback_outcome_note TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_call_tapped_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS time_preference TEXT;

-- 3. Add V4 columns to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority_color TEXT DEFAULT 'blue';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS priority_reason TEXT;

-- 4. Create indexes for ACTION view
CREATE INDEX IF NOT EXISTS idx_leads_action_view
ON public.leads(user_id, priority_color, status)
WHERE status NOT IN ('converted', 'lost');

CREATE INDEX IF NOT EXISTS idx_leads_pending_outcome
ON public.leads(user_id, last_call_tapped_at)
WHERE last_call_tapped_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_priority_color
ON public.leads(user_id, priority_color);

-- Done! Run the check script to verify.
`;

  console.log(fullSQL);

  console.log('\n' + '='.repeat(60));
  console.log('\n🔗 Open Supabase Dashboard: https://supabase.com/dashboard');
  console.log('   Project: xboybmqtwsxmdokgzclk (CallLock)');
  console.log('   Go to: SQL Editor -> New Query -> Paste & Run');
  console.log('\nAfter running, execute:');
  console.log('  npx tsx scripts/check-and-apply-migrations.ts');
  console.log('to verify the migration was successful.\n');
}

main().catch(console.error);
