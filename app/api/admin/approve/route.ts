import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseB } from '@/lib/supabase';
import { getSupabaseCore, type CityKey } from '@/lib/supabase-core';
import { requireAdmin } from '@/lib/admin-auth';
import { addDays } from 'date-fns';
import { parseDateLocal } from '@/lib/date-utils';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);

    const { payment_request_id } = await req.json();
    if (!payment_request_id) {
      return NextResponse.json({ error: 'payment_request_id obrigatório' }, { status: 400 });
    }

    const supabaseB = getSupabaseB();
    const { data: pr, error: prError } = await supabaseB
      .from('payment_requests')
      .select('*')
      .eq('id', payment_request_id)
      .eq('status', 'pending')
      .single();

    if (prError || !pr) {
      return NextResponse.json({ error: 'Solicitação não encontrada ou já processada' }, { status: 404 });
    }

    const city = (pr.city || 'praia_grande') as CityKey;
    const supabaseA = city !== 'outro' ? getSupabaseCore(city) : null;
    if (!supabaseA) {
      return NextResponse.json({ error: 'Cidade não configurada para este pagamento' }, { status: 400 });
    }

    const { data: loan } = await supabaseA
      .from('loans')
      .select('*')
      .eq('id', pr.loan_id)
      .single();

    if (!loan) {
      return NextResponse.json({ error: 'Empréstimo não encontrado no Supabase A' }, { status: 404 });
    }

    const amount = parseFloat(pr.amount);
    const paymentType = pr.payment_type;
    const today = new Date().toISOString().split('T')[0];
    const notes = `RENOVAÇÃO +30 DIAS - Somente Juros | Método: pix`; // simplificado
    const clientNote = pr.client_note ? ` | Cliente: ${pr.client_note}` : '';
    const fullNotes =
      paymentType === 'interest_renewal'
        ? `RENOVAÇÃO +30 DIAS - Somente Juros | Método: pix | Aprovado pelo admin ${admin.email}${clientNote}`
        : `QUITAÇÃO - Capital + Juros | Método: pix | Aprovado pelo admin ${admin.email}${clientNote}`;

    const { error: payError } = await supabaseA.from('payments').insert({
      loan_id: pr.loan_id,
      amount: amount.toFixed(2),
      payment_date: today,
      payment_type: paymentType,
      notes: fullNotes,
      fine_amount: '0.00',
    });

    if (payError) {
      console.error('Insert payment:', payError);
      return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 });
    }

    if (paymentType === 'interest_renewal') {
      const dueDate = addDays(parseDateLocal(loan.due_date), 30).toISOString().split('T')[0];
      await supabaseA
        .from('loans')
        .update({ due_date: dueDate })
        .eq('id', pr.loan_id);
    } else {
      await supabaseA
        .from('loans')
        .update({ status: 'paid' })
        .eq('id', pr.loan_id);
    }

    await supabaseB
      .from('payment_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: admin.id,
      })
      .eq('id', payment_request_id);

    await supabaseB.from('audit_logs').insert({
      action: 'approve_payment',
      entity: 'payment_request',
      entity_id: payment_request_id,
      performed_by: admin.email,
      metadata: {
        loan_id: pr.loan_id,
        amount,
        payment_type: paymentType,
      },
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
