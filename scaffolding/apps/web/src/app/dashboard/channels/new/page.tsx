'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDefaultChannel, upsertChannel, type Channel } from '@/lib/channels';

const MODE_META: Record<string, { title: string; icon: string; desc: string; nicheExamples: string[] }> = {
  ai: {
    title: 'AI Suggestions',
    icon: '🤖',
    desc: 'Tell us your goals and AI will suggest the best niche, format, and content strategy.',
    nicheExamples: ['Personal Finance', 'AI & Technology', 'Self Improvement', 'Business Tips'],
  },
  spy: {
    title: 'SPY & Analyze',
    icon: '🔍',
    desc: 'Enter a competitor channel and we\'ll reverse-engineer their strategy for you.',
    nicheExamples: ['Finance Education', 'Productivity', 'Crypto & Web3', 'Health & Fitness'],
  },
  scratch: {
    title: 'From Scratch',
    icon: '✏️',
    desc: 'Full manual setup. You define everything.',
    nicheExamples: ['Custom niche'],
  },
  tiktokshop: {
    title: 'TikTok Shop',
    icon: '🛍️',
    desc: 'Optimized for TikTok Shop affiliate. Product demos and reviews.',
    nicheExamples: ['Beauty & Skincare', 'Home & Kitchen', 'Fashion', 'Tech Gadgets'],
  },
  clipping: {
    title: 'Clipping Channel',
    icon: '✂️',
    desc: 'Repurpose long-form content into viral short clips.',
    nicheExamples: ['Podcast Clips', 'Interview Highlights', 'Documentary Snippets'],
  },
  clone: {
    title: 'Clone Channel',
    icon: '⚡',
    desc: 'Adapt a proven channel format with original content.',
    nicheExamples: ['Finance EN→ES', 'Motivation', 'History', 'Science'],
  },
};

const NICHES = [
  'Personal Finance', 'AI & Technology', 'Self Improvement', 'Business Tips',
  'Health & Fitness', 'Crypto & Web3', 'History & Facts', 'Science & Space',
  'Psychology & Mindset', 'Productivity', 'Entrepreneurship', 'Motivation',
  'Real Estate', 'Marketing & Sales', 'Relationships', 'True Crime',
];

