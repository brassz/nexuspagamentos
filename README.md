# NEXUS PAGAMENTOS

Sistema web de pagamentos e gestão de empréstimos com PIX, comprovantes e painel administrativo.

## Arquitetura

- **Supabase A (Core)**: Clientes, empréstimos, pagamentos. Escritas server-side com service role.
- **Supabase B (Nexus)**: Admin (login por tabela), comprovantes (Storage), payment_requests, audit_logs.

## Pré-requisitos

- Node.js 18+
- Duas instâncias Supabase (A e B)
- Chaves **service_role** de ambas (para operações server-side)

## Configuração

1. Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

2. Preencha as variáveis no `.env`:

- `SUPABASE_A_URL` / `SUPABASE_A_SERVICE_ROLE` – Supabase Core
- `SUPABASE_B_URL` / `SUPABASE_B_SERVICE_ROLE` – Supabase Nexus
- `PIX_KEY`, `PIX_MERCHANT_NAME`, `PIX_MERCHANT_CITY` – dados do PIX

3. Execute as migrations no **Supabase B** (SQL Editor):

- `supabase-b/migrations/001_create_admin_users.sql`
- `supabase-b/migrations/002_create_admin_sessions.sql`
- `supabase-b/migrations/003_create_payment_requests.sql`
- `supabase-b/migrations/004_create_receipts.sql`
- `supabase-b/migrations/005_create_audit_logs.sql`
- `supabase-b/migrations/006_rls_policies.sql`

4. Crie o bucket de Storage no **Supabase B**:

- Storage → New bucket → Nome: `receipts`, Private: true
- Ou via API após migrations

5. Crie o primeiro admin:

```bash
npx tsx scripts/create-admin.ts admin@nexuspagamentos.com SuaSenhaSegura
```

## Instalação

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Portal do cliente (busca por CPF/Nome, PIX, upload comprovante) |
| `/admin/login` | Login admin |
| `/admin/dashboard` | Dashboard com gráficos |
| `/admin/pendentes` | Lista de pagamentos pendentes (dar baixa / rejeitar) |
| `/admin/pagamentos` | Histórico de pagamentos (Supabase A) |

## API

### Público

- `POST /api/public/search` – `{ query }` – Busca clientes/empréstimos
- `POST /api/public/create-payment-request` – `{ loan_id, payment_type, client_identifier }` – Gera PIX e cria payment_request
- `POST /api/public/upload-receipt` – multipart `payment_request_id`, `file` – Envia comprovante

### Admin (Header: `Authorization: Bearer <token>`)

- `POST /api/admin/login` – `{ email, password }`
- `GET /api/admin/pending` – Lista pendências
- `POST /api/admin/approve` – `{ payment_request_id }` – Dar baixa
- `POST /api/admin/reject` – `{ payment_request_id, reason }` – Rejeitar
- `GET /api/admin/dashboard` – Dados para gráficos
- `GET /api/admin/payments-history` – Histórico de pagamentos
- `POST /api/admin/receipt-url` – `{ file_path }` – URL assinada do comprovante

## Supabase A – Tabelas esperadas

- `clients`: id, name, cpf, email, phone
- `loans`: id, client_id, original_amount, interest_rate, total_amount, loan_date, due_date, status, term_days
- `payments`: id, loan_id, amount, payment_date, payment_type, notes, created_at, fine_amount

## Regras de negócio

1. **Renovação (juros)**: valor = original_amount × (interest_rate/100); ao aprovar: due_date + 30 dias
2. **Quitação**: valor = total_amount; ao aprovar: loan.status = 'paid'
3. PIX: payload EMV com campo 54 (valor) e CRC16-CCITT
4. Comprovantes salvos em `receipts/{loan_id}/{payment_request_id}/{timestamp}.{ext}`
