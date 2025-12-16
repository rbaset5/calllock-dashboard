import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
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

async function clearAll() {
  console.log('\n🧹 Clearing ALL data from database...\n');

  // Delete in reverse order of dependencies
  const tables = [
    'ai_booking_reviews',
    'leads',
    'jobs',
    'customers',
  ];

  let totalDeleted = 0;

  for (const table of tables) {
    console.log(`Clearing ${table}...`);
    const { data, error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows
      .select();

    if (error) {
      console.error(`  Error: ${error.message}`);
    } else {
      const count = data?.length || 0;
      totalDeleted += count;
      console.log(`  ✅ Deleted ${count} records from ${table}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🧹 All data cleared!');
  console.log('='.repeat(50));
  console.log(`\n📊 Total records deleted: ${totalDeleted}\n`);
}

clearAll().catch(console.error);