function NewChannelForm() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get('mode') || 'scratch';
  const meta = MODE_META[mode] || MODE_META['scratch'];

  const [step, setStep] = useState(1);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [channel, setChannel] = useState<Channel>(() => createDefaultChannel());
  const [customNiche, setCustomNiche] = useState('');
  const [generating, setGenerating] = useState(false);
  const [promptGenerated, setPromptGenerated] = useState(false);

  function set<K extends keyof Channel>(key: K, value: Channel[K]) {
    setChannel(prev => ({ ...prev, [key]: value }));
  }

  function togglePlatform(p: Channel['platforms'][number]) {
    const cur = channel.platforms;
    if (cur.includes(p)) {
      set('platforms', cur.filter(x => x !== p));
    } else {
      set('platforms', [...cur, p]);
    }
  }

  async function generateNichePrompt() {
    setGenerating(true);
    // Simulate AI generating a niche prompt
    await new Promise(r => setTimeout(r, 1500));
    const niche = channel.niche || customNiche;
    const lang = channel.language;
    const type = channel.contentType;
    const prompt = `You are a ${lang} faceless ${type === 'SHORT' ? 'short-form' : type === 'LONG' ? 'long-form' : 'content'} creator in the "${niche}" niche.

Your audience: ${channel.audience || 'people interested in ' + niche}.

Content pillars: ${channel.contentPillars.length > 0 ? channel.contentPillars.join(', ') : 'tips, facts, insights, and actionable advice'}.

Tone: Engaging, clear, trustworthy. Hook the viewer in the first 3 seconds. End with a strong CTA: "${channel.cta || 'Follow for more'}".

Keywords to naturally include: ${channel.keywords.length > 0 ? channel.keywords.join(', ') : niche + ' tips, best ' + niche + ' advice'}.

Generate scripts that are ${type === 'SHORT' ? '60-90 seconds' : type === 'LONG' ? '8-15 minutes' : 'platform-appropriate'} and optimized for ${channel.platforms.join(', ')}.`;
    set('nichePrompt', prompt);
    setPromptGenerated(true);
    setGenerating(false);
  }

  function handleSave() {
    const name = channel.name.trim();
    if (!name) { alert('Please enter a channel name'); return; }
    const final: Channel = {
      ...channel,
      name,
      niche: channel.niche || customNiche,
      status: 'Active',
    };
    upsertChannel(final);
    router.push(`/dashboard/channels/${final.id}/settings`);
  }

  const totalSteps = mode === 'spy' ? 4 : 3;

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/channels')} className="text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl">{meta.icon}</div>
        <div>
          <h1 className="text-xl font-bold text-white">New Channel — {meta.title}</h1>
          <p className="text-gray-400 text-xs mt-0.5">{meta.desc}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s === step ? 'bg-violet-600 text-white' : s < step ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-500'
            }`}>{s < step ? '✓' : s}</div>
            {s < totalSteps && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-700' : 'bg-gray-800'}`} />}
          </div>
        ))}
        <span className="text-xs text-gray-500 ml-2">Step {step} of {totalSteps}</span>
      </div>

      {/* STEP 1: Spy URL or Niche picker */}
      {step === 1 && (
        <div className="space-y-6">
          {mode === 'spy' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <label className="text-sm text-white font-medium block mb-2">Competitor Channel URL</label>
              <input
                value={competitorUrl}
                onChange={e => setCompetitorUrl(e.target.value)}
                placeholder="https://www.youtube.com/@ChannelName"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-gray-500 mt-2">We'll analyze their format, hooks, posting frequency, and top content.</p>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="text-sm text-white font-medium block mb-3">Select Niche</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(mode === 'ai' ? meta.nicheExamples : NICHES).map(n => (
                <button key={n} onClick={() => set('niche', n)}
                  className={`text-xs px-3 py-2 rounded-lg border transition-colors text-left ${
                    channel.niche === n
                      ? 'bg-violet-600/20 border-violet-600 text-violet-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                  }`}>{n}</button>
              ))}
            </div>
            <input
              value={customNiche}
              onChange={e => { setCustomNiche(e.target.value); set('niche', e.target.value); }}
              placeholder="Or type a custom niche..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="text-sm text-white font-medium block mb-3">Content Type</label>
            <div className="flex gap-3">
              {(['SHORT', 'LONG', 'BOTH'] as const).map(t => (
                <button key={t} onClick={() => set('contentType', t)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    channel.contentType === t
                      ? 'bg-violet-600/20 border-violet-600 text-violet-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                  }`}>{t === 'SHORT' ? '⚡ Short' : t === 'LONG' ? '🎬 Long' : '⚡🎬 Both'}</button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="text-sm text-white font-medium block mb-3">Target Platforms</label>
            <div className="flex gap-3">
              {(['YouTube', 'TikTok', 'Instagram'] as const).map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    channel.platforms.includes(p)
                      ? 'bg-violet-600/20 border-violet-600 text-violet-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                  }`}>
                  {p === 'YouTube' ? '▶️' : p === 'TikTok' ? '🎵' : '📸'} {p}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setStep(2)}
            disabled={!channel.niche && !customNiche}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors">
            Continue →
          </button>
        </div>
      )}

      {/* STEP 2: Channel identity */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Channel Name *</label>
              <input value={channel.name} onChange={e => set('name', e.target.value)}
                placeholder={`e.g. ${channel.niche} Daily`}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Language</label>
              <div className="flex gap-3">
                {(['English', 'Spanish'] as const).map(l => (
                  <button key={l} onClick={() => set('language', l)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      channel.language === l
                        ? 'bg-violet-600/20 border-violet-600 text-violet-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}>{l === 'English' ? '🇺🇸 English' : '🇪🇸 Spanish'}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Target Audience</label>
              <input value={channel.audience} onChange={e => set('audience', e.target.value)}
                placeholder={`e.g. Millennials interested in ${channel.niche}`}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">CTA (Call to Action)</label>
              <input value={channel.cta} onChange={e => set('cta', e.target.value)}
                placeholder="e.g. Follow for daily tips"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="text-xs text-gray-400 block mb-1.5">Content Pillars (comma separated)</label>
            <input
              value={channel.contentPillars.join(', ')}
              onChange={e => set('contentPillars', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="e.g. Tips, Facts, Mistakes to avoid, Success stories"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-700 text-gray-400 hover:text-white py-3 rounded-lg transition-colors text-sm">
              ← Back
            </button>
            <button onClick={() => setStep(3)}
              disabled={!channel.name.trim()}
              className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 (spy: 4): AI Pipeline & Niche Prompt */}
      {step === (mode === 'spy' ? 3 : 3) && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">AI Pipeline</label>
              <div className="flex gap-3">
                {(['MoneyPrinter', 'MiniMax', 'Hybrid'] as const).map(p => (
                  <button key={p} onClick={() => set('pipeline', p)}
                    className={`flex-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      channel.pipeline === p
                        ? 'bg-violet-600/20 border-violet-600 text-violet-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}>
                    {p === 'MoneyPrinter' ? '💸 MoneyPrinter\n$0.02–0.05' : p === 'MiniMax' ? '🚀 MiniMax\n$0.10–0.30' : '⚡ Hybrid'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Generation Tier</label>
              <select value={channel.tier} onChange={e => set('tier', e.target.value as Channel['tier'])}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="FREE">FREE — edge-tts + GPT-3.5</option>
                <option value="ECONOMICAL">ECONOMICAL — edge-tts + GPT-4o-mini (~$0.02)</option>
                <option value="OPTIMIZED">OPTIMIZED — ElevenLabs + GPT-4o (~$0.08)</option>
                <option value="PREMIUM">PREMIUM — ElevenLabs HD + Claude (~$0.25)</option>
                <option value="ULTRA">ULTRA — Full AI video (~$0.50)</option>
                <option value="MONEYPRINTER">MONEYPRINTER — Full local pipeline (~$0.02)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Monthly Cost Limit (USD)</label>
              <input type="number" value={channel.costLimit} onChange={e => set('costLimit', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-sm text-white font-medium">Channel Master Prompt</label>
                <p className="text-xs text-gray-500 mt-0.5">AI uses this to generate every script for this channel</p>
              </div>
              <button onClick={generateNichePrompt} disabled={generating}
                className="text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
                {generating ? '⏳ Generating...' : promptGenerated ? '🔄 Regenerate' : '✨ AI Generate'}
              </button>
            </div>
            <textarea
              value={channel.nichePrompt}
              onChange={e => set('nichePrompt', e.target.value)}
              rows={8}
              placeholder="Click 'AI Generate' to auto-create a prompt, or write your own system prompt for script generation..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 border border-gray-700 text-gray-400 hover:text-white py-3 rounded-lg transition-colors text-sm">
              ← Back
            </button>
            <button onClick={handleSave}
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-lg transition-colors">
              Create Channel →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewChannelPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
      <NewChannelForm />
    </Suspense>
  );
}
