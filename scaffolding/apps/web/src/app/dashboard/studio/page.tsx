'use client';

import { useState, useEffect, useRef } from 'react';
import { generateVideo, getJobStatus, getDownloadUrl } from '@/lib/api';

const FORMATS = ['listicle', 'story', 'tutorial', 'debate', 'review'];
const TONES   = ['informative', 'entertaining', 'inspirational', 'serious', 'humorous'];
const NICHES  = ['finance', 'health', 'technology', 'motivation', 'history', 'science', 'travel', 'food', 'sports', 'general'];

export default function StudioPage() {
  const [topic, setTopic]       = useState('');
  const [language, setLanguage] = useState('English');
  const [duration, setDuration] = useState(60);
  const [format, setFormat]     = useState('listicle');
  const [tone, setTone]         = useState('informative');
  const [niche, setNiche]       = useState('finance');
  const [loading, setLoading]   = useState(false);
  const [jobId, setJobId]       = useState<string | null>(null);
  const [job, setJob]           = useState<any>(null);
  const [error, setError]       = useState('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (jobId && job?.status !== 'completed' && job?.status !== 'failed') {
      pollRef.current = setInterval(async () => {
        const status = await getJobStatus(jobId);
        setJob(status);
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollRef.current!);
        }
      }, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, job?.status]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setError(''); setJob(null); setJobId(null); setLoading(true);
    try {
      const res = await generateVideo({ topic, language, duration_seconds: duration, format, tone, niche });
      setJobId(res.job_id);
      setJob({ status: 'pending', progress: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation');
    } finally {
      setLoading(false);
    }
  }

  const statusLabel: Record<string, string> = {
    pending: '⏳ Queued',
    generating_script: '✍️ Writing script...',
    generating_audio: '🎙️ Generating voice...',
    fetching_clips: '🎞️ Downloading stock clips...',
    assembling_video: '🎬 Assembling video...',
    completed: '✅ Video ready!',
    failed: '❌ Failed',
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🎬 Video Studio</h1>
        <p className="text-gray-400 text-sm mt-1">Generate a complete faceless video: script → voice → stock clips → assembled video</p>
      </div>

      <form onSubmit={handleGenerate} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        {/* Topic */}
        <div>
          <label className="text-sm font-medium text-gray-300 block mb-2">Topic *</label>
          <input value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. 5 ways to invest $100 in 2026"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="English">🇺🇸 English</option>
              <option value="Spanish">🇪🇸 Spanish</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Duration</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value={60}>60s (Short)</option>
              <option value={90}>90s</option>
              <option value={180}>3 min</option>
              <option value={300}>5 min</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Niche</label>
            <select value={niche} onChange={e => setNiche(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Format</label>
            <select value={format} onChange={e => setFormat(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}

        <button type="submit" disabled={loading || !topic.trim() || !!jobId}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition-colors">
          {loading ? 'Starting...' : '🚀 Generate Video'}
        </button>
      </form>

      {/* Job progress */}
      {job && (
        <div className="mt-5 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-medium">{statusLabel[job.status] ?? job.status}</span>
            <span className="text-violet-400 font-bold">{job.progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
            <div className="bg-violet-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${job.progress}%` }} />
          </div>

          {job.status === 'completed' && job.metadata && (
            <div className="space-y-3">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-white font-medium text-sm mb-1">{job.metadata.title}</div>
                <div className="text-gray-400 text-xs">{job.metadata.description}</div>
                {job.metadata.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {job.metadata.tags.map((tag: string) => (
                      <span key={tag} className="text-xs bg-violet-900/40 text-violet-300 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <a href={getDownloadUrl(jobId!)} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg px-4 py-3 transition-colors">
                ⬇️ Download Video
              </a>
            </div>
          )}

          {job.status === 'failed' && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
              {job.error ?? 'Generation failed. Check that OPENAI_API_KEY and PEXELS_API_KEY are set.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
