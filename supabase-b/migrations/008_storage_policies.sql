-- NEXUSPAGAMENTOS - Supabase B
-- Migration 008: Políticas de Storage para o bucket receipts
-- Necessário para permitir upload de comprovantes (API server-side usa service_role, mas Storage pode exigir policy explícita)

-- Permitir INSERT (upload) no bucket receipts
-- O upload é feito server-side pelo endpoint /api/public/upload-receipt após validar payment_request pending
CREATE POLICY "Allow insert receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts');

-- Permitir SELECT (download) - para o admin visualizar comprovantes via signed URL
-- Signed URLs usam a service_role, mas a policy ajuda em alguns fluxos
CREATE POLICY "Allow select receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');
