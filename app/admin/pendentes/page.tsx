'use client';

import { useEffect, useState } from 'react';
import { CITY_LABELS } from '@/lib/cities';

type Receipt = { id: string; file_path: string; mime_type?: string };
type Pending = {
  id: string;
  loan_id: string;
  client_identifier?: string;
  client_name?: string | null;
  client_cpf?: string | null;
  city?: string | null;
  client_note?: string | null;
  amount: number;
  payment_type: string;
  created_at: string;
  receipts: Receipt[];
};

export default function PendentesPage() {
  const [list, setList] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsPdf, setPreviewIsPdf] = useState(false);

  const load = () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    fetch('/api/admin/pending', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setList(d.pending || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const approve = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({ payment_request_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActing(null);
    }
  };

  const openReject = (id: string) => setRejectModal({ id, reason: '' });

  const reject = async () => {
    if (!rejectModal?.id || !rejectModal.reason.trim()) {
      alert('Informe o motivo da rejeição.');
      return;
    }
    setActing(rejectModal.id);
    try {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({
          payment_request_id: rejectModal.id,
          reason: rejectModal.reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      setRejectModal(null);
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActing(null);
    }
  };

  const viewReceipt = async (filePath: string, mimeType?: string) => {
    try {
      const res = await fetch('/api/admin/receipt-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({ file_path: filePath }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setPreviewUrl(data.url);
        setPreviewIsPdf(mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf'));
      } else {
        alert('Erro ao carregar comprovante.');
      }
    } catch {
      alert('Erro ao carregar comprovante.');
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const formatDate = (d: string) => new Date(d).toLocaleString('pt-BR');

  if (loading) return <div className="text-slate-600">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Pendentes</h1>

      {list.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
          Nenhuma pendência no momento.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((p) => (
            <div key={p.id} className="bg-white rounded-lg shadow p-6 flex flex-wrap gap-4 items-start justify-between">
              <div>
                <p className="font-medium text-slate-800">
                  {formatCurrency(p.amount)} • {p.payment_type === 'interest_renewal' ? 'Renovação' : 'Quitação'}
                </p>
                <p className="text-sm text-slate-600">
                  {p.client_name || 'Cliente'} {p.client_cpf ? `• CPF: ${p.client_cpf}` : ''}
                </p>
                <p className="text-sm text-slate-500">
                  {formatDate(p.created_at)}
                  {p.city && ` • ${CITY_LABELS[p.city as keyof typeof CITY_LABELS] || p.city}`}
                </p>
                {p.client_note && (
                  <p className="text-sm text-slate-600 mt-1 italic">Colinha: {p.client_note}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {p.receipts?.length ? (
                  <button
                    onClick={() => viewReceipt(p.receipts[0].file_path, p.receipts[0].mime_type)}
                    className="px-4 py-2 bg-sky-600 text-white font-medium rounded-lg hover:bg-sky-700 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    Ver comprovante
                  </button>
                ) : (
                  <span className="px-4 py-2 text-amber-600 text-sm bg-amber-50 rounded-lg">Sem comprovante</span>
                )}

                <button
                  onClick={() => approve(p.id)}
                  disabled={!!acting}
                  className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                >
                  {acting === p.id ? 'Processando...' : 'DAR BAIXA'}
                </button>
                <button
                  onClick={() => openReject(p.id)}
                  disabled={!!acting}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-slate-800 mb-2">Motivo da rejeição</h3>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="Informe o motivo..."
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={reject}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => { setPreviewUrl(null); setPreviewIsPdf(false); }}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {previewIsPdf ? (
              <iframe src={previewUrl} className="w-full h-[80vh] bg-white rounded" title="Comprovante" />
            ) : (
              <img src={previewUrl} alt="Comprovante" className="max-w-full max-h-[80vh] rounded" />
            )}
            <button
              onClick={() => { setPreviewUrl(null); setPreviewIsPdf(false); }}
              className="mt-2 w-full py-2 bg-slate-700 text-white rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
