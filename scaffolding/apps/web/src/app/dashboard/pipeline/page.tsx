'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getChannels, type Channel } from '@/lib/channels';
import { generateVideo, getJobStatus, getDownloadUrl } from '@/lib/api';

type Step = 'channel' | 'topic' | 'script' | 'generate' | 'preview';

interface ScriptIdea {
  title: string;
  hook: string;
  body: string;
  cta: string;
  estimatedDuration: string;
}

function PipelinePage() {
  const router = useRouter();
  const params = useSearchParams();
  const preselectedId = params.get('channel');

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [step, setStep] = useState<Step>('channel');
  const [topicMode, setTopicMode] = useState<'ai' | 'manual'>('ai');
  const [manualTopic, setManualTopic] = useState('');
  const [ideas, setIdeas] = useState<ScriptIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ScriptIdea | null>(null);
  const [editedScript, setEditedScript] = useState('');
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [jobPct, setJobPct] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const chs = getChannels();
    setChannels(chs);
    if (preselectedId) {
      const ch = chs.find(c => c.id === preselectedId);
      if (ch) { setSelectedChannel(ch); setStep('topic'); }
    }
  }, [preselectedId]);

  // Poll job status
  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const data = await getJobStatus(jobId);
        setJobPct(data.progress ?? 0);
        if (data.status === 'completed') { setJobStatus('completed'); setStep('preview'); clearInterval(interval); }
        else if (data.status === 'failed') { setJobStatus('failed'); setError(data.error || 'Generation failed'); clearInterval(interval); }
      } catch { /* keep polling */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  async function generateIdeas() {
    if (!selectedChannel) return;
    setGeneratingIdeas(true);
    setIdeas([]);
    // Simulate AI idea generation using channel niche prompt
    await new Promise(r => setTimeout(r, 2000));
    const niche = selectedChannel.niche;
    const mockIdeas: ScriptIdea[] = [
      {
        title: `The #1 ${niche} Mistake That's Costing You Thousands`,
        hook: `Did you know that 80% of people in ${niche} are making this one mistake?`,
        body: `Today I'm going to reveal the single biggest mistake that people make when it comes to ${niche}. This isn't just theory — this is what separates the people who succeed from those who don't. Here's what you need to know...`,
        cta: selectedChannel.cta || 'Follow for more',
        estimatedDuration: selectedChannel.contentType === 'LONG' ? '8–10 min' : '60–75 sec',
      },
      {
        title: `5 ${niche} Tips Nobody Talks About`,
        hook: `These 5 ${niche} secrets changed everything for me.`,
        body: `Most people only know the basics when it comes to ${niche}. But there are 5 powerful strategies that the experts use that almost nobody talks about. Number 3 completely changed my approach...`,
        cta: selectedChannel.cta || 'Follow for more',
        estimatedDuration: selectedChannel.contentType === 'LONG' ? '10–12 min' : '75–90 sec',
      },
      {
        title: `How I Would Start ${niche} From Zero in 2025`,
        hook: `If I had to start over with ${niche} from scratch, here's exactly what I'd do.`,
        body: `Starting from zero is actually an advantage. You don't have bad habits to unlearn. Here's the exact roadmap I would follow if I was starting ${niche} today with nothing but my knowledge...`,
        cta: selectedChannel.cta || 'Follow for more',
        estimatedDuration: selectedChannel.contentType === 'LONG' ? '12–15 min' : '80–90 sec',
      },
    ];
    setIdeas(mockIdeas);
    setGeneratingIdeas(false);
  }

  function selectIdea(idea: ScriptIdea) {
    setSelectedIdea(idea);
    setEditedScript(`${idea.hook}\n\n${idea.body}\n\n${idea.cta}`);
    setStep('script');
  }

  function useManualTopic() {
    if (!manualTopic.trim()) return;
    const idea: ScriptIdea = {
      title: manualTopic,
      hook: '',
      body: '',
      cta: selectedChannel?.cta || 'Follow for more',
      estimatedDuration: '60–90 sec',
    };
    setSelectedIdea(idea);
    setEditedScript('');
    setStep('script');
  }

  async function startGeneration() {
    if (!selectedChannel || !selectedIdea) return;
    setStep('generate');
    setJobStatus('queued');
    setJobPct(0);
    setError('');
    try {
      const res = await generateVideo({
        topic: selectedIdea.title,
        language: selectedChannel.language,
        duration_seconds: selectedChannel.contentType === 'LONG' ? 600 : 75,
        format: selectedChannel.contentType === 'SHORT' ? 'short' : 'long',
        tone: 'engaging',
        niche: selectedChannel.niche,
      });
      if (res.job_id) {
        setJobId(res.job_id);
        setJobStatus('processing');
      } else {
        setJobStatus('failed');
        setError(res.error || 'Failed to start generation');
      }
    } catch (e: any) {
      setJobStatus('failed');
      setError(e.message || 'Connection error');
    }
  }

  const platformIcon = (p: string) => p === 'YouTube' ? '▶️' : p === 'TikTok' ? '🎵' : '📸';

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🎬 Pipeline</h1>
        <p className="text-gray-400 text-sm mt-1">Generate content through your channel's AI system</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 bg-gray-900 border border-gray-800 rounded-xl p-2">
        {([
          { id: 'channel',  label: 'Channel',  icon: '📺' },
          { id: 'topic',    label: 'Topic',    icon: '💡' },
          { id: 'script',   label: 'Script',   icon: '📝' },
          { id: 'generate', label: 'Generate', icon: '⚡' },
          { id: 'preview',  label: 'Preview',  icon: '▶️' },
        ] as { id: Step; label: string; icon: string }[]).map((s, idx, arr) => {
          const steps: Step[] = ['channel', 'topic', 'script', 'generate', 'preview'];
          const stepIdx = steps.indexOf(step);
          const sIdx = steps.indexOf(s.id);
          const isActive = step === s.id;
          const isDone = sIdx < stepIdx;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <button
                onClick={() => isDone && setStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium w-full transition-colors ${
                  isActive ? 'bg-violet-600 text-white' : isDone ? 'text-green-400 hover:bg-gray-800' : 'text-gray-600'
                }`}>
                <span>{isDone ? '✓' : s.icon}</span>
                {s.label}
              </button>
              {idx < arr.length - 1 && <div className="w-3 h-0.5 bg-gray-800 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* STEP: Channel Selection */}
      {step === 'channel' && (
        <div>
          {channels.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">📺</div>
              <div className="text-white font-medium mb-2">No channels yet</div>
              <div className="text-gray-400 text-sm mb-4">Create a channel first to use the pipeline.</div>
              <button onClick={() => router.push('/dashboard/channels')}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
                → Create Channel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm mb-4">Select the channel you want to generate content for:</p>
              {channels.map(ch => (
                <button key={ch.id} onClick={() => { setSelectedChannel(ch); setStep('topic'); }}
                  className="w-full bg-gray-900 border border-gray-800 hover:border-violet-700 rounded-xl p-4 text-left transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {ch.platforms.map(p => <span key={p}>{platformIcon(p)}</span>)}
                        <span className="text-white font-semibold">{ch.name}</span>
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        {ch.niche} · {ch.language} · {ch.contentType} · {ch.tier}
                      </div>
                    </div>
                    <div className="text-violet-400 text-sm">Select →</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP: Topic Selection */}
      {step === 'topic' && selectedChannel && (
        <div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 flex items-center justify-between">
            <div>
              <div className="text-white font-medium text-sm">{selectedChannel.name}</div>
              <div className="text-gray-400 text-xs">{selectedChannel.niche} · {selectedChannel.language} · {selectedChannel.tier}</div>
            </div>
            <button onClick={() => setStep('channel')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Change →</button>
          </div>

          <div className="flex gap-2 mb-5">
            {(['ai', 'manual'] as const).map(m => (
              <button key={m} onClick={() => setTopicMode(m)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  topicMode === m
                    ? 'bg-violet-600/20 border-violet-600 text-violet-300'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                }`}>
                {m === 'ai' ? '🤖 AI Suggests Topics' : '✏️ Manual Topic'}
              </button>
            ))}
          </div>

          {topicMode === 'ai' && (
            <div>
              <button onClick={generateIdeas} disabled={generatingIdeas}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors mb-5">
                {generatingIdeas ? '⏳ Generating ideas from channel prompt...' : '✨ Generate Topic Ideas'}
              </button>

              {ideas.length > 0 && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-xs mb-2">Pick a topic to continue:</p>
                  {ideas.map((idea, i) => (
                    <button key={i} onClick={() => selectIdea(idea)}
                      className="w-full bg-gray-900 border border-gray-800 hover:border-violet-700 rounded-xl p-4 text-left transition-colors">
                      <div className="text-white font-medium text-sm mb-1">{idea.title}</div>
                      <div className="text-gray-400 text-xs mb-2 line-clamp-2">{idea.hook}</div>
                      <div className="text-gray-600 text-xs">⏱ {idea.estimatedDuration}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {topicMode === 'manual' && (
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Video Topic</label>
              <input value={manualTopic} onChange={e => setManualTopic(e.target.value)}
                placeholder={`e.g. The 5 best ${selectedChannel.niche} strategies for 2025`}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 mb-3"
              />
              <button onClick={useManualTopic} disabled={!manualTopic.trim()}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors">
                Write Script for This Topic →
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP: Script Review */}
      {step === 'script' && selectedIdea && selectedChannel && (
        <div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
            <div className="text-xs text-gray-500 mb-1">Topic</div>
            <div className="text-white font-semibold">{selectedIdea.title}</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white font-medium">Script</div>
              <div className="text-xs text-gray-500">Edit freely · {editedScript.split(' ').filter(Boolean).length} words</div>
            </div>
            <textarea
              value={editedScript}
              onChange={e => setEditedScript(e.target.value)}
              rows={12}
              placeholder="Your script will appear here. Edit before generating..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
            <div className="text-xs font-medium text-gray-400 mb-3">Generation Settings</div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Voice</div>
                <div className="text-white">{selectedChannel.voiceProvider} · {selectedChannel.voiceId.split('-').slice(-1)[0]}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Tier</div>
                <div className="text-white">{selectedChannel.tier}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Pipeline</div>
                <div className="text-white">{selectedChannel.pipeline}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('topic')} className="border border-gray-700 text-gray-400 hover:text-white py-3 px-6 rounded-lg transition-colors text-sm">
              ← Back
            </button>
            <button onClick={startGeneration}
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-lg transition-colors">
              ⚡ Generate Video
            </button>
          </div>
        </div>
      )}

      {/* STEP: Generation Progress */}
      {step === 'generate' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
          {jobStatus === 'failed' ? (
            <div>
              <div className="text-5xl mb-4">❌</div>
              <div className="text-white font-semibold mb-2">Generation Failed</div>
              <div className="text-red-400 text-sm mb-5">{error}</div>
              <div className="text-gray-500 text-xs mb-5">Make sure the Video Engine is running and your API keys are configured in Settings.</div>
              <button onClick={() => setStep('script')} className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                ← Try Again
              </button>
            </div>
          ) : (
            <div>
              <div className="text-5xl mb-4 animate-bounce">⚡</div>
              <div className="text-white font-semibold mb-2">
                {jobStatus === 'queued' ? 'Queued...' : 'Generating Video'}
              </div>
              <div className="text-gray-400 text-sm mb-6">
                {selectedChannel?.pipeline === 'MiniMax' ? 'MiniMax API is creating your video...' : 'Running MoneyPrinter pipeline...'}
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 mb-3 max-w-sm mx-auto">
                <div className="bg-violet-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${jobPct}%` }} />
              </div>
              <div className="text-gray-500 text-xs">{jobPct}% complete · Job: {jobId?.slice(0,8)}</div>
              <div className="mt-6 grid grid-cols-4 gap-2 max-w-xs mx-auto text-xs text-gray-600">
                {['📝 Script', '🎙️ Voice', '🎞️ Clips', '🎬 Render'].map((s, i) => (
                  <div key={s} className={`${jobPct >= (i + 1) * 25 ? 'text-green-400' : ''}`}>{s}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP: Preview & Publish */}
      {step === 'preview' && jobId && (
        <div>
          <div className="bg-gray-900 border border-green-800 rounded-2xl p-6 text-center mb-5">
            <div className="text-4xl mb-3">🎉</div>
            <div className="text-white font-semibold mb-1">Video Ready!</div>
            <div className="text-gray-400 text-sm mb-5">Your video has been generated and is ready to publish.</div>
            <div className="flex gap-3 justify-center">
              <a href={getDownloadUrl(jobId)} target="_blank" rel="noreferrer"
                className="bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                ⬇️ Download Video
              </a>
              <button onClick={() => router.push('/dashboard/publish')}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                🚀 Go to Publish →
              </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm font-medium text-white mb-3">Video Details</div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Topic</div>
                <div className="text-white">{selectedIdea?.title}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Channel</div>
                <div className="text-white">{selectedChannel?.name}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Job ID</div>
                <div className="text-white font-mono">{jobId.slice(0,12)}...</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setStep('topic'); setJobId(null); setJobStatus('idle'); setJobPct(0); setSelectedIdea(null); setIdeas([]); }}
            className="mt-4 w-full border border-gray-700 text-gray-400 hover:text-white py-3 rounded-lg transition-colors text-sm">
            ← Generate Another Video
          </button>
        </div>
      )}
    </div>
  );
}

export default function PipelinePageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading pipeline...</div>}>
      <PipelinePage />
    </Suspense>
  );
}
