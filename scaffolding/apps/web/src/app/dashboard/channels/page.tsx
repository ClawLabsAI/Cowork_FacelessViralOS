'use client';

import { useState } from 'react';

const CHANNELS = [
  { id: '1', name: 'Wealth Simplified', platform: 'YouTube', niche: 'Personal Finance', language: 'English', status: 'Active', videos: 0, subs: 0 },
];

export default function ChannelsPage() {
  const [channels] = useState(CHANNELS);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNiche, setNewNiche] = useState('finance');
  const [newLang, setNewLang] = useState('English');
  const [newPlatform, setNewPlatform] = useState('YouTube');

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📺 Channels</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your faceless channel portfolio</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Add Channel
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-900 border border-violet-700 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">New Channel</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Channel Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Money Moves Daily"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Platform</label>
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option>YouTube</option><option>TikTok</option><option>Instagram</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Niche</label>
              <input value={newNiche} onChange={e => setNewNiche(e.target.value)}
                placeholder="Personal finance, tech, etc."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Language</label>
              <select value={newLang} onChange={e => setNewLang(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option>English</option><option>Spanish</option>
              </select>
            </div>
          </div>
          <button className="mt-4 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Create Channel
          </button>
        </div>
      )}

      <div className="space-y-3">
        {channels.map(ch => (
          <div key={ch.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ch.platform === 'YouTube' ? '▶️' : ch.platform === 'TikTok' ? '🎵' : '📸'}</span>
                  <span className="text-white font-semibold">{ch.name}</span>
                  <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">{ch.status}</span>
                </div>
                <div className="text-gray-400 text-xs mt-1">{ch.platform} · {ch.niche} · {ch.language}</div>
              </div>
              <div className="flex gap-2">
                <a href="/dashboard/studio" className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                  Generate Video
                </a>
                <a href="/dashboard/autopilot" className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                  Autopilot
                </a>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { l: 'Videos', v: ch.videos },
                { l: 'Subscribers', v: ch.subs.toLocaleString() },
                { l: 'Monthly Budget', v: '$25.00' },
              ].map(s => (
                <div key={s.l} className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{s.v}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
