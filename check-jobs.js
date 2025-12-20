const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://xboybmqtwsxmdokgzclk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhib3libXF0d3N4bWRva2d6Y2xrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4Nzc0NSwiZXhwIjoyMDgwMjYzNzQ1fQ.mgERkkHfSFRgETXcgSasAj9W9UPg0l71M0XQnHAYjtA'
);

async function check() {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, customer_name, customer_phone, scheduled_at, is_ai_booked, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('=== MOST RECENT JOBS ===');
  if (error) {
    console.log('Error:', error.message);
    return;
  }

  let bookedCount = 0;
  jobs.forEach(j => {
    const scheduled = j.scheduled_at ? new Date(j.scheduled_at).toLocaleString('en-US', {timeZone: 'America/Chicago'}) : 'NOT SET';
    console.log(j.customer_phone + ' | scheduled: ' + scheduled + ' | ai_booked: ' + j.is_ai_booked + ' | status: ' + j.status);
    if (j.scheduled_at) bookedCount++;
  });

  console.log('');
  console.log('=== BOOKED TAB should show ' + bookedCount + ' job(s) ===');
}
check();
