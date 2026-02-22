'use client';

import { useEffect, useState } from 'react';
import { CITY_LABELS } from '@/lib/cities';

type Payment = {
  id: string;
  loan_id: string;
  amount: string;
  payment_date: string;
  payment_type: string;
  notes?: string;
  created_at: string;
  city?: string;
};

export default function PagamentosPage() {
  const [list, setList] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    fetch('/api/admin/payments-history', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setList(d.payments || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (v: string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const formatDateTime = (d: string) => new Date(d).toLocaleString('pt-BR');

  const typeLabel = (t: string) => (t === 'interest_renewal' ? 'Renovação' : 'Quitação');

  if (loading) return <div className="text-slate-600">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Histórico de pagamentos</h1>

      {list.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
          Nenhum pagamento registrado.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Cidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDateTime(p.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.city ? (CITY_LABELS[p.city as keyof typeof CITY_LABELS] || p.city) : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          p.payment_type === 'interest_renewal'
                            ? 'px-2 py-0.5 rounded bg-amber-100 text-amber-800'
                            : 'px-2 py-0.5 rounded bg-emerald-100 text-emerald-800'
                        }
                      >
                        {typeLabel(p.payment_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={p.notes}>{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
