/**
 * Script para criar o primeiro admin no Supabase B.
 * Execute: npx ts-node scripts/create-admin.ts
 * Ou: npx tsx scripts/create-admin.ts
 *
 * Requer variáveis: SUPABASE_B_URL, SUPABASE_B_SERVICE_ROLE
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const url = process.env.SUPABASE_B_URL!;
const key = process.env.SUPABASE_B_SERVICE_ROLE!;
if (!url || !key) {
  console.error('Defina SUPABASE_B_URL e SUPABASE_B_SERVICE_ROLE');
  process.exit(1);
}

const email = process.argv[2] || 'admin@nexuspagamentos.com';
const password = process.argv[3] || 'admin123';

async function main() {
  const hash = await bcrypt.hash(password, 10);
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('admin_users').insert({
    email,
    password_hash: hash,
    role: 'admin',
    is_active: true,
  }).select('id, email').single();

  if (error) {
    if (error.code === '23505') {
      console.log('Admin já existe. Use outro email.');
    } else {
      console.error('Erro:', error);
    }
    process.exit(1);
  }
  console.log('Admin criado:', data?.email);
}

main();
