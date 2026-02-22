-- NEXUSPAGAMENTOS - Supabase B
-- Migration 001: admin_users (login via tabela, sem Supabase Auth)

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text CHECK (role IN ('admin', 'operator')) DEFAULT 'operator',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);

-- Exemplo de usuário admin (senha: admin123) - REMOVER EM PRODUÇÃO
-- INSERT INTO admin_users (email, password_hash, role) VALUES 
--   ('admin@nexuspagamentos.com', '$2b$10$rQZ8K7V8J9K7L8M9N0O1P.uQwErTyUiOpAsDfGhJkLzXcVbNmQwEr', 'admin');
