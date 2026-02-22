import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseB } from '@/lib/supabase';
import { getSupabaseCore, type CityKey } from '@/lib/supabase-core';
import { requireAdmin } from '@/lib/admin-auth';

function maskCPF(cpf: string): string {
  if (!cpf) return '';
  const d = cpf.replace(/\D/g, '');
  return d.length >= 11 ? d.replace(/(\d{3})\d{6}(\d{2})/, '$1.***.***-$2') : cpf;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const supabaseB = getSupabaseB();
    const { data: pending, error } = await supabaseB
      .from('payment_requests')
      .select(`
        id,
        loan_id,
        client_identifier,
        city,
        client_note,
        amount,
        payment_type,
        status,
        created_at,
        receipts (id, file_path, mime_type, uploaded_at)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Admin pending:', error);
      return NextResponse.json({ error: 'Erro ao listar pendências' }, { status: 500 });
    }

    const list = pending || [];
    if (list.length === 0) return NextResponse.json({ pending: [] });

    const enriched: Array<typeof list[0] & { client_name: string | null; client_cpf: string | null }> = [];

    for (const p of list) {
      const city = (p.city || 'praia_grande') as CityKey;
      let clientName: string | null = null;
      let clientCpf: string | null = p.client_identifier || null;
      if (city !== 'outro') {
        try {
          const supabaseA = getSupabaseCore(city);
          const { data: loan } = await supabaseA.from('loans').select('client_id').eq('id', p.loan_id).single();
          if (loan?.client_id) {
            const { data: client } = await supabaseA.from('clients').select('name, cpf').eq('id', loan.client_id).single();
            if (client) {
              clientName = client.name;
              clientCpf = client.cpf ? maskCPF(client.cpf) : clientCpf;
            }
          }
        } catch {
          // ignore
        }
      }
      enriched.push({ ...p, client_name: clientName, client_cpf: clientCpf });
    }

    return NextResponse.json({ pending: enriched });
  } catch (e) {
    if ((e as Error).message === 'Não autorizado') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
