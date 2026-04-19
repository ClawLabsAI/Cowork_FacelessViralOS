'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getChannel, upsertChannel, type Channel, type Platform, type Tier, type Pipeline, type VoiceProvider } from '@/lib/channels';

const EDGE_VOICES: Record<string, string[]> = {
  English: ['en-US-GuyNeural', 'en-US-JennyNeural', 'en-US-AriaNeural', 'en-GB-RyanNeural', 'en-AU-WilliamNeural'],
  Spanish: ['es-ES-AlvaroNeural', 'es-MX-JorgeNeural', 'es-ES-ElviraNeural', 'es-MX-DaliaNeural'],
};

const TIER_COSTS: Record<Tier, string> = {
  FREE:         '~$0.00/video',
  ECONOMICAL:   '~$0.02–0.05/video',
  OPTIMIZED:    '~$0.08–0.15/video',
  PREMIUM:      '~$0.25–0.50/video',
  ULTRA:        '~$0.50–1.00/video',
  MONEYPRINTER: '~$0.02–0.05/video',
};

const MONETIZATION_OPTIONS = [
  'AdSense / YouTube Partner',
  'TikTok Creator Fund',
  'Affiliate Links',
  'Sponsored Content',
  'Digital Products',
  'Memberships / Patreon',
  'Brand Deals',
  'Newsletter',
];

type TabId = 'identity' | 'content' | 'voice' | 'pipeline' | 'autopilot' | 'monetize';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'identity',  label: 'Identity',  icon: '📛' },
  { id: 'content',   label: 'Content',   icon: '📝' },
  { id: 'voice',     label: 'Voice',     icon: '🎙️' },
  { id: 'pipeline',  label: 'Pipeline',  icon: '⚡' },
  { id: 'autopilot', label: 'Autopilot', icon: '🤖' },
  { id: 'monetize',  label: 'Monetize',  icon: '💵' },
];

