import { NextRequest } from 'next/server';
import { getSupabaseB } from './supabase';

export async function getAdminFromToken(req: NextRequest): Promise<{ id: string; email: string; role: string } | null> {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const supabase = getSupabaseB();
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('admin_user_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session?.admin_user_id) return null;

  const { data: user } = await supabase
    .from('admin_users')
    .select('id, email, role')
    .eq('id', session.admin_user_id)
    .eq('is_active', true)
    .single();

  if (!user) return null;
  return { id: user.id, email: user.email, role: user.role };
}

export function requireAdmin(req: NextRequest): Promise<{ id: string; email: string; role: string }> {
  return getAdminFromToken(req).then((admin) => {
    if (!admin) throw new Error('Não autorizado');
    return admin;
  });
}
