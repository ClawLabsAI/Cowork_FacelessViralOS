'use client';

import { useEffect, useState } from 'react';
import { listJobs, getDownloadUrl } from '@/lib/api';

export default function PublishPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => { listJobs().then(setJobs).catch(() => {}); }, []);

  const ready = jobs.filter(j => j.status === 'completed');

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🚀 Publish Queue</h1>
        <p className="text-gray-400 text-sm mt-1">Videos ready to publish to your channels</p>
      </div>

      {/* Platform connections */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { name: 'YouTube', icon: '▶️', status: 'Not connected', color: 'gray' },
          { name: 'TikTok',  icon: '🎵', status: 'Not connected', color: 'gray' },
          { name: 'Instagram', icon: '📸', status: 'Not connected', color: 'gray' },
        ].map(p => (
          <div key={p.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{p.icon}</span>
              <div>
                <div className="text-white text-sm font-medium">{p.name}</div>
                <div className="text-gray-500 text-xs">{p.status}</div>
              </div>
            </div>
            <button className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors">
              Connect
            </button>
          </div>
        ))}
      </div>

      {ready.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🚀</div>
          <div className="text-white font-medium mb-1">No videos ready to publish</div>
          <div className="text-gray-500 text-sm mb-4">Generate a video first, then come back here to publish it</div>
          <a href="/dashboard/studio" className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Generate Video
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {ready.map(job => (
            <div key={job.job_id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">{job.topic}</div>
                <div className="text-gray-500 text-xs mt-0.5">Ready to publish · {job.job_id.slice(0,8)}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <a href={getDownloadUrl(job.job_id)} target="_blank" rel="noreferrer"
                  className="text-xs bg-green-800 hover:bg-green-700 text-green-300 px-3 py-1.5 rounded-lg transition-colors">
                  ⬇️ Download
                </a>
                <button disabled className="text-xs bg-gray-800 text-gray-600 px-3 py-1.5 rounded-lg cursor-not-allowed" title="Connect YouTube first">
                  ▶️ Upload to YouTube
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-blue-900/20 border border-blue-800 rounded-xl p-4">
        <div className="text-blue-300 text-sm font-medium mb-1">📌 YouTube Upload — Coming Next</div>
        <div className="text-blue-400/70 text-xs">OAuth2 integration with YouTube Data API v3 is the next feature. Once connected, you'll be able to publish directly from this page with one click.</div>
      </div>
    </div>
  );
}
