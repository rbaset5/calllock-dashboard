import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: leadId } = await params;
    const supabase = await createClient();
    const { note } = await request.json();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First fetch the lead to get customer info
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('customer_name, customer_phone, user_id')
        .eq('id', leadId)
        .single();

    if (leadError || !lead) {
        return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Insert into operator_notes
    const { error: insertError } = await supabase
        .from('operator_notes')
        .insert({
            user_id: user.id,
            lead_id: leadId,
            note_text: note,
            customer_phone: lead.customer_phone,
            customer_name: lead.customer_name,
            created_by: user.email,
            is_active: true,
        });

    if (insertError) {
        console.error('Error inserting note:', insertError);
        return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
