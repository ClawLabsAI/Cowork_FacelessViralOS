'use client';

import { useEffect, useState } from 'react';
import { listJobs } from '@/lib/api';

export default function CostsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => { listJobs().then(setJobs).catch(() => {}); }, []);

  const completed = jobs.filter(j => j.status === 'completed').length;
  const totalCost = completed * 0.08;
  const budget = 25;
  const pct = Math.min((totalCost / budget) * 100, 100);

  const breakdown = [
    { service: 'OpenAI GPT-4o-mini', usage: `${completed} scripts`, cost: (completed * 0.02).toFixed(4), icon: '🤖' },
    { service: 'edge-tts (Microsoft)', usage: `${completed} audio files`, cost: '0.0000', icon: '🎙️' },
    { service: 'Pexels Stock Clips', usage: `${completed * 5} clips`, cost: '0.0000', icon: '🎞️' },
    { service: 'MoviePy / FFmpeg', usage: `${completed} renders`, cost: (completed * 0.06).toFixed(4), icon: '⚙️' },
  ];

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">💰 Cost Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Track AI and production costs in real-time</p>
      </div>

      {/* Monthly budget */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-medium">Monthly Budget</span>
          <span className="text-white font-bold">${totalCost.toFixed(2)} / ${budget}.00</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
          <div className={`h-3 rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-gray-400">{pct.toFixed(1)}% used · ${(budget - totalCost).toFixed(2)} remaining</div>
      </div>

      {/* Cost per tier */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Cost Per Video By Tier</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { tier: 'ECONOMICAL', cost: '$0.02–0.05', model: 'GPT-4o-mini + edge-tts', color: 'green' },
          { tier: 'OPTIMIZED',  cost: '$0.08–0.15', model: 'GPT-4o + ElevenLabs',   color: 'yellow' },
          { tier: 'PREMIUM',    cost: '$0.25–0.50', model: 'Claude + ElevenLabs HD', color: 'violet' },
        ].map(t => (
          <div key={t.tier} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className={`text-xs font-bold mb-1 ${
              t.color === 'green' ? 'text-green-400' : t.color === 'yellow' ? 'text-yellow-400' : 'text-violet-400'
            }`}>{t.tier}</div>
            <div className="text-white font-bold text-lg">{t.cost}</div>
            <div className="text-gray-500 text-xs mt-1">{t.model}</div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Cost Breakdown This Month</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {breakdown.map((row, i) => (
          <div key={row.service} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-800' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="text-lg">{row.icon}</span>
              <div>
                <div className="text-white text-sm">{row.service}</div>
                <div className="text-gray-500 text-xs">{row.usage}</div>
              </div>
            </div>
            <div className="text-white font-mono text-sm">${row.cost}</div>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 bg-gray-800/50">
          <span className="text-white font-semibold text-sm">Total</span>
          <span className="text-white font-bold font-mono">${totalCost.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}
