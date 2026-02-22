-- NEXUSPAGAMENTOS - Supabase B
-- Migration 004: receipts (metadados dos comprovantes)

CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  mime_type text,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_receipts_payment_request_id ON receipts(payment_request_id);
