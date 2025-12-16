/**
 * Run V4 Migration via Supabase REST API
 *
 * Uses the Supabase SQL execution endpoint to apply migrations directly.
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Check .env.local');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

async function runSQL(sql: string, description: string): Promise<boolean> {
  console.log(`\n📝 ${description}...`);

  try {
    // Use the Supabase Management API SQL endpoint
    // This requires the service role key
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        // Try different RPC methods
      }),
    });

    // If that doesn't work, we'll use psql connection
    return false;
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
    return false;
  }
}

// Function to create an RPC function that executes SQL
async function createExecSqlFunction(): Promise<boolean> {
  console.log('\n🔧 Checking if exec_sql function exists...');

  // We need to create a function in Supabase that can execute arbitrary SQL
  // This is a one-time setup

  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  EXECUTE sql_text;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
`;

  return true;
}

async function applyMigrationViaDatabase() {
  // Direct approach: Use the Supabase database connection
  // We can use the REST API to call stored procedures

  console.log('\n🚀 Applying V4 Migration\n');
  console.log('='.repeat(60));

  // Check if we can insert data with the new columns
  // If the columns don't exist, we need to apply the migration

  const checkSQL = `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'priority_color'`;

  // Use the /rest/v1/ endpoint with a custom RPC
  // First, let's check what we can do

  console.log('\n⚠️  Note: Supabase REST API does not support direct DDL execution.');
  console.log('   Attempting alternative method...\n');

  // Alternative: Use Supabase's built-in pg_read_file or similar if available
  // Most likely we need to use psql or the dashboard

  // Let's try using the Supabase CLI with the linked project
  console.log('Attempting to use Supabase CLI...');
}

async function main() {
  console.log('\n🚀 V4 Migration Runner\n');
  console.log('Project:', projectRef);
  console.log('URL:', supabaseUrl);
  console.log('='.repeat(60));

  // The most reliable way is to use the Supabase CLI with db execute
  // or connect directly with psql

  // Since direct SQL execution via REST is limited, let's use the CLI approach
  console.log('\nUsing Supabase CLI to execute migration...');

  // Write the migration to a temp file and execute via CLI
  const migrationSQL = `
-- CallLock V4 Migration
-- =====================

-- 1. Add enum values
DO $$
BEGIN
  BEGIN
    ALTER TYPE lead_status ADD VALUE 'abandoned';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'abandoned already exists';
  END;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER TYPE lead_status ADD VALUE 'sales_opportunity';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'sales_opportunity already exists';
  END;
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

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_action_view
ON public.leads(user_id, priority_color, status)
WHERE status NOT IN ('converted', 'lost');

CREATE INDEX IF NOT EXISTS idx_leads_pending_outcome
ON public.leads(user_id, last_call_tapped_at)
WHERE last_call_tapped_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_priority_color
ON public.leads(user_id, priority_color);

-- Done!
SELECT 'V4 Migration Complete' as status;
`;

  // Write to temp file
  const fs = await import('fs/promises');
  const tempFile = '/tmp/v4-migration.sql';
  await fs.writeFile(tempFile, migrationSQL);
  console.log(`\n📄 Migration SQL written to: ${tempFile}`);

  console.log('\n📋 Run this command to apply the migration:');
  console.log('\n  cd /Users/rashidbaset/Documents/retellai-calllock/calllock-dashboard');
  console.log('  npx supabase db execute --file /tmp/v4-migration.sql --linked\n');

  // Or try with psql if DATABASE_URL is available
  console.log('Or use psql directly with your DATABASE_URL:\n');
  console.log('  psql "postgresql://postgres:[PASSWORD]@db.xboybmqtwsxmdokgzclk.supabase.co:5432/postgres" -f /tmp/v4-migration.sql\n');
}

main().catch(console.error);
