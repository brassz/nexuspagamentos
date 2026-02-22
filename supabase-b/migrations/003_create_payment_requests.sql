-- NEXUSPAGAMENTOS - Supabase B
-- Migration 003: payment_requests (fila de pagamentos pendentes)

CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL,
  client_identifier text,
  amount numeric(12,2) NOT NULL,
  payment_type text CHECK (payment_type IN ('interest_renewal', 'full_settlement')) NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  admin_note text,
  approved_by uuid REFERENCES admin_users(id)
);

CREATE INDEX idx_payment_requests_status ON payment_requests(status);
CREATE INDEX idx_payment_requests_loan_id ON payment_requests(loan_id);
CREATE INDEX idx_payment_requests_created_at ON payment_requests(created_at);
