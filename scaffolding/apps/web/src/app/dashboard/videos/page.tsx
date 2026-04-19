'use client';

import { useEffect, useState } from 'react';
import { listJobs, getDownloadUrl } from '@/lib/api';

export default function VideosPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listJobs().then(setJobs).catch(() => setJobs([])).finally(() => setLoading(false));
    const interval = setInterval(() => listJobs().then(setJobs).catch(() => {}), 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📹 My Videos</h1>
          <p className="text-gray-400 text-sm mt-1">All generated videos — auto-refreshes every 8s</p>
        </div>
        <a href="/dashboard/studio" className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + New Video
        </a>
      </div>

      {loading && <div className="text-gray-500 text-sm">Loading...</div>}

      {!loading && jobs.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🎬</div>
          <div className="text-white font-medium mb-2">No videos yet</div>
          <div className="text-gray-500 text-sm mb-4">Go to Video Studio to generate your first video</div>
          <a href="/dashboard/studio" className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Generate Video
          </a>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.job_id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">{job.topic}</div>
                <div className="text-gray-500 text-xs mt-0.5">{job.job_id.slice(0, 8)} · {job.status}</div>
                {job.status !== 'completed' && job.status !== 'failed' && (
                  <div className="mt-2 w-48 bg-gray-800 rounded-full h-1.5">
                    <div className="bg-violet-600 h-1.5 rounded-full transition-all" style={{ width: `${job.progress ?? 0}%` }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={job.status} progress={job.progress} />
                {job.status === 'completed' && (
                  <a href={getDownloadUrl(job.job_id)} target="_blank" rel="noreferrer"
                    className="bg-green-700 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                    ⬇️ Download
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, progress }: { status: string; progress: number }) {
  const map: Record<string, string> = {
    completed: 'bg-green-900/40 text-green-400 border-green-800',
    failed:    'bg-red-900/40 text-red-400 border-red-800',
  };
  const cls = map[status] ?? 'bg-violet-900/40 text-violet-400 border-violet-800';
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>
      {status === 'completed' ? '✓ Ready' : status === 'failed' ? '✗ Failed' : `${progress ?? 0}%`}
    </span>
  );
}
