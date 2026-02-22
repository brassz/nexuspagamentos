import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseB } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const { file_path } = await req.json();
    if (!file_path) {
      return NextResponse.json({ error: 'file_path obrigatório' }, { status: 400 });
    }

    const supabase = getSupabaseB();
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(file_path, 60);

    if (error) {
      return NextResponse.json({ error: 'Erro ao gerar URL' }, { status: 500 });
    }
    return NextResponse.json({ url: data.signedUrl });
  } catch (e) {
    if ((e as Error).message === 'Não autorizado') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
