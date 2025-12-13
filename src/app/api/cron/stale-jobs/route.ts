import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOperatorNotification } from '@/lib/notification-service';

/**
 * Stale Jobs Alert Processor
 *
 * Finds jobs that have been in 'new' status for over 24 hours
 * and sends SMS alerts to the operator.
 *
 * Should be called every 1 hour via Vercel Cron or similar.
 *
 * Flow:
 * 1. Find all jobs with status='new' created > 24 hours ago
 * 2. For each job:
 *    - Mark job.needs_action = true
 *    - Send stale_job_alert SMS
 *    - Track that we've alerted (to avoid repeated alerts)
 */

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow unauthenticated in development, require auth in production
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  const supabase = createAdminClient();
  const now = new Date();

  // 24 hours ago
  const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Find stale jobs that need attention
    // Jobs in 'new' status, created over 24h ago, not already flagged
    const { data: staleJobs, error: fetchError } = await supabase
      .from('jobs')
      .select(`
        *,
        users!inner(id, phone, timezone)
      `)
      .eq('status', 'new')
      .eq('needs_action', false)
      .lt('created_at', staleThreshold.toISOString())
      .limit(20); // Process in batches

    if (fetchError) {
      console.error('Error fetching stale jobs:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch stale jobs' },
        { status: 500 }
      );
    }

    if (!staleJobs || staleJobs.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No stale jobs found',
      });
    }

    let alerted = 0;
    let skipped = 0;

    for (const job of staleJobs) {
      const user = job.users as { id: string; phone: string | null; timezone: string };

      // Calculate hours since creation
      const createdAt = new Date(job.created_at);
      const hoursWaiting = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

      // Mark job as needing action
      await supabase
        .from('jobs')
        .update({
          needs_action: true,
          needs_action_note: `Job has been waiting for ${hoursWaiting} hours without progress`,
        })
        .eq('id', job.id);

      if (!user.phone) {
        console.log(`Stale job ${job.id}: No phone number configured for user`);
        skipped++;
        continue;
      }

      // Send stale job alert notification
      const result = await sendOperatorNotification(
        user.id,
        job.id,
        'stale_job_alert',
        {
          customerName: job.customer_name,
          customerPhone: job.customer_phone,
          hoursWaiting,
        },
        user.phone,
        user.timezone
      );

      if (result.sent || result.queued) {
        alerted++;
        console.log(`Sent stale job alert for job ${job.id}: ${job.customer_name} (${hoursWaiting}h)`);
      } else {
        skipped++;
        console.log(`Failed to alert for stale job ${job.id}: ${result.reason}`);
      }
    }

    return NextResponse.json({
      processed: staleJobs.length,
      alerted,
      skipped,
      threshold: '24 hours',
    });
  } catch (error) {
    console.error('Stale jobs processor error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
