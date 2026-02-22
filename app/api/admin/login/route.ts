import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseB } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'email e password obrigatórios' }, { status: 400 });
    }

    const supabase = getSupabaseB();
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, email, password_hash, role')
      .eq('email', email.trim().toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await supabase.from('admin_sessions').insert({
      admin_user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json({
      token,
      expires_at: expiresAt.toISOString(),
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
