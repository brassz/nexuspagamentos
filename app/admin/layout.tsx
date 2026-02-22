'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const logout = () => {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
    router.refresh();
  };

  const nav = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/pendentes', label: 'Pendentes' },
    { href: '/admin/pagamentos', label: 'Pagamentos' },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white py-4 px-6 shadow">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Logo
              fallback={<span className="font-bold">NEXUS Admin</span>}
              label={<span className="font-bold">NEXUS Admin</span>}
              height={48}
            />
          </Link>
          <nav className="flex gap-4">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={pathname === n.href ? 'text-sky-300' : 'text-slate-300 hover:text-white'}
              >
                {n.label}
              </Link>
            ))}
            <button onClick={logout} className="text-slate-400 hover:text-white text-sm">
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
