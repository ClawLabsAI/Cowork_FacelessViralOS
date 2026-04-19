'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getChannels, deleteChannel, type Channel } from '@/lib/channels';

const CREATION_MODES = [
  {
    id: 'ai',
    icon: '🤖',
    title: 'AI Suggestions',
    desc: 'Let AI recommend the best niches and channel strategy for you based on market trends.',
    color: 'violet',
  },
  {
    id: 'spy',
    icon: '🔍',
    title: 'SPY & Analyze',
    desc: 'Enter a competitor channel URL and reverse-engineer their format, hooks, and niche.',
    color: 'blue',
  },
  {
    id: 'scratch',
    icon: '✏️',
    title: 'From Scratch',
    desc: 'Full manual control. Define your niche, audience, voice, and content pillars yourself.',
    color: 'gray',
  },
  {
    id: 'tiktokshop',
    icon: '🛍️',
    title: 'TikTok Shop',
    desc: 'Template optimized for TikTok Shop affiliate content with product reviews and demos.',
    color: 'pink',
  },
  {
    id: 'clipping',
    icon: '✂️',
    title: 'Clipping Channel',
    desc: 'Repurpose long-form podcast and interview content into viral short clips.',
    color: 'orange',
  },
  {
    id: 'clone',
    icon: '⚡',
    title: 'Clone Channel',
    desc: 'Adapt a winning channel format into English or Spanish — original content, proven strategy.',
    color: 'green',
  },
];

const colorMap: Record<string, string> = {
  violet: 'border-violet-700 hover:border-violet-500 hover:bg-violet-900/10',
  blue:   'border-blue-700 hover:border-blue-500 hover:bg-blue-900/10',
  gray:   'border-gray-700 hover:border-gray-500 hover:bg-gray-800/60',
  pink:   'border-pink-700 hover:border-pink-500 hover:bg-pink-900/10',
  orange: 'border-orange-700 hover:border-orange-500 hover:bg-orange-900/10',
  green:  'border-green-700 hover:border-green-500 hover:bg-green-900/10',
};

const iconBg: Record<string, string> = {
  violet: 'bg-violet-900/40',
  blue:   'bg-blue-900/40',
  gray:   'bg-gray-800',
  pink:   'bg-pink-900/40',
  orange: 'bg-orange-900/40',
  green:  'bg-green-900/40',
};

export default function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    setChannels(getChannels());
  }, []);

  function handleDelete(id: string) {
    if (!confirm('Delete this channel?')) return;
    deleteChannel(id);
    setChannels(getChannels());
  }

  function handleMode(modeId: string) {
    router.push(`/dashboard/channels/new?mode=${modeId}`);
  }

  const platformIcon = (p: string) => p === 'YouTube' ? '▶️' : p === 'TikTok' ? '🎵' : '📸';

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📺 Channels</h1>
          <p className="text-gray-400 text-sm mt-1">Your faceless channel portfolio</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + New Channel
        </button>
      </div>

      {/* Creation mode picker */}
      {showNew && (
        <div className="mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-1">How do you want to create this channel?</h2>
          <p className="text-gray-400 text-sm mb-5">Choose a method — you can fine-tune everything in Channel Settings afterwards.</p>
          <div className="grid grid-cols-3 gap-3">
            {CREATION_MODES.map(m => (
              <button
                key={m.id}
                onClick={() => handleMode(m.id)}
                className={`text-left p-4 rounded-xl border bg-gray-950 transition-all ${colorMap[m.color]}`}
              >
                <div className={`w-10 h-10 rounded-lg ${iconBg[m.color]} flex items-center justify-center text-xl mb-3`}>
                  {m.icon}
                </div>
                <div className="text-white font-semibold text-sm mb-1">{m.title}</div>
                <div className="text-gray-400 text-xs leading-snug">{m.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setShowNew(false)} className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Channel list */}
      {channels.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl p-14 text-center">
          <div className="text-5xl mb-4">📺</div>
          <div className="text-white font-semibold mb-2">No channels yet</div>
          <div className="text-gray-400 text-sm mb-5">Create your first channel to start generating viral content.</div>
          <button
            onClick={() => setShowNew(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            + New Channel
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map(ch => (
            <div key={ch.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {ch.platforms.map(p => (
                      <span key={p} className="text-base leading-none">{platformIcon(p)}</span>
                    ))}
                    <span className="text-white font-semibold">{ch.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      ch.status === 'Active'
                        ? 'bg-green-900/30 text-green-400 border-green-800'
                        : ch.status === 'Paused'
                        ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>{ch.status}</span>
                    {ch.autopilot && (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-violet-900/30 text-violet-400 border-violet-800">🤖 Autopilot</span>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {ch.niche} · {ch.language} · {ch.contentType} · Tier: {ch.tier} · Pipeline: {ch.pipeline}
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">
                    {ch.videoCount} videos · Budget: ${ch.costLimit}/mo
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => router.push(`/dashboard/pipeline?channel=${ch.id}`)}
                    className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    🎬 Generate Video
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/channels/${ch.id}/settings`)}
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    onClick={() => handleDelete(ch.id)}
                    className="text-xs bg-gray-800 hover:bg-red-900/40 text-gray-500 hover:text-red-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
