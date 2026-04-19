'use client';

import { useEffect, useState } from 'react';
import { listJobs, getDownloadUrl } from '@/lib/api';
import { getChannels, type Channel } from '@/lib/channels';

export default function PublishPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    listJobs().then(setJobs).catch(() => {});
    setChannels(getChannels());
  }, []);

  const ready = jobs.filter(j => j.status === 'completed');

  const platformConnected = {
    YouTube:   false,
    TikTok:    false,
    Instagram: false,
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🚀 Publish</h1>
        <p className="text-gray-400 text-sm mt-1">Review videos and push to your channels</p>
      </div>

      {/* Platform connections */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Platform Connections</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {([
          { name: 'YouTube',   icon: '▶️', note: 'OAuth2 via Data API v3' },
          { name: 'TikTok',    icon: '🎵', note: 'Content Posting API' },
          { name: 'Instagram', icon: '📸', note: 'Requires Facebook Business' },
        ] as const).map(p => (
          <div key={p.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{p.icon}</span>
              <div>
                <div className="text-white text-sm font-medium">{p.name}</div>
                <div className="text-gray-500 text-xs">{p.note}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Not connected</span>
              <a href="/dashboard/settings" className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors">
                Connect →
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Channel-based queue */}
      {channels.length > 0 && ready.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Ready to Publish</h2>
          <div className="space-y-3">
            {ready.map(job => {
              const channel = channels[0]; // In a real app, jobs would store channel_id
              return (
                <div key={job.job_id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">{job.topic}</div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {channel ? `${channel.name} · ` : ''}Ready to publish · {job.job_id?.slice(0, 8)}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a href={getDownloadUrl(job.job_id)} target="_blank" rel="noreferrer"
                        className="text-xs bg-green-800 hover:bg-green-700 text-green-300 px-3 py-1.5 rounded-lg transition-colors">
                        ⬇️ Download
                      </a>
                    </div>
                  </div>

                  {/* Platform publish buttons */}
                  <div className="flex gap-2">
                    {[
                      { p: 'YouTube',   icon: '▶️' },
                      { p: 'TikTok',    icon: '🎵' },
                      { p: 'Instagram', icon: '📸' },
                    ].map(({ p, icon }) => (
                      <button key={p} disabled
                        className="text-xs bg-gray-800 text-gray-600 px-3 py-1.5 rounded-lg cursor-not-allowed"
                        title={`Connect ${p} in Settings first`}>
                        {icon} Upload to {p}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ready.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center mb-8">
          <div className="text-4xl mb-3">🚀</div>
          <div className="text-white font-medium mb-1">No videos ready to publish</div>
          <div className="text-gray-500 text-sm mb-4">Generate a video first, then come back here to publish it</div>
          <a href="/dashboard/pipeline"
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors inline-block">
            🎬 Go to Pipeline
          </a>
        </div>
      )}

      {/* Publishing roadmap */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-medium mb-4">📋 Publishing Roadmap</div>
        <div className="space-y-3">
          {[
            { done: true,  label: 'Video generation pipeline', desc: 'MoneyPrinter + MiniMax pipelines operational' },
            { done: true,  label: 'Manual download', desc: 'Download generated videos to upload manually' },
            { done: false, label: 'YouTube OAuth2', desc: 'Direct publish via YouTube Data API v3 — next feature' },
            { done: false, label: 'TikTok Content Posting API', desc: 'Direct TikTok upload — requires app review' },
            { done: false, label: 'Instagram/Facebook Graph API', desc: 'Requires Business Account + app review' },
            { done: false, label: 'Autopilot publish scheduling', desc: 'Schedule publish time + auto-queue management' },
          ].map(s => (
            <div key={s.label} className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                s.done ? 'bg-green-700 border-green-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-600'
              }`}>{s.done ? '✓' : '·'}</div>
              <div>
                <div className={`text-sm font-medium ${s.done ? 'text-green-400' : 'text-white'}`}>{s.label}</div>
                <div className="text-gray-500 text-xs">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
