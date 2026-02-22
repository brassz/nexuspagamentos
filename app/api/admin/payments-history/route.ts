import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseCore, type CityKey } from '@/lib/supabase-core';
import { requireAdmin } from '@/lib/admin-auth';

const CITIES: CityKey[] = ['franca', 'praia_grande', 'mogiana', 'imperatriz'];

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const allPayments: { id: string; loan_id: string; amount: string; payment_date: string; payment_type: string; notes?: string; created_at: string; city?: string }[] = [];

    for (const city of CITIES) {
      try {
        const supabase = getSupabaseCore(city);
        const { data } = await supabase
          .from('payments')
          .select('id, loan_id, amount, payment_date, payment_type, notes, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        (data || []).forEach((p) => allPayments.push({ ...p, city }));
      } catch {
        // city not configured
      }
    }

    allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ payments: allPayments.slice(0, 200) });
  } catch (e) {
    if ((e as Error).message === 'Não autorizado') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
