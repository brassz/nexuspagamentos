import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseCore, type CityKey } from '@/lib/supabase-core';

const SEARCH_CITIES: Array<Exclude<CityKey, 'outro'>> = ['franca', 'praia_grande', 'mogiana', 'imperatriz'];

function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

function isCPF(query: string): boolean {
  const normalized = normalizeCPF(query);
  return normalized.length >= 10 && /^\d+$/.test(normalized);
}

async function searchInCity(
  city: Exclude<CityKey, 'outro'>,
  trimmed: string,
  isCpf: boolean
): Promise<{ clients: Array<Record<string, unknown> & { source_city: string }>; loans: Array<Record<string, unknown> & { source_city: string }> }> {
  const supabase = getSupabaseCore(city);
  let clients: Array<Record<string, unknown>> = [];

  if (isCpf) {
    const cpfNorm = normalizeCPF(trimmed);
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, cpf, email, phone')
      .or(`cpf.eq.${cpfNorm},cpf.eq.${trimmed}`);
    if (error || !data?.length) return { clients: [], loans: [] };
    clients = data;
  } else {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, cpf, email, phone')
      .ilike('name', `%${trimmed}%`);
    if (error || !data?.length) return { clients: [], loans: [] };
    clients = data;
  }

  const clientIds = clients.map((c) => c.id);
  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .in('client_id', clientIds)
    .eq('status', 'active')
    .order('due_date', { ascending: true });

  return {
    clients: clients.map((c) => ({ ...c, source_city: city })),
    loans: (loans || []).map((l) => ({ ...l, source_city: city })),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { query, city } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query obrigatória' }, { status: 400 });
    }
    if (!city || !['franca', 'praia_grande', 'mogiana', 'imperatriz', 'outro'].includes(city)) {
      return NextResponse.json({ error: 'city inválida' }, { status: 400 });
    }

    const trimmed = query.trim();
    const isCpf = isCPF(trimmed);

    if (city === 'outro') {
      const allClients: Array<Record<string, unknown> & { source_city: string }> = [];
      const allLoans: Array<Record<string, unknown> & { source_city: string }> = [];

      for (const c of SEARCH_CITIES) {
        try {
          const { clients, loans } = await searchInCity(c, trimmed, isCpf);
          allClients.push(...clients);
          allLoans.push(...loans);
        } catch {
          // cidade não configurada, ignorar
        }
      }

      return NextResponse.json({ clients: allClients, loans: allLoans });
    }

    const { clients, loans } = await searchInCity(city as Exclude<CityKey, 'outro'>, trimmed, isCpf);
    return NextResponse.json({ clients, loans });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
