import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseB } from '@/lib/supabase';
import { getSupabaseCore, type CityKey } from '@/lib/supabase-core';
import { requireAdmin } from '@/lib/admin-auth';
import { subDays, subMonths, format } from 'date-fns';

const CITIES: CityKey[] = ['franca', 'praia_grande', 'mogiana', 'imperatriz'];

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const supabaseB = getSupabaseB();
    const today = new Date().toISOString().split('T')[0];
    const days30Ago = subDays(new Date(), 30).toISOString().split('T')[0];
    const months12Ago = subMonths(new Date(), 12).toISOString().split('T')[0];

    let payments: { amount: string; payment_date: string; payment_type: string }[] = [];
    let loans: { id: string; due_date: string; status: string; total_amount?: string }[] = [];

    for (const city of CITIES) {
      try {
        const supabase = getSupabaseCore(city);
        const [pRes, lRes] = await Promise.all([
          supabase.from('payments').select('amount, payment_date, payment_type').gte('payment_date', days30Ago),
          supabase.from('loans').select('id, due_date, status, total_amount').eq('status', 'active'),
        ]);
        payments = payments.concat(pRes.data || []);
        loans = loans.concat(lRes.data || []);
      } catch {
        // city not configured, skip
      }
    }

    const [pendingResult, approvedResult] = await Promise.all([
      supabaseB.from('payment_requests').select('id, created_at').eq('status', 'pending'),
      supabaseB.from('payment_requests').select('created_at, approved_at').eq('status', 'approved').not('approved_at', 'is', null),
    ]);
    const pending = pendingResult.data || [];
    const approved = approvedResult.data || [];

    const byDay: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    let interestCount = 0;
    let settlementCount = 0;
    let totalReceived = 0;

    for (const p of payments) {
      const amt = parseFloat(p.amount);
      totalReceived += amt;
      if (p.payment_type === 'interest_renewal') interestCount++;
      else if (p.payment_type === 'full_settlement') settlementCount++;

      const d = p.payment_date;
      byDay[d] = (byDay[d] || 0) + amt;
      const m = d.substring(0, 7);
      byMonth[m] = (byMonth[m] || 0) + amt;
    }

    const recebidosPorDia = Object.entries(byDay)
      .filter(([d]) => d >= days30Ago)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }));

    const recebidosPorMes = Object.entries(byMonth)
      .filter(([m]) => m >= months12Ago)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, value]) => ({ month, value }));

    const totalPayments = interestCount + settlementCount;
    const tiposPagamento = [
      { name: 'Juros (Renovação)', value: interestCount, percent: totalPayments ? (interestCount / totalPayments) * 100 : 0 },
      { name: 'Quitação', value: settlementCount, percent: totalPayments ? (settlementCount / totalPayments) * 100 : 0 },
    ];

    const pendentesAbertas = pending.length;

    const temposAprovacao: number[] = [];
    for (const a of approved) {
      if (a.approved_at) {
        const diff = new Date(a.approved_at).getTime() - new Date(a.created_at).getTime();
        temposAprovacao.push(diff / (1000 * 60 * 60));
      }
    }
    const tempoMedioAprovacao = temposAprovacao.length
      ? temposAprovacao.reduce((s, t) => s + t, 0) / temposAprovacao.length
      : 0;

    const loansVencidos = loans.filter((l) => l.due_date < today).length;
    const totalEsperado = loans.reduce((s, l) => s + parseFloat(l.total_amount || '0'), 0);
    const valorRecebidoMes = recebidosPorMes.find((m) => m.month === format(new Date(), 'yyyy-MM'))?.value || 0;

    return NextResponse.json({
      recebidosPorDia,
      recebidosPorMes,
      tiposPagamento,
      pendentesAbertas,
      tempoMedioAprovacao: Math.round(tempoMedioAprovacao * 100) / 100,
      saude: {
        loansAtivosVencidos: loansVencidos,
        taxaRenovacaoMes: totalPayments ? (interestCount / totalPayments) * 100 : 0,
        valorRecebidoMes,
        totalEsperado,
      },
    });
  } catch (e) {
    if ((e as Error).message === 'Não autorizado') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
