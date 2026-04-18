'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateScript } from '@/lib/api';

const CHANNEL_ID = 'seed-channel-001';

const FORMATS = ['listicle', 'story', 'tutorial', 'review', 'explainer'];
const TONES = ['informative', 'casual', 'energetic', 'professional', 'motivational'];
const TIERS = ['ECONOMICAL', 'OPTIMIZED', 'PREMIUM'];
const DURATIONS = [
  { label: '60s (Short)', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('listicle');
  const [tone, setTone] = useState('informative');
  const [tier, setTier] = useState('ECONOMICAL');
  const [duration, setDuration] = useState(300);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ scriptId: string; estimatedCostUsd: number } | null>(null);
  const [error, setError] = useState('');

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await generateScript({
        channelId: CHANNEL_ID,
        topic,
        format,
        tone,
        tier,
        targetDurationSeconds: duration,
        language,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-gray-400 mt-1">Channel: <span className="text-violet-400 font-medium">Wealth Simplified</span></p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Channel', value: 'Wealth Simplified', sub: 'YouTube' },
          { label: 'Tier', value: 'ECONOMICAL', sub: '< $0.50 / script' },
          { label: 'Status', value: 'Active', sub: 'Phase 1' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs mb-1">{stat.label}</div>
            <div className="text-white font-semibold">{stat.value}</div>
            <div className="text-gray-500 text-xs mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Script Generator */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Generate Script</h2>

        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. 5 formas de invertir con $100 en 2026"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Row: Format + Tone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tone</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Duration + Tier + Language */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tier</label>
              <select
                value={tier}
                onChange={e => setTier(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="bg-violet-900/20 border border-violet-800 rounded-lg px-4 py-4">
              <div className="text-violet-300 font-medium text-sm mb-1">✓ Script queued successfully</div>
              <div className="text-gray-400 text-xs">ID: {result.scriptId}</div>
              <div className="text-gray-400 text-xs">Estimated cost: ${result.estimatedCostUsd.toFixed(4)}</div>
              <button
                type="button"
                onClick={() => router.push('/dashboard/scripts')}
                className="mt-3 text-violet-400 text-xs hover:text-violet-300 underline"
              >
                View in Scripts →
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Script'}
          </button>
        </form>
      </div>
    </div>
  );
}
