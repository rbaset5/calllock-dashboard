import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

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

async function runMigration() {
  console.log('\n🚀 Running migration: 0002_mobile_first_schema.sql\n');

  // Read the migration file
  const migrationPath = join(__dirname, '../supabase/migrations/0002_mobile_first_schema.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  // Split by semicolons but be careful with functions
  // Run the whole thing as one statement via rpc
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // If exec_sql doesn't exist, we need to run it differently
    console.error('Migration failed:', error.message);
    console.log('\n⚠️  You need to run this migration manually in the Supabase SQL Editor.');
    console.log('\n📋 Copy the SQL from:');
    console.log('   supabase/migrations/0002_mobile_first_schema.sql');
    console.log('\n🔗 Open: https://supabase.com/dashboard/project/xboybmqtwsxmdokgzclk/sql/new');
    process.exit(1);
  }

  console.log('✅ Migration completed successfully!');
}

runMigration().catch(console.error);
