'use client';

import { useState } from 'react';

const SEED_NICHES = [
  { name: 'Personal Finance', score: 94, competition: 'Medium', cpm: '$12-18', trend: '↑ Rising', tags: ['investing', 'budgeting', 'crypto'] },
  { name: 'AI & Technology',  score: 91, competition: 'High',   cpm: '$8-14',  trend: '↑ Hot',    tags: ['chatgpt', 'automation', 'tools'] },
  { name: 'Health & Wellness',score: 88, competition: 'High',   cpm: '$10-20', trend: '→ Stable', tags: ['fitness', 'diet', 'mental health'] },
  { name: 'True Crime',       score: 85, competition: 'Medium', cpm: '$6-10',  trend: '→ Stable', tags: ['mystery', 'documentary'] },
  { name: 'Productivity',     score: 83, competition: 'Low',    cpm: '$9-15',  trend: '↑ Rising', tags: ['habits', 'systems', 'focus'] },
  { name: 'History & Facts',  score: 80, competition: 'Low',    cpm: '$5-9',   trend: '→ Stable', tags: ['facts', 'stories', 'education'] },
  { name: 'Motivation',       score: 78, competition: 'High',   cpm: '$4-8',   trend: '↓ Falling',tags: ['mindset', 'success'] },
  { name: 'DIY & How-to',     score: 76, competition: 'Medium', cpm: '$7-12',  trend: '→ Stable', tags: ['tutorials', 'crafts', 'home'] },
];

export default function NichesPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = SEED_NICHES.filter(n =>
    n.name.toLowerCase().includes(query.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🎯 Niche Radar</h1>
        <p className="text-gray-400 text-sm mt-1">Discover and evaluate profitable content niches</p>
      </div>

      <div className="flex gap-3 mb-6">
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search niches or tags..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
        <button className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(niche => (
          <div key={niche.name}
            onClick={() => setSelected(selected === niche.name ? null : niche.name)}
            className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all ${
              selected === niche.name ? 'border-violet-500 bg-violet-900/10' : 'border-gray-800 hover:border-gray-700'
            }`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-white font-semibold">{niche.name}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {niche.tags.map(t => (
                    <span key={t} className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">#{t}</span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${niche.score >= 90 ? 'text-green-400' : niche.score >= 80 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {niche.score}
                </div>
                <div className="text-xs text-gray-500">score</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-800 rounded p-2 text-center">
                <div className="text-gray-400">Competition</div>
                <div className={`font-medium mt-0.5 ${
                  niche.competition === 'Low' ? 'text-green-400' :
                  niche.competition === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                }`}>{niche.competition}</div>
              </div>
              <div className="bg-gray-800 rounded p-2 text-center">
                <div className="text-gray-400">CPM</div>
                <div className="text-white font-medium mt-0.5">{niche.cpm}</div>
              </div>
              <div className="bg-gray-800 rounded p-2 text-center">
                <div className="text-gray-400">Trend</div>
                <div className={`font-medium mt-0.5 ${
                  niche.trend.startsWith('↑') ? 'text-green-400' :
                  niche.trend.startsWith('↓') ? 'text-red-400' : 'text-gray-300'
                }`}>{niche.trend}</div>
              </div>
            </div>

            {selected === niche.name && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <a href={`/dashboard/studio?niche=${encodeURIComponent(niche.name)}`}
                  className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  🎬 Generate Video for this Niche
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
