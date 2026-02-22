'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#0ea5e9', '#22c55e'];

type DashboardData = {
  recebidosPorDia: { date: string; value: number }[];
  recebidosPorMes: { month: string; value: number }[];
  tiposPagamento: { name: string; value: number; percent: number }[];
  pendentesAbertas: number;
  tempoMedioAprovacao: number;
  saude: {
    loansAtivosVencidos: number;
    taxaRenovacaoMes: number;
    valorRecebidoMes: number;
    totalEsperado: number;
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin/login';
      return;
    }
    fetch('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) return <div className="text-slate-600">Carregando...</div>;
  if (!data) return <div className="text-red-600">Erro ao carregar dados.</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-600">Pendências abertas</p>
          <p className="text-2xl font-bold text-amber-600">{data.pendentesAbertas}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-600">Empréstimos vencidos</p>
          <p className="text-2xl font-bold text-red-600">{data.saude.loansAtivosVencidos}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-600">Tempo médio aprovação</p>
          <p className="text-2xl font-bold text-slate-800">{data.tempoMedioAprovacao}h</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-slate-600">Valor recebido (mês)</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.saude.valorRecebidoMes)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Recebidos por dia (30 dias)</h2>
          {data.recebidosPorDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.recebidosPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Valor']} />
                <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 py-8 text-center">Sem dados</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Recebidos por mês (12 meses)</h2>
          {data.recebidosPorMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.recebidosPorMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Valor']} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 py-8 text-center">Sem dados</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Tipos de pagamento (%)</h2>
          {data.tiposPagamento.some((t) => t.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.tiposPagamento}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {data.tiposPagamento.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [`${v}`, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 py-8 text-center">Sem dados</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Saúde da operação</h2>
          <ul className="space-y-2 text-slate-700">
            <li>Taxa de renovação (mês): <strong>{data.saude.taxaRenovacaoMes.toFixed(1)}%</strong></li>
            <li>Valor recebido (mês): <strong>{formatCurrency(data.saude.valorRecebidoMes)}</strong></li>
            <li>Total esperado (ativos): <strong>{formatCurrency(data.saude.totalEsperado)}</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
