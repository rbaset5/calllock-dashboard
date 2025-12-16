/**
 * Apply V4 Migration via Direct PostgreSQL Connection
 *
 * Uses node-postgres (pg) to connect directly to Supabase and run DDL.
 * Requires DATABASE_URL environment variable or constructs it from project ref.
 */

import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databasePassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Check .env.local');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

async function main() {
  console.log('\n🚀 V4 Migration - Direct PostgreSQL Connection\n');
  console.log('Project:', projectRef);
  console.log('='.repeat(60));

  // Construct database URL
  // Supabase database URL format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

  if (!databasePassword) {
    console.log('\n⚠️  DATABASE_PASSWORD not found in environment.');
    console.log('\nTo apply the migration, you need to:');
    console.log('\n1. Get your database password from Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/xboybmqtwsxmdokgzclk/settings/database');
    console.log('\n2. Add it to .env.local:');
    console.log('   SUPABASE_DB_PASSWORD=your-password-here');
    console.log('\n3. Run this script again:');
    console.log('   npx tsx scripts/apply-migration-direct.ts');
    console.log('\n' + '='.repeat(60));
    console.log('\nAlternatively, copy this SQL and run it in the Supabase Dashboard SQL Editor:');
    console.log('https://supabase.com/dashboard/project/xboybmqtwsxmdokgzclk/sql/new');
    console.log('\n' + '-'.repeat(60) + '\n');
    printMigrationSQL();
    process.exit(1);
  }

  const databaseUrl = `postgresql://postgres.${projectRef}:${databasePassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

  console.log('\n📡 Connecting to database...');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('  ✅ Connected!\n');

    // Run migrations in order
    console.log('📦 Applying migrations...\n');

    // Migration 1: Add enum values
    console.log('1️⃣  Adding enum values...');
    try {
      await client.query(`ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'abandoned'`);
      console.log('    ✅ Added: abandoned');
    } catch (e: any) {
      if (e.message.includes('already exists') || e.code === '42710') {
        console.log('    ⏭️  Skipped: abandoned (already exists)');
      } else {
        throw e;
      }
    }

    try {
      await client.query(`ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'sales_opportunity'`);
      console.log('    ✅ Added: sales_opportunity');
    } catch (e: any) {
      if (e.message.includes('already exists') || e.code === '42710') {
        console.log('    ⏭️  Skipped: sales_opportunity (already exists)');
      } else {
        throw e;
      }
    }

    // Migration 2: Add V4 columns to leads table
    console.log('\n2️⃣  Adding V4 columns to leads table...');
    const leadsColumns = [
      ['priority_color', "TEXT DEFAULT 'blue'"],
      ['priority_reason', 'TEXT'],
      ['callback_outcome', 'TEXT'],
      ['callback_outcome_at', 'TIMESTAMPTZ'],
      ['callback_outcome_note', 'TEXT'],
      ['last_call_tapped_at', 'TIMESTAMPTZ'],
      ['time_preference', 'TEXT'],
    ];

    for (const [colName, colType] of leadsColumns) {
      try {
        await client.query(`ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ${colName} ${colType}`);
        console.log(`    ✅ Added: leads.${colName}`);
      } catch (e: any) {
        console.log(`    ❌ Error adding leads.${colName}: ${e.message}`);
      }
    }

    // Migration 3: Add V4 columns to jobs table
    console.log('\n3️⃣  Adding V4 columns to jobs table...');
    const jobsColumns = [
      ['priority_color', "TEXT DEFAULT 'blue'"],
      ['priority_reason', 'TEXT'],
    ];

    for (const [colName, colType] of jobsColumns) {
      try {
        await client.query(`ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ${colName} ${colType}`);
        console.log(`    ✅ Added: jobs.${colName}`);
      } catch (e: any) {
        console.log(`    ❌ Error adding jobs.${colName}: ${e.message}`);
      }
    }

    // Migration 4: Create indexes
    console.log('\n4️⃣  Creating indexes...');
    const indexes = [
      [
        'idx_leads_action_view',
        `CREATE INDEX IF NOT EXISTS idx_leads_action_view ON public.leads(user_id, priority_color, status) WHERE status NOT IN ('converted', 'lost')`,
      ],
      [
        'idx_leads_pending_outcome',
        `CREATE INDEX IF NOT EXISTS idx_leads_pending_outcome ON public.leads(user_id, last_call_tapped_at) WHERE last_call_tapped_at IS NOT NULL`,
      ],
      [
        'idx_leads_priority_color',
        `CREATE INDEX IF NOT EXISTS idx_leads_priority_color ON public.leads(user_id, priority_color)`,
      ],
    ];

    for (const [indexName, indexSQL] of indexes) {
      try {
        await client.query(indexSQL);
        console.log(`    ✅ Created: ${indexName}`);
      } catch (e: any) {
        if (e.message.includes('already exists')) {
          console.log(`    ⏭️  Skipped: ${indexName} (already exists)`);
        } else {
          console.log(`    ❌ Error creating ${indexName}: ${e.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ V4 Migration Complete!');
    console.log('='.repeat(60));

    // Verify columns exist
    console.log('\n🔍 Verifying migration...');
    const { rows } = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'leads'
        AND column_name IN ('priority_color', 'callback_outcome', 'last_call_tapped_at', 'time_preference')
    `);

    console.log(`    Found ${rows.length}/4 V4 columns in leads table`);
    rows.forEach((row: any) => console.log(`      ✓ ${row.column_name}`));

    if (rows.length === 4) {
      console.log('\n🎉 All V4 columns verified successfully!');
    } else {
      console.log('\n⚠️  Some columns may be missing. Check the output above.');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('password authentication failed')) {
      console.log('\n💡 Hint: Check your SUPABASE_DB_PASSWORD in .env.local');
      console.log('   Get it from: https://supabase.com/dashboard/project/xboybmqtwsxmdokgzclk/settings/database');
    }

    process.exit(1);
  } finally {
    await client.end();
  }
}

function printMigrationSQL() {
  console.log(`
-- CallLock V4 Migration - Copy and run in Supabase SQL Editor
-- ============================================================

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

-- Done! Verify with:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('priority_color', 'callback_outcome', 'last_call_tapped_at');
`);
}

main().catch(console.error);
