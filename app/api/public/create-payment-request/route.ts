import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseB } from '@/lib/supabase';
import { getSupabaseCore, type CityKey } from '@/lib/supabase-core';
import { buildPixPayload } from '@/lib/pix';
import { generateQRCodeBase64 } from '@/lib/qr';

function calcInterestRenewal(originalAmount: number, interestRate: number): number {
  return originalAmount * (interestRate / 100);
}

export async function POST(req: NextRequest) {
  try {
    const { loan_id, payment_type, client_identifier, city } = await req.json();
    if (!loan_id || !payment_type || !['interest_renewal', 'full_settlement'].includes(payment_type)) {
      return NextResponse.json({ error: 'loan_id e payment_type obrigatórios' }, { status: 400 });
    }
    if (!city || !['franca', 'praia_grande', 'mogiana', 'imperatriz'].includes(city)) {
      return NextResponse.json({ error: 'city obrigatória' }, { status: 400 });
    }

    const supabaseA = getSupabaseCore(city as CityKey);
    const { data: loan, error: loanError } = await supabaseA
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .eq('status', 'active')
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Empréstimo não encontrado ou inativo' }, { status: 404 });
    }

    const originalAmount = parseFloat(loan.original_amount);
    const interestRate = parseFloat(loan.interest_rate);
    const totalAmount = parseFloat(loan.total_amount);

    let amount: number;
    if (payment_type === 'interest_renewal') {
      amount = calcInterestRenewal(originalAmount, interestRate);
    } else {
      amount = totalAmount;
    }

    const supabaseB = getSupabaseB();
    const { data: pr, error: prError } = await supabaseB
      .from('payment_requests')
      .insert({
        loan_id,
        client_identifier: client_identifier || null,
        amount,
        payment_type,
        status: 'pending',
        city,
      })
      .select('id')
      .single();

    if (prError) {
      console.error('Create payment_request:', prError);
      return NextResponse.json({ error: 'Erro ao criar solicitação' }, { status: 500 });
    }

    const pixPayload = buildPixPayload(amount);
    const qrBase64 = await generateQRCodeBase64(pixPayload);

    return NextResponse.json({
      payment_request_id: pr.id,
      amount,
      pix_payload: pixPayload,
      qr_png_base64: qrBase64,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
