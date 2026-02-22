-- NEXUSPAGAMENTOS - Supabase B
-- Migration 009: Adicionar city e client_note em payment_requests

ALTER TABLE payment_requests
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS client_note text;
