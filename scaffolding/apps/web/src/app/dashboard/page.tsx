'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiHealth, getVideoEngineHealth, listJobs } from '@/lib/api';
import { getChannels, type Channel } from '@/lib/channels';

export default function DashboardPage() {
  const router = useRouter();
  const [apiStatus, setApiStatus] = useState('checking...');
  const [videoStatus, setVideoStatus] = useState('checking...');
  const [jobs, setJobs] = useState<any[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    getApiHealth().then(d => setApiStatus(d.status ?? 'unknown')).catch(() => setApiStatus('offline'));
    getVideoEngineHealth().then(d => setVideoStatus(d.status ?? 'unknown')).catch(() => setVideoStatus('offline'));
    listJobs().then(setJobs).catch(() => setJobs([]));
    setChannels(getChannels());
  }, []);

  const completed = jobs.filter(j => j.status === 'completed').length;
  const running = jobs.filter(j => !['completed', 'failed'].includes(j.status)).length;
  const activeChannels = channels.filter(c => c.status === 'Active').length;
  const totalCost = completed * 0.03;

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Faceless Viral OS · Private Operator Console</p>
        </div>
        <div className="flex gap-2">
          {[{ l: 'API', s: apiStatus }, { l: 'Video Engine', s: videoStatus }].map(({ l, s }) => (
            <span key={l} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              s === 'ok' ? 'bg-green-950 border-green-800 text-green-400' :
              s === 'checking...' ? 'bg-gray-900 border-gray-700 text-gray-500' :
              'bg-red-950 border-red-800 text-red-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s === 'ok' ? 'bg-green-400 animate-pulse' : s === 'checking...' ? 'bg-gray-600' : 'bg-red-400'}`} />
              {l}: {s}
            </span>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: '📺', value: activeChannels, label: 'Active Channels',    href: '/dashboard/channels',  color: 'violet' },
          { icon: '🎬', value: completed,      label: 'Videos Generated',    href: '/dashboard/analytics', color: 'green' },
          { icon: '⚡', value: running,         label: 'Generating Now',      href: '/dashboard/pipeline',  color: 'yellow' },
          { icon: '💸', value: `$${totalCost.toFixed(2)}`, label: 'Est. Cost This Month', href: '/dashboard/tiers', color: 'gray' },
        ].map(s => (
          <Link href={s.href} key={s.label}>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-violet-700 transition-colors cursor-pointer">
              <div className="text-xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Channels overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Channels</h2>
          <Link href="/dashboard/channels" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all →</Link>
        </div>
        {channels.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">📺</div>
            <div className="text-white font-medium mb-1 text-sm">No channels yet</div>
            <div className="text-gray-400 text-xs mb-4">Create your first channel to start the content machine.</div>
            <button onClick={() => router.push('/dashboard/channels')}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              + Create First Channel
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {channels.slice(0, 3).map(ch => (
              <div key={ch.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{ch.platforms[0] === 'YouTube' ? '▶️' : ch.platforms[0] === 'TikTok' ? '🎵' : '📸'}</span>
                    <span className="text-white text-sm font-medium">{ch.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                      ch.status === 'Active' ? 'bg-green-900/30 text-green-400 border-green-800'
                      : ch.status === 'Paused' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                      : 'bg-gray-800 text-gray-500 border-gray-700'
                    }`}>{ch.status}</span>
                    {ch.autopilot && <span className="text-xs text-violet-400">🤖</span>}
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">{ch.niche} · {ch.tier} · {ch.pipeline}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/dashboard/pipeline?channel=${ch.id}`)}
                    className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors">
                    🎬 Generate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: '📺', label: 'New Channel',       desc: '6 creation modes',                   href: '/dashboard/channels' },
          { icon: '🎬', label: 'Video Pipeline',    desc: 'Generate content for a channel',      href: '/dashboard/pipeline' },
          { icon: '🚀', label: 'Publish Queue',      desc: 'Review and publish ready videos',     href: '/dashboard/publish' },
          { icon: '📊', label: 'Analytics',          desc: 'Production metrics overview',         href: '/dashboard/analytics' },
          { icon: '⚡', label: 'Tiers & Cost',       desc: 'Manage generation budget',            href: '/dashboard/tiers' },
          { icon: '⚙️', label: 'Settings',          desc: 'API keys and platform connections',   href: '/dashboard/settings' },
        ].map(a => (
          <Link href={a.href} key={a.label}>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-violet-600 hover:bg-gray-800/50 transition-all cursor-pointer">
              <span className="text-xl block mb-2">{a.icon}</span>
              <div className="text-white font-medium text-sm">{a.label}</div>
              <div className="text-gray-500 text-xs mt-0.5">{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent jobs */}
      {jobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Videos</h2>
            <Link href="/dashboard/analytics" className="text-xs text-violet-400 hover:text-violet-300">View all →</Link>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {jobs.slice(0, 5).map((job, i) => (
              <div key={job.job_id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-800' : ''}`}>
                <span className="text-sm text-white truncate max-w-sm">{job.topic}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  job.status === 'completed' ? 'bg-green-900/30 text-green-400 border-green-800' :
                  job.status === 'failed' ? 'bg-red-900/30 text-red-400 border-red-800' :
                  'bg-violet-900/30 text-violet-400 border-violet-800'
                }`}>{job.status === 'completed' ? '✓ done' : job.status === 'failed' ? '✗ failed' : `${job.progress ?? 0}%`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup checklist if new user */}
      {channels.length === 0 && (
        <div className="mt-8 bg-violet-900/10 border border-violet-800 rounded-2xl p-5">
          <div className="text-white font-semibold mb-3">🚀 Getting Started</div>
          <div className="space-y-2">
            {[
              { step: '1. Add API keys', desc: 'OpenAI key required for script generation', href: '/dashboard/settings', done: false },
              { step: '2. Create a channel', desc: 'Choose niche, voice, tier, and pipeline', href: '/dashboard/channels', done: false },
              { step: '3. Generate first video', desc: 'AI picks a topic and produces a video', href: '/dashboard/pipeline', done: completed > 0 },
              { step: '4. Publish to YouTube', desc: 'Connect OAuth and publish directly', href: '/dashboard/publish', done: false },
            ].map(s => (
              <div key={s.step} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                  s.done ? 'bg-green-700 border-green-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-600'
                }`}>{s.done ? '✓' : '·'}</div>
                <div className="flex-1">
                  <Link href={s.href} className={`text-sm font-medium hover:text-violet-300 transition-colors ${s.done ? 'text-green-400 line-through' : 'text-white'}`}>
                    {s.step}
                  </Link>
                  <div className="text-gray-500 text-xs">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