export default function ChannelSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [tab, setTab] = useState<TabId>('identity');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ch = getChannel(id);
    if (ch) setChannel(ch);
    else router.push('/dashboard/channels');
  }, [id]);

  if (!channel) return (
    <div className="p-6 text-gray-400 flex items-center gap-2">
      <span className="animate-spin">⏳</span> Loading channel...
    </div>
  );

  function set<K extends keyof Channel>(key: K, value: Channel[K]) {
    setChannel(prev => prev ? { ...prev, [key]: value } : prev);
  }

  function toggleArr<T>(key: keyof Channel, item: T) {
    const arr = channel![key] as T[];
    set(key, arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] as any);
  }

  function handleSave() {
    if (!channel) return;
    upsertChannel(channel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const voices = EDGE_VOICES[channel.language] || EDGE_VOICES['English'];

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/channels')} className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Channels
          </button>
          <span className="text-gray-700">/</span>
          <h1 className="text-xl font-bold text-white">{channel.name}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
            channel.status === 'Active' ? 'bg-green-900/30 text-green-400 border-green-800'
            : channel.status === 'Paused' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
            : 'bg-gray-800 text-gray-400 border-gray-700'
          }`}>{channel.status}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push(`/dashboard/pipeline?channel=${channel.id}`)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            🎬 Generate Video
          </button>
          <button onClick={handleSave}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
              saved ? 'bg-green-700 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}>
            {saved ? '✓ Saved' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Status toggle */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-300">Channel Status</div>
        <div className="flex gap-2">
          {(['Active', 'Paused', 'Draft'] as const).map(s => (
            <button key={s} onClick={() => set('status', s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                channel.status === s
                  ? s === 'Active' ? 'bg-green-900/30 border-green-700 text-green-400'
                    : s === 'Paused' ? 'bg-yellow-900/30 border-yellow-700 text-yellow-400'
                    : 'bg-gray-700 border-gray-600 text-gray-300'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}>
            <span className="text-base leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Identity */}
      {tab === 'identity' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Channel Name</label>
              <input value={channel.name} onChange={e => set('name', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Niche</label>
              <input value={channel.niche} onChange={e => set('niche', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Target Audience</label>
              <input value={channel.audience} onChange={e => set('audience', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-3">Platforms</label>
              <div className="flex gap-3">
                {(['YouTube', 'TikTok', 'Instagram'] as Platform[]).map(p => (
                  <button key={p} onClick={() => toggleArr('platforms', p)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm transition-colors ${
                      channel.platforms.includes(p)
                        ? 'bg-violet-600/20 border-violet-600 text-violet-300 font-medium'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}>
                    {p === 'YouTube' ? '▶️' : p === 'TikTok' ? '🎵' : '📸'} {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-3">Language</label>
              <div className="flex gap-3">
                {(['English', 'Spanish'] as const).map(l => (
                  <button key={l} onClick={() => set('language', l)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm transition-colors ${
                      channel.language === l
                        ? 'bg-violet-600/20 border-violet-600 text-violet-300 font-medium'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}>
                    {l === 'English' ? '🇺🇸' : '🇪🇸'} {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Content */}
      {tab === 'content' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-3">Content Type</label>
              <div className="flex gap-3">
                {(['SHORT', 'LONG', 'BOTH'] as const).map(t => (
                  <button key={t} onClick={() => set('contentType', t)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm transition-colors ${
                      channel.contentType === t
                        ? 'bg-violet-600/20 border-violet-600 text-violet-300 font-medium'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                    }`}>
                    {t === 'SHORT' ? '⚡ Short (60–90s)' : t === 'LONG' ? '🎬 Long (8–15m)' : '⚡🎬 Both'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Content Pillars (comma separated)</label>
              <input
                value={channel.contentPillars.join(', ')}
                onChange={e => set('contentPillars', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Tips, Facts, Mistakes, Success stories, Tutorials"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Hook Templates (comma separated)</label>
              <input
                value={channel.hooks.join(', ')}
                onChange={e => set('hooks', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Did you know, The secret to, Most people don't realize"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">CTA (Call to Action)</label>
              <input value={channel.cta} onChange={e => set('cta', e.target.value)}
                placeholder="Follow for daily tips"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">SEO Keywords (comma separated)</label>
              <input
                value={channel.keywords.join(', ')}
                onChange={e => set('keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="personal finance, money tips, financial freedom"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-white font-medium">Master Niche Prompt</div>
                <div className="text-xs text-gray-500 mt-0.5">AI uses this system prompt to generate all scripts for this channel</div>
              </div>
            </div>
            <textarea
              value={channel.nichePrompt}
              onChange={e => set('nichePrompt', e.target.value)}
              rows={10}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono"
            />
          </div>
        </div>
      )}

      {/* Tab: Voice */}
      {tab === 'voice' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-3">Voice Provider</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: 'edge-tts', label: 'Edge TTS', icon: '🆓', desc: 'Free · Microsoft voices' },
                  { id: 'ElevenLabs', label: 'ElevenLabs', icon: '🎭', desc: '$0.18/1k chars' },
                  { id: 'Local', label: 'Local Model', icon: '💻', desc: 'Ollama · KittenTTS' },
                ] as { id: VoiceProvider; label: string; icon: string; desc: string }[]).map(v => (
                  <button key={v.id} onClick={() => set('voiceProvider', v.id)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      channel.voiceProvider === v.id
                        ? 'bg-violet-600/20 border-violet-600'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}>
                    <div className="text-xl mb-2">{v.icon}</div>
                    <div className={`text-sm font-medium ${channel.voiceProvider === v.id ? 'text-violet-300' : 'text-white'}`}>{v.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {channel.voiceProvider === 'edge-tts' && (
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Voice ({channel.language})</label>
                <select value={channel.voiceId} onChange={e => set('voiceId', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {voices.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}

            {channel.voiceProvider === 'ElevenLabs' && (
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">ElevenLabs Voice ID</label>
                <input value={channel.voiceId} onChange={e => set('voiceId', e.target.value)}
                  placeholder="ElevenLabs voice ID (from your account)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <p className="text-xs text-gray-500 mt-1">Requires ElevenLabs API key in Settings</p>
              </div>
            )}

            {channel.voiceProvider === 'Local' && (
              <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-400">
                Local TTS uses KittenTTS or Piper running on your server. Requires the MoneyPrinter pipeline.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Pipeline */}
      {tab === 'pipeline' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-3">Generation Tier</label>
              <div className="space-y-2">
                {([
                  { id: 'FREE',         label: 'FREE',         cost: '~$0.00',       desc: 'GPT-3.5 + edge-tts + Pexels clips' },
                  { id: 'ECONOMICAL',   label: 'ECONOMICAL',   cost: '~$0.02–0.05',  desc: 'GPT-4o-mini + edge-tts + Pexels clips' },
                  { id: 'OPTIMIZED',    label: 'OPTIMIZED',    cost: '~$0.08–0.15',  desc: 'GPT-4o + ElevenLabs + Pexels clips' },
                  { id: 'PREMIUM',      label: 'PREMIUM',      cost: '~$0.25–0.50',  desc: 'Claude + ElevenLabs HD + AI images' },
                  { id: 'ULTRA',        label: 'ULTRA',        cost: '~$0.50–1.00',  desc: 'MiniMax AI video + ElevenLabs + Claude' },
                  { id: 'MONEYPRINTER', label: 'MONEYPRINTER', cost: '~$0.02–0.05',  desc: 'Ollama local LLM + KittenTTS + AI images' },
                ] as { id: Tier; label: string; cost: string; desc: string }[]).map(t => (
                  <button key={t.id} onClick={() => set('tier', t.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-colors ${
                      channel.tier === t.id
                        ? 'bg-violet-600/20 border-violet-600'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-sm font-bold ${channel.tier === t.id ? 'text-violet-300' : 'text-white'}`}>{t.label}</span>
                        <span className="text-gray-500 text-xs ml-3">{t.desc}</span>
                      </div>
                      <span className={`text-sm font-mono ${channel.tier === t.id ? 'text-violet-300' : 'text-green-400'}`}>{t.cost}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-3">Video Pipeline</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: 'MoneyPrinter', icon: '💸', label: 'MoneyPrinter', desc: 'Cheap · $0.02–0.05\nOllama + Pexels + FFmpeg' },
                  { id: 'MiniMax',      icon: '🚀', label: 'MiniMax API',  desc: 'Premium · $0.10–0.30\nAI-generated video' },
                  { id: 'Hybrid',       icon: '⚡', label: 'Hybrid',       desc: 'Auto-select based on tier' },
                ] as { id: Pipeline; icon: string; label: string; desc: string }[]).map(p => (
                  <button key={p.id} onClick={() => set('pipeline', p.id)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      channel.pipeline === p.id
                        ? 'bg-violet-600/20 border-violet-600'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}>
                    <div className="text-2xl mb-2">{p.icon}</div>
                    <div className={`text-sm font-medium ${channel.pipeline === p.id ? 'text-violet-300' : 'text-white'}`}>{p.label}</div>
                    <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Monthly Cost Limit (USD)</label>
              <div className="flex items-center gap-3">
                <input type="number" value={channel.costLimit} onChange={e => set('costLimit', Number(e.target.value))}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <span className="text-gray-400 text-sm">USD/month · Hard stop when reached</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Autopilot */}
      {tab === 'autopilot' && (
        <div className="space-y-5">
          <div className={`border rounded-2xl p-5 flex items-center justify-between ${
            channel.autopilot ? 'bg-violet-900/10 border-violet-700' : 'bg-gray-900 border-gray-800'
          }`}>
            <div>
              <div className="text-white font-semibold">Autopilot Mode</div>
              <div className="text-gray-400 text-sm mt-0.5">
                {channel.autopilot ? '✅ Active — generating videos automatically' : 'Disabled — manual generation only'}
              </div>
            </div>
            <button onClick={() => set('autopilot', !channel.autopilot)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${channel.autopilot ? 'bg-violet-600' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${channel.autopilot ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Frequency</label>
                <select value={channel.autopilotFreq} onChange={e => set('autopilotFreq', e.target.value as Channel['autopilotFreq'])}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="daily">Daily (1 video/day)</option>
                  <option value="2x-day">2x per day</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Generation Time</label>
                <input type="time" value={channel.autopilotTime} onChange={e => set('autopilotTime', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-300 mb-3">What autopilot does for this channel</div>
              <ul className="space-y-2 text-sm text-gray-400">
                {[
                  `Generates 1 video every ${channel.autopilotFreq === 'daily' ? 'day' : channel.autopilotFreq === '2x-day' ? '12 hours' : 'week'} at ${channel.autopilotTime}`,
                  `Uses channel prompt for "${channel.niche}" niche`,
                  `${channel.voiceProvider} voice · ${channel.tier} tier · ${channel.pipeline} pipeline`,
                  `Auto-publishes to: ${channel.platforms.join(', ')} (when OAuth connected)`,
                  `Stops if monthly cost exceeds $${channel.costLimit}`,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-violet-400 text-xs mt-0.5">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Monetize */}
      {tab === 'monetize' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="text-sm text-white font-medium block mb-3">Active Monetization Strategies</label>
            <div className="grid grid-cols-2 gap-2">
              {MONETIZATION_OPTIONS.map(m => (
                <button key={m} onClick={() => toggleArr('monetization', m)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                    channel.monetization.includes(m)
                      ? 'bg-green-900/20 border-green-700 text-green-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                  }`}>
                  {channel.monetization.includes(m) ? '✓ ' : ''}{m}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm font-medium text-white mb-4">Revenue Estimate</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Est. Monthly Videos', value: channel.autopilot ? (channel.autopilotFreq === 'daily' ? '30' : channel.autopilotFreq === '2x-day' ? '60' : '4') : 'Manual' },
                { label: 'Cost Limit', value: `$${channel.costLimit}/mo` },
                { label: 'Active Streams', value: channel.monetization.length.toString() },
              ].map(s => (
                <div key={s.label} className="bg-gray-800 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <div className="text-blue-300 text-xs font-medium">💡 Revenue tracking coming soon</div>
              <div className="text-blue-400/70 text-xs mt-1">Connect YouTube Analytics, TikTok Creator Fund, and affiliate platforms to see real revenue data per channel.</div>
            </div>
          </div>
        </div>
      )}

      {/* Save button (always visible at bottom) */}
      <div className="mt-8 flex gap-3">
        <button onClick={handleSave}
          className={`flex-1 font-semibold py-3 rounded-lg transition-colors ${
            saved ? 'bg-green-700 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}>
          {saved ? '✓ Saved' : '💾 Save Channel Settings'}
        </button>
        <button onClick={() => router.push(`/dashboard/pipeline?channel=${channel.id}`)}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 px-6 rounded-lg transition-colors">
          🎬 Generate Video
        </button>
      </div>
    </div>
  );
}
