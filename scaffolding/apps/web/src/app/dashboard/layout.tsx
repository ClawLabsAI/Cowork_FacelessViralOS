'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  {
    section: 'CORE',
    items: [
      { href: '/dashboard',           label: 'Overview',    icon: '⬡' },
      { href: '/dashboard/channels',  label: 'Channels',    icon: '📺' },
      { href: '/dashboard/pipeline',  label: 'Pipeline',    icon: '🎬' },
    ],
  },
  {
    section: 'DISTRIBUTION',
    items: [
      { href: '/dashboard/publish',   label: 'Publish',     icon: '🚀' },
      { href: '/dashboard/analytics', label: 'Analytics',   icon: '📊' },
      { href: '/dashboard/monetize',  label: 'Monetize',    icon: '💵' },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      { href: '/dashboard/tiers',     label: 'Tiers & Cost', icon: '⚡' },
      { href: '/dashboard/settings',  label: 'Settings',    icon: '⚙️' },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm">F</div>
            <div>
              <div className="text-white text-sm font-bold leading-tight">Faceless OS</div>
              <div className="text-violet-400 text-xs">Phase 1 · Private</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-5">
          {nav.map(group => (
            <div key={group.section}>
              <div className="px-3 mb-1.5 text-[10px] font-bold text-gray-600 tracking-widest uppercase">{group.section}</div>
              {group.items.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                      active
                        ? 'bg-violet-600/20 text-violet-300 font-medium'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}>
                    <span className="text-base leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600">
          Faceless Viral OS v1.0
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-950">
        {children}
      </main>
    </div>
  );
}
