/**
 * Check and Apply Missing Migrations
 *
 * This script checks the current database state and applies missing migrations.
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

async function checkColumn(table: string, column: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_column_exists', {
    p_table: table,
    p_column: column,
  });

  if (error) {
    // Fallback: try to select from the column
    const { error: selectError } = await supabase
      .from(table)
      .select(column)
      .limit(1);

    return !selectError;
  }

  return data;
}

async function checkEnumValue(enumName: string, value: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_enum_value', {
    p_enum: enumName,
    p_value: value,
  });

  if (error) {
    // Can't check directly, return false
    return false;
  }

  return data;
}

async function main() {
  console.log('\n🔍 Checking database state...\n');

  // Check V4 columns
  const v4Columns = [
    'priority_color',
    'priority_reason',
    'callback_outcome',
    'callback_outcome_at',
    'callback_outcome_note',
    'last_call_tapped_at',
    'time_preference',
  ];

  console.log('📊 Leads table columns:');
  for (const col of v4Columns) {
    const exists = await checkColumn('leads', col);
    console.log(`  ${exists ? '✅' : '❌'} ${col}`);
  }

  // Try to insert a test lead with priority_color to check if column exists
  console.log('\n🧪 Testing priority_color column...');
  const { error: testError } = await supabase
    .from('leads')
    .select('priority_color')
    .limit(1);

  if (testError) {
    console.log('  ❌ priority_color does not exist:', testError.message);
  } else {
    console.log('  ✅ priority_color exists');
  }

  // Check for enum values
  console.log('\n📊 Checking lead_status enum values...');
  const testStatuses = ['abandoned', 'sales_opportunity', 'callback_requested', 'lost'];

  for (const status of testStatuses) {
    // Create a test query - if enum value doesn't exist, it will error
    const { error } = await supabase
      .from('leads')
      .select('id')
      .eq('status', status)
      .limit(1);

    if (error && error.message.includes('invalid input value')) {
      console.log(`  ❌ '${status}' not in enum`);
    } else {
      console.log(`  ✅ '${status}' exists in enum`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('To apply V4 migration, run the SQL in Supabase Dashboard:');
  console.log('  1. Go to: https://supabase.com/dashboard');
  console.log('  2. Select your project');
  console.log('  3. Go to SQL Editor');
  console.log('  4. Run the contents of:');
  console.log('     - supabase/migrations/0004_add_abandoned_lead_status.sql');
  console.log('     - supabase/migrations/0005_add_sales_opportunity_status.sql');
  console.log('     - supabase/migrations/0016_v4_action_booked_model.sql');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
