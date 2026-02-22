/**
 * Parseia datas YYYY-MM-DD (ou com timezone) como data local para evitar deslocamento de 1 dia.
 * new Date("2026-03-19") é interpretado como UTC midnight → no Brasil vira 18/03.
 */
export function parseDateLocal(d: string): Date {
  const str = typeof d === 'string' ? d.split('T')[0] : '';
  const [y, m, day] = str.split('-').map(Number);
  if (!y || !m || !day) return new Date(d); // fallback
  return new Date(y, m - 1, day);
}

export function formatDateBR(d: string): string {
  return parseDateLocal(d).toLocaleDateString('pt-BR');
}

export function daysOverdue(due: string): number {
  const today = new Date();
  const dueDate = parseDateLocal(due);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (dueDate >= todayStart) return 0;
  return Math.ceil((todayStart.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
}
