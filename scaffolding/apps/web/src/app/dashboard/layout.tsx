'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { section: 'OVERVIEW',    items: [
    { href: '/dashboard',              label: 'Dashboard',     icon: '⬡' },
  ]},
  { section: 'RESEARCH',    items: [
    { href: '/dashboard/niches',       label: 'Niche Radar',   icon: '🎯' },
    { href: '/dashboard/competitors',  label: 'Competitors',   icon: '🔍' },
  ]},
  { section: 'PRODUCTION',  items: [
    { href: '/dashboard/studio',       label: 'Video Studio',  icon: '🎬' },
    { href: '/dashboard/videos',       label: 'My Videos',     icon: '📹' },
    { href: '/dashboard/publish',      label: 'Publish Queue', icon: '🚀' },
  ]},
  { section: 'CHANNELS',    items: [
    { href: '/dashboard/channels',     label: 'Channels',      icon: '📺' },
    { href: '/dashboard/autopilot',    label: 'Autopilot',     icon: '🤖' },
  ]},
  { section: 'ANALYTICS',   items: [
    { href: '/dashboard/analytics',    label: 'Analytics',     icon: '📊' },
    { href: '/dashboard/costs',        label: 'Costs',         icon: '💰' },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold">F</div>
            <div>
              <div className="text-white text-sm font-bold">Faceless OS</div>
              <div className="text-violet-400 text-xs">Phase 1 · Private</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
          {nav.map(group => (
            <div key={group.section}>
              <div className="px-3 mb-1 text-xs font-semibold text-gray-500 tracking-wider">{group.section}</div>
              {group.items.map(item => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                      active ? 'bg-violet-600/20 text-violet-300 font-medium' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}>
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-gray-800 text-xs text-gray-600 text-center">
          Faceless Viral OS v1.0
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-950">
        {children}
      </main>
    </div>
  );
}
