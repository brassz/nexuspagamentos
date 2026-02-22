import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseB } from '@/lib/supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const paymentRequestId = formData.get('payment_request_id') as string | null;
    const file = formData.get('file') as File | null;
    const clientNote = (formData.get('client_note') as string) || null;

    if (!paymentRequestId || !file) {
      return NextResponse.json({ error: 'payment_request_id e file obrigatórios' }, { status: 400 });
    }

    const supabase = getSupabaseB();
    const { data: pr, error: prError } = await supabase
      .from('payment_requests')
      .select('id, loan_id, status')
      .eq('id', paymentRequestId)
      .single();

    if (prError || !pr) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }
    if (pr.status !== 'pending') {
      return NextResponse.json({ error: 'Solicitação não está pendente' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou PDF.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 10MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || (file.type.includes('pdf') ? 'pdf' : 'bin');
    const timestamp = Date.now();
    const path = `receipts/${pr.loan_id}/${paymentRequestId}/${timestamp}.${ext}`;

    const buf = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, buf, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error('Storage upload:', uploadError);
      return NextResponse.json({ error: 'Erro ao enviar arquivo' }, { status: 500 });
    }

    await supabase.from('receipts').insert({
      payment_request_id: paymentRequestId,
      file_path: path,
      mime_type: file.type,
    });

    if (clientNote?.trim()) {
      await supabase.from('payment_requests').update({ client_note: clientNote.trim() }).eq('id', paymentRequestId);
    }

    return NextResponse.json({ ok: true, path });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
