'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApiHealth, getVideoEngineHealth, listJobs } from '@/lib/api';

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState('checking...');
  const [videoStatus, setVideoStatus] = useState('checking...');
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    getApiHealth().then(d => setApiStatus(d.status ?? 'unknown')).catch(() => setApiStatus('offline'));
    getVideoEngineHealth().then(d => setVideoStatus(d.status ?? 'unknown')).catch(() => setVideoStatus('offline'));
    listJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  const completed = jobs.filter(j => j.status === 'completed').length;
  const running = jobs.filter(j => !['completed','failed'].includes(j.status)).length;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Faceless Viral OS · Private Operator Console</p>
      </div>

      {/* Status pills */}
      <div className="flex gap-3 mb-8">
        {[{ l: 'API', s: apiStatus }, { l: 'Video Engine', s: videoStatus }].map(({ l, s }) => (
          <span key={l} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            s === 'ok' ? 'bg-green-950 border-green-800 text-green-400' :
            s === 'checking...' ? 'bg-gray-900 border-gray-700 text-gray-500' :
            'bg-red-950 border-red-800 text-red-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s === 'ok' ? 'bg-green-400' : s === 'checking...' ? 'bg-gray-600' : 'bg-red-400'}`} />
            {l}: {s}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: '🎬', value: completed, label: 'Videos Generated', href: '/dashboard/videos' },
          { icon: '⚡', value: running,   label: 'In Progress',       href: '/dashboard/videos' },
          { icon: '📺', value: 1,          label: 'Active Channels',   href: '/dashboard/channels' },
          { icon: '💰', value: `$${(completed * 0.08).toFixed(2)}`, label: 'Est. Cost This Month', href: '/dashboard/costs' },
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

      {/* Quick Actions */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { icon: '🎬', label: 'Generate Video',      desc: 'Create a new faceless video with AI + stock clips',    href: '/dashboard/studio' },
          { icon: '🎯', label: 'Discover Niches',     desc: 'Find profitable content niches with AI research',       href: '/dashboard/niches' },
          { icon: '🔍', label: 'Analyze Competitor',  desc: 'Reverse engineer what makes channels successful',       href: '/dashboard/competitors' },
          { icon: '🤖', label: 'Set up Autopilot',    desc: 'Schedule automatic video generation and publishing',    href: '/dashboard/autopilot' },
        ].map(a => (
          <Link href={a.href} key={a.label}>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-violet-600 hover:bg-gray-800/60 transition-all flex gap-3">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <div className="text-white font-medium text-sm">{a.label}</div>
                <div className="text-gray-500 text-xs mt-0.5">{a.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent jobs */}
      {jobs.length > 0 && (
        <>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Jobs</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {jobs.slice(0, 6).map((job, i) => (
              <div key={job.job_id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-800' : ''}`}>
                <span className="text-sm text-white truncate max-w-sm">{job.topic}</span>
                <span className={`text-xs px-2 py-0.5 rounded border ${
                  job.status === 'completed' ? 'bg-green-900/40 text-green-400 border-green-800' :
                  job.status === 'failed' ? 'bg-red-900/40 text-red-400 border-red-800' :
                  'bg-violet-900/40 text-violet-400 border-violet-800'
                }`}>{job.status === 'completed' ? '✓ done' : job.status === 'failed' ? '✗ failed' : `${job.progress ?? 0}%`}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
