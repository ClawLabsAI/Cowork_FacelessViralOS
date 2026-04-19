'use client';

import { useEffect, useState } from 'react';
import { listJobs } from '@/lib/api';

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => { listJobs().then(setJobs).catch(() => {}); }, []);

  const completed = jobs.filter(j => j.status === 'completed');
  const failed    = jobs.filter(j => j.status === 'failed');
  const totalCost = completed.length * 0.08;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">📊 Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Production metrics and performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { icon: '🎬', label: 'Videos Generated', value: completed.length, color: 'violet' },
          { icon: '✅', label: 'Success Rate',      value: jobs.length > 0 ? `${Math.round((completed.length/jobs.length)*100)}%` : 'N/A', color: 'green' },
          { icon: '💰', label: 'Total Cost',        value: `$${totalCost.toFixed(2)}`, color: 'yellow' },
          { icon: '📈', label: 'Avg Cost/Video',    value: completed.length > 0 ? `$${(totalCost/completed.length).toFixed(2)}` : 'N/A', color: 'blue' },
        ].map(k => (
          <div key={k.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xl mb-2">{k.icon}</div>
            <div className="text-2xl font-bold text-white">{k.value}</div>
            <div className="text-xs text-gray-400 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Video production table */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Production Log</h2>
      {jobs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          No videos generated yet. <a href="/dashboard/studio" className="text-violet-400 hover:underline">Generate your first video →</a>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-4 py-2 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
            <div>Topic</div><div>Status</div><div>Est. Cost</div><div>ID</div>
          </div>
          {jobs.map((job, i) => (
            <div key={job.job_id} className={`grid grid-cols-4 gap-4 px-4 py-3 text-sm ${i > 0 ? 'border-t border-gray-800' : ''}`}>
              <div className="text-white truncate">{job.topic}</div>
              <div className={`${job.status === 'completed' ? 'text-green-400' : job.status === 'failed' ? 'text-red-400' : 'text-violet-400'}`}>
                {job.status}
              </div>
              <div className="text-gray-300">{job.status === 'completed' ? '$0.08' : '—'}</div>
              <div className="text-gray-500 font-mono text-xs">{job.job_id.slice(0, 8)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Placeholder charts */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {['Views Over Time', 'Revenue Forecast'].map(title => (
          <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-white font-medium text-sm mb-4">{title}</div>
            <div className="h-32 flex items-center justify-center text-gray-600 text-xs border border-dashed border-gray-700 rounded-lg">
              Connect YouTube API to see real data
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
