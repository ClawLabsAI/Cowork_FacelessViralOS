'use client';

import { useEffect, useState } from 'react';
import { getChannels, type Channel } from '@/lib/channels';

const STREAMS = [
  {
    id: 'adsense',
    icon: '▶️',
    title: 'YouTube AdSense',
    desc: 'Requires 1,000 subscribers and 4,000 watch hours. RPM varies $1–$15 by niche.',
    avg: '$2–8 RPM',
    effort: 'Low',
    status: 'passive',
  },
  {
    id: 'tiktok',
    icon: '🎵',
    title: 'TikTok Creator Fund',
    desc: 'Low RPM but zero effort. Requires 10k followers and 100k views in 30 days.',
    avg: '$0.02–0.04/1k views',
    effort: 'Low',
    status: 'passive',
  },
  {
    id: 'affiliate',
    icon: '🔗',
    title: 'Affiliate Marketing',
    desc: 'Highest ROI for faceless channels. Link products in descriptions. Best niches: finance, health, tech.',
    avg: '$10–200/sale',
    effort: 'Medium',
    status: 'active',
  },
  {
    id: 'sponsors',
    icon: '🤝',
    title: 'Sponsored Content',
    desc: 'Once your channel reaches 5k–10k subs. $200–2000 per video depending on niche.',
    avg: '$200–2,000/video',
    effort: 'Medium',
    status: 'active',
  },
  {
    id: 'digital',
    icon: '📦',
    title: 'Digital Products',
    desc: 'Sell eBooks, courses, templates, or presets. Works best with established audience trust.',
    avg: '$20–200/sale',
    effort: 'High',
    status: 'active',
  },
  {
    id: 'newsletter',
    icon: '📧',
    title: 'Newsletter / Email List',
    desc: 'Build an email list from YouTube and monetize via tools like ConvertKit + affiliate offers.',
    avg: '$1–5/subscriber/mo',
    effort: 'Medium',
    status: 'compound',
  },
];

export default function MonetizePage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  useEffect(() => {
    setChannels(getChannels());
  }, []);

  const filtered = selectedChannel === 'all' ? channels : channels.filter(c => c.id === selectedChannel);

  const totalBudget = channels.reduce((sum, c) => sum + c.costLimit, 0);
  const totalVideos = channels.reduce((sum, c) => sum + c.videoCount, 0);
  const activeStreams = [...new Set(channels.flatMap(c => c.monetization))];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">💵 Monetize</h1>
        <p className="text-gray-400 text-sm mt-1">Revenue streams and channel profitability</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: '📺', label: 'Active Channels', value: channels.filter(c => c.status === 'Active').length },
          { icon: '🎬', label: 'Total Videos', value: totalVideos },
          { icon: '💸', label: 'Total Monthly Budget', value: `$${totalBudget}` },
          { icon: '💰', label: 'Revenue Streams', value: activeStreams.length },
        ].map(k => (
          <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xl mb-2">{k.icon}</div>
            <div className="text-2xl font-bold text-white">{k.value}</div>
            <div className="text-xs text-gray-400 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Channel selector */}
      {channels.length > 0 && (
        <div className="mb-6">
          <label className="text-xs text-gray-400 block mb-2">View by Channel</label>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSelectedChannel('all')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                selectedChannel === 'all'
                  ? 'bg-violet-600/20 border-violet-600 text-violet-300'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
              }`}>
              All Channels
            </button>
            {channels.map(ch => (
              <button key={ch.id} onClick={() => setSelectedChannel(ch.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  selectedChannel === ch.id
                    ? 'bg-violet-600/20 border-violet-600 text-violet-300'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                }`}>
                {ch.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Channel monetization status */}
      {filtered.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Channel Monetization</h2>
          <div className="space-y-3">
            {filtered.map(ch => (
              <div key={ch.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-white font-medium">{ch.name}</div>
                  <div className="text-xs text-gray-500">{ch.niche} · ${ch.costLimit}/mo budget</div>
                </div>
                {ch.monetization.length === 0 ? (
                  <div className="text-xs text-gray-600 italic">No monetization configured — go to Channel Settings → Monetize</div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {ch.monetization.map(m => (
                      <span key={m} className="text-xs bg-green-900/20 border border-green-800 text-green-400 px-2.5 py-1 rounded-lg">
                        ✓ {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue streams guide */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Revenue Streams</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {STREAMS.map(s => (
          <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl leading-none mt-0.5">{s.icon}</div>
              <div>
                <div className="text-white font-medium text-sm">{s.title}</div>
                <div className="text-gray-400 text-xs mt-0.5">{s.desc}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs bg-green-900/20 text-green-400 border border-green-800 px-2.5 py-1 rounded-lg font-mono">
                {s.avg}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-lg border ${
                s.effort === 'Low' ? 'bg-green-900/20 text-green-400 border-green-800'
                : s.effort === 'Medium' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-800'
                : 'bg-red-900/20 text-red-400 border-red-800'
              }`}>
                {s.effort} effort
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-lg border ${
                s.status === 'passive' ? 'bg-blue-900/20 text-blue-400 border-blue-800'
                : s.status === 'compound' ? 'bg-violet-900/20 text-violet-400 border-violet-800'
                : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {s.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ROI Calculator placeholder */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-medium mb-1">📈 ROI Calculator</div>
        <div className="text-gray-400 text-sm mb-4">Estimate break-even point based on your tier and target RPM.</div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'ECONOMICAL Tier', costPer: '$0.03', breakevenViews: '300 views @ $10 RPM', rpmNeeded: '$1 RPM' },
            { label: 'OPTIMIZED Tier', costPer: '$0.12', breakevenViews: '1,200 views @ $10 RPM', rpmNeeded: '$4 RPM' },
            { label: 'PREMIUM Tier', costPer: '$0.35', breakevenViews: '3,500 views @ $10 RPM', rpmNeeded: '$12 RPM' },
          ].map(r => (
            <div key={r.label} className="bg-gray-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-300 mb-3">{r.label}</div>
              <div className="text-xs text-gray-500 mb-1">Cost per video</div>
              <div className="text-green-400 font-mono text-lg font-bold mb-2">{r.costPer}</div>
              <div className="text-xs text-gray-500">Break-even:</div>
              <div className="text-gray-300 text-xs">{r.breakevenViews}</div>
              <div className="text-gray-500 text-xs mt-1">Min RPM needed: {r.rpmNeeded}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
