import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseB } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const { payment_request_id, reason } = await req.json();
    if (!payment_request_id || !reason) {
      return NextResponse.json({ error: 'payment_request_id e reason obrigatórios' }, { status: 400 });
    }

    const supabase = getSupabaseB();
    const { data: pr, error: prError } = await supabase
      .from('payment_requests')
      .select('id, loan_id, amount, payment_type')
      .eq('id', payment_request_id)
      .eq('status', 'pending')
      .single();

    if (prError || !pr) {
      return NextResponse.json({ error: 'Solicitação não encontrada ou já processada' }, { status: 404 });
    }

    await supabase
      .from('payment_requests')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        admin_note: reason,
      })
      .eq('id', payment_request_id);

    await supabase.from('audit_logs').insert({
      action: 'reject_payment',
      entity: 'payment_request',
      entity_id: payment_request_id,
      performed_by: admin.email,
      metadata: { reason, loan_id: pr.loan_id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as Error).message === 'Não autorizado') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
