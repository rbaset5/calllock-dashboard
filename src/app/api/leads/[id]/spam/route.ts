import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark the lead as spam (set priority_color to gray and status to lost)
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        priority_color: 'gray',
        priority_reason: 'Marked as spam by user',
        status: 'lost',
        lost_reason: 'spam',
        lost_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error marking lead as spam:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark lead as spam' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in spam endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
