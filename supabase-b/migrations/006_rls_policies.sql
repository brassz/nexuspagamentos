-- NEXUSPAGAMENTOS - Supabase B
-- Migration 006: RLS (Row Level Security)
-- Nota: Escritas críticas são feitas server-side com service_role que bypassa RLS.
-- RLS protege acesso direto via cliente (anon key).

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy permissiva para anon = anon não acessa nenhuma tabela.
-- Todas as operações são feitas server-side com service_role (bypassa RLS).
