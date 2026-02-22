'use client';

import { useState } from 'react';
import { CITY_LABELS, type CityKey } from '@/lib/cities';
import Logo from '@/components/Logo';
import { formatDateBR, daysOverdue } from '@/lib/date-utils';

type Client = { id: string; name: string; cpf?: string; email?: string; phone?: string };
type Loan = {
  id: string;
  client_id: string;
  source_city?: string;
  original_amount: string;
  interest_rate: string;
  total_amount: string;
  loan_date: string;
  due_date: string;
  status: string;
};

type ClientWithCity = Client & { source_city?: string };

const CITIES: CityKey[] = ['franca', 'praia_grande', 'mogiana', 'imperatriz', 'outro'];

export default function PortalPage() {
  const [city, setCity] = useState<CityKey | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientWithCity[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithCity | null>(null);
  const [step, setStep] = useState<'city' | 'search' | 'loans' | 'payment'>('city');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentType, setPaymentType] = useState<'interest_renewal' | 'full_settlement' | null>(null);
  const [pixData, setPixData] = useState<{
    payment_request_id: string;
    amount: number;
    pix_payload: string;
    qr_png_base64: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [clientNote, setClientNote] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [useCustomPixImage, setUseCustomPixImage] = useState(false);

  const pixImagePath = process.env.NEXT_PUBLIC_PIX_QR_IMAGE || '/pix-qr.png';

  const selectCity = (c: CityKey) => {
    setCity(c);
    setStep('search');
  };

  const search = async () => {
    if (!query.trim() || !city) return;
    setLoading(true);
    setClients([]);
    setLoans([]);
    setSelectedClient(null);
    try {
      const res = await fetch('/api/public/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), city }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na busca');
      setClients(data.clients || []);
      setLoans(data.loans || []);
      if (data.clients?.length === 1) {
        setSelectedClient(data.clients[0]);
        setStep('loans');
      } else if (data.clients?.length > 1) {
        setStep('search');
      } else {
        setStep('search');
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = selectedClient
    ? loans.filter(
        (l) =>
          l.client_id === selectedClient.id &&
          (l.source_city === selectedClient.source_city || (!l.source_city && !selectedClient.source_city))
      )
    : loans;

  const selectClient = (c: ClientWithCity) => {
    setSelectedClient(c);
    setStep('loans');
  };

  const startPayment = async (loan: Loan, type: 'interest_renewal' | 'full_settlement') => {
    const loanCity = loan.source_city || city;
    if (!loanCity) return;
    setLoading(true);
    setSelectedLoan(loan);
    setPaymentType(type);
    try {
      const res = await fetch('/api/public/create-payment-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: loan.id,
          payment_type: type,
          client_identifier: selectedClient?.cpf || selectedClient?.id,
          city: loanCity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar PIX');
      setPixData(data);
      setStep('payment');
      setUploadSuccess(false);
      setClientNote('');
      setUseCustomPixImage(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyPix = () => {
    if (pixData?.pix_payload) {
      navigator.clipboard.writeText(pixData.pix_payload);
      alert('PIX Copia e Cola copiado!');
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pixData?.payment_request_id) return;
    setPendingFile(file);
    setShowUploadModal(true);
    e.target.value = '';
  };

  const submitReceipt = async () => {
    if (!pendingFile || !pixData?.payment_request_id) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('payment_request_id', pixData.payment_request_id);
      fd.append('file', pendingFile);
      if (clientNote.trim()) fd.append('client_note', clientNote.trim());
      const res = await fetch('/api/public/upload-receipt', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      setUploadSuccess(true);
      setShowUploadModal(false);
      setPendingFile(null);
      setClientNote('');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  const formatDate = (d: string) => formatDateBR(d);
  const maskCPF = (c?: string) => {
    if (!c) return '';
    const digits = c.replace(/\D/g, '');
    if (digits.length >= 11) return digits.replace(/(\d{3})\d{6}(\d{2})/, '$1.***.***-$2');
    return c;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white py-4 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo
            fallback={<h1 className="text-xl font-bold tracking-tight">NEXUS PAGAMENTOS</h1>}
            label={<h1 className="text-xl font-bold tracking-tight">NEXUS PAGAMENTOS</h1>}
            height={56}
          />
          {city && step !== 'city' && (
            <span className="text-sm text-slate-300">{CITY_LABELS[city]}</span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {step === 'city' && (
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Em qual cidade você reside?</h2>
            <p className="text-slate-600 mb-6">
              Selecione sua cidade para acessar os dados do seu empréstimo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => selectCity(c)}
                  className={`px-4 py-3 rounded-lg font-medium text-left transition ${
                    c === 'outro'
                      ? 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  {CITY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'search' && city && (
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
              <button onClick={() => setStep('city')} className="text-sky-600 hover:underline">
                ← Trocar cidade
              </button>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Consultar pagamentos</h2>
            <p className="text-slate-600 mb-6">
              Digite seu CPF ou Nome Completo para buscar seus empréstimos ativos.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="CPF ou Nome Completo"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
              <button
                onClick={search}
                disabled={loading}
                className="px-6 py-3 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 disabled:opacity-60"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {clients.length > 1 && (
              <div className="mt-6">
                <p className="text-sm text-slate-600 mb-2">Selecione o cliente:</p>
                <ul className="space-y-2">
                  {clients.map((c) => (
                    <li key={`${c.id}-${(c as ClientWithCity).source_city || ''}`}>
                      <button
                        onClick={() => selectClient(c as ClientWithCity)}
                        className="block w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50"
                      >
                        {c.name} {c.cpf && `(${maskCPF(c.cpf)})`}
                        {(c as ClientWithCity).source_city && city === 'outro' && (
                          <span className="text-slate-500 text-sm ml-1">
                            • {CITY_LABELS[(c as ClientWithCity).source_city as CityKey]}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {clients.length === 0 && query && !loading && (
              <p className="mt-4 text-amber-600">Nenhum cliente encontrado.</p>
            )}
          </div>
        )}

        {step === 'loans' && selectedClient && city && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-600">
              <button onClick={() => setStep('search')} className="text-sky-600 hover:underline">
                ← Voltar
              </button>
              <span>|</span>
              <span>
                {selectedClient.name} {selectedClient.cpf && maskCPF(selectedClient.cpf)}
                {selectedClient.source_city && city === 'outro' && (
                  <span className="text-slate-500"> • {CITY_LABELS[selectedClient.source_city as CityKey]}</span>
                )}
              </span>
            </div>
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-6">Empréstimos ativos</h2>
              {filteredLoans.length === 0 ? (
                <p className="text-slate-600">Nenhum empréstimo ativo.</p>
              ) : (
                <div className="space-y-4">
                  {filteredLoans.map((loan) => {
                    const overdue = daysOverdue(loan.due_date);
                    return (
                      <div
                        key={`${loan.id}-${loan.source_city || ''}`}
                        className="border border-slate-200 rounded-lg p-4"
                      >
                        <div className="flex flex-wrap justify-between gap-2 mb-3">
                          <div>
                            <span className="text-slate-600">Vencimento:</span>{' '}
                            <span className={overdue > 0 ? 'text-red-600 font-medium' : ''}>
                              {formatDate(loan.due_date)}
                              {overdue > 0 && ` (${overdue} dias em atraso)`}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-600">Total:</span>{' '}
                            {formatCurrency(loan.total_amount)}
                          </div>
                        </div>
                        <div className="text-sm text-slate-600 mb-3">
                          Capital: {formatCurrency(loan.original_amount)} | Juros: {loan.interest_rate}%
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startPayment(loan, 'interest_renewal')}
                            disabled={loading}
                            className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-60"
                          >
                            Pagar somente juros (renovação)
                          </button>
                          <button
                            onClick={() => startPayment(loan, 'full_settlement')}
                            disabled={loading}
                            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                          >
                            Pagar capital + juros (quitação)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'payment' && pixData && city && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-slate-600">
              <button
                onClick={() => {
                  setStep('loans');
                  setPixData(null);
                }}
                className="text-sky-600 hover:underline"
              >
                ← Voltar
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-2">
                {paymentType === 'interest_renewal' ? 'Renovação (somente juros)' : 'Quitação completa'}
              </h2>
              <p className="text-2xl font-bold text-sky-600 mb-6">
                {formatCurrency(pixData.amount)}
              </p>
              <div className="flex flex-col items-center gap-4">
                {useCustomPixImage ? (
                  <img
                    src={pixImagePath}
                    alt="QR Code PIX"
                    className="w-64 h-64 border border-slate-200 rounded-lg object-contain bg-white"
                  />
                ) : (
                  <>
                    <img
                      src={pixImagePath}
                      alt=""
                      className="hidden"
                      onLoad={() => setUseCustomPixImage(true)}
                      onError={() => setUseCustomPixImage(false)}
                    />
                    <img
                      src={pixData.qr_png_base64}
                      alt="QR Code PIX - Escaneie para pagar"
                      className="w-64 h-64 border border-slate-200 rounded-lg"
                    />
                  </>
                )}
                <button
                  onClick={copyPix}
                  className="px-6 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700"
                >
                  Copiar PIX Copia e Cola
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="font-medium text-slate-800 mb-2">Enviar comprovante</h3>
                <p className="text-sm text-slate-600 mb-3">
                  Após realizar o pagamento PIX, anexe o comprovante (foto ou PDF) abaixo.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={onFileSelect}
                  disabled={uploading || uploadSuccess}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                />
                {uploadSuccess && (
                  <p className="mt-2 text-emerald-600 font-medium">Comprovante enviado! Aguarde aprovação.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-slate-800 mb-2">Confirmar pagamento</h3>
            <p className="text-sm text-slate-600 mb-4">
              Adicione uma mensagem confirmando o pagamento (opcional). Essa colinha ajuda na análise do comprovante.
            </p>
            <textarea
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
              placeholder="Ex: Pago via PIX às 14h. Código da transação: xxx"
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4 resize-none"
            />
            {pendingFile && (
              <p className="text-sm text-slate-600 mb-4">
                Arquivo: {pendingFile.name}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setPendingFile(null);
                  setClientNote('');
                }}
                className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={submitReceipt}
                disabled={uploading}
                className="flex-1 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
              >
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
