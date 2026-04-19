'use client';

import { useState, useEffect } from 'react';

interface ApiKeys {
  openaiKey: string;
  elevenLabsKey: string;
  pexelsKey: string;
  minimaxKey: string;
  youtubeClientId: string;
  youtubeClientSecret: string;
  tiktokClientKey: string;
  tiktokClientSecret: string;
}

const KEY = 'fvos_settings';

function loadSettings(): ApiKeys {
  if (typeof window === 'undefined') return defaultKeys();
  try { return { ...defaultKeys(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return defaultKeys(); }
}

function defaultKeys(): ApiKeys {
  return {
    openaiKey: '', elevenLabsKey: '', pexelsKey: '',
    minimaxKey: '', youtubeClientId: '', youtubeClientSecret: '',
    tiktokClientKey: '', tiktokClientSecret: '',
  };
}

type Section = 'api' | 'platforms' | 'engine' | 'system';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'api',       label: 'AI & Media APIs', icon: '🔑' },
  { id: 'platforms', label: 'Platform Connections', icon: '🔗' },
  { id: 'engine',    label: 'Video Engine', icon: '⚙️' },
  { id: 'system',    label: 'System', icon: '🛠️' },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('api');
  const [keys, setKeys] = useState<ApiKeys>(defaultKeys());
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [engineUrl, setEngineUrl] = useState('');
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    setKeys(loadSettings());
    setEngineUrl(typeof window !== 'undefined' ? localStorage.getItem('fvos_engine_url') || '' : '');
    setApiUrl(typeof window !== 'undefined' ? localStorage.getItem('fvos_api_url') || '' : '');
  }, []);

  function setKey(k: keyof ApiKeys, v: string) {
    setKeys(prev => ({ ...prev, [k]: v }));
  }

  function handleSave() {
    localStorage.setItem(KEY, JSON.stringify(keys));
    if (engineUrl) localStorage.setItem('fvos_engine_url', engineUrl);
    if (apiUrl) localStorage.setItem('fvos_api_url', apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function toggleShow(k: string) {
    setShow(prev => ({ ...prev, [k]: !prev[k] }));
  }

  function SecretField({ id, label, value, onChange, placeholder, note }: {
    id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; note?: string;
  }) {
    const visible = show[id];
    return (
      <div>
        <label className="text-xs text-gray-400 block mb-1.5">{label}</label>
        <div className="flex gap-2">
          <input
            type={visible ? 'text' : 'password'}
            value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder || 'sk-...'}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
          />
          <button onClick={() => toggleShow(id)}
            className="px-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors text-sm">
            {visible ? '🙈' : '👁️'}
          </button>
        </div>
        {note && <p className="text-xs text-gray-600 mt-1">{note}</p>}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">⚙️ Settings</h1>
        <p className="text-gray-400 text-sm mt-1">API keys, platform connections, and system configuration</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-colors ${
              section === s.id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}>
            <span>{s.icon}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {section === 'api' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="text-sm font-semibold text-white mb-2">OpenAI</div>
            <SecretField
              id="openai" label="OpenAI API Key" value={keys.openaiKey}
              onChange={v => setKey('openaiKey', v)} placeholder="sk-..."
              note="Required for script generation (GPT-4o-mini, GPT-4o). Get yours at platform.openai.com"
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="text-sm font-semibold text-white mb-2">ElevenLabs</div>
            <SecretField
              id="elevenlabs" label="ElevenLabs API Key" value={keys.elevenLabsKey}
              onChange={v => setKey('elevenLabsKey', v)} placeholder="..."
              note="Required for OPTIMIZED / PREMIUM tier voice generation. elevenlabs.io"
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="text-sm font-semibold text-white mb-2">Pexels</div>
            <SecretField
              id="pexels" label="Pexels API Key" value={keys.pexelsKey}
              onChange={v => setKey('pexelsKey', v)} placeholder="..."
              note="Required for stock video clips. Free at pexels.com/api"
            />
            <div className="text-xs bg-green-900/20 border border-green-800 rounded-lg p-2 text-green-400">
              ✓ Default key pre-configured in video engine. Only override here if you want to use your own quota.
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="text-sm font-semibold text-white mb-2">MiniMax (ULTRA Tier)</div>
            <SecretField
              id="minimax" label="MiniMax API Key" value={keys.minimaxKey}
              onChange={v => setKey('minimaxKey', v)} placeholder="..."
              note="Required for ULTRA tier AI video generation. platform.minimaxi.com"
            />
          </div>
        </div>
      )}

      {section === 'platforms' && (
        <div className="space-y-4">
          {[
            {
              icon: '▶️', name: 'YouTube', status: 'Not Connected',
              desc: 'OAuth2 via YouTube Data API v3. Required for direct publishing.',
              fields: [
                { id: 'ytClientId', label: 'Client ID', key: 'youtubeClientId' as keyof ApiKeys },
                { id: 'ytClientSecret', label: 'Client Secret', key: 'youtubeClientSecret' as keyof ApiKeys },
              ],
              link: 'console.developers.google.com',
            },
            {
              icon: '🎵', name: 'TikTok', status: 'Not Connected',
              desc: 'TikTok Content Posting API. Required for direct TikTok uploads.',
              fields: [
                { id: 'ttKey', label: 'Client Key', key: 'tiktokClientKey' as keyof ApiKeys },
                { id: 'ttSecret', label: 'Client Secret', key: 'tiktokClientSecret' as keyof ApiKeys },
              ],
              link: 'developers.tiktok.com',
            },
          ].map(p => (
            <div key={p.name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <div className="text-white font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.desc}</div>
                  </div>
                </div>
                <span className="text-xs bg-gray-800 border border-gray-700 text-gray-500 px-2.5 py-1 rounded-full">{p.status}</span>
              </div>
              <div className="space-y-3">
                {p.fields.map(f => (
                  <SecretField key={f.id} id={f.id} label={f.label} value={keys[f.key]} onChange={v => setKey(f.key, v)} placeholder="..." />
                ))}
                <p className="text-xs text-gray-600">Get credentials at {p.link}</p>
              </div>
            </div>
          ))}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📸</span>
              <div className="text-white font-medium">Instagram / Facebook</div>
            </div>
            <div className="text-xs text-gray-400 mb-2">Requires Facebook Business Account and Instagram Creator Account connected to a Facebook Page.</div>
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 text-xs text-yellow-400">
              ⚠️ Instagram publishing API requires app review. Coming in Phase 1.5.
            </div>
          </div>
        </div>
      )}

      {section === 'engine' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <div className="text-sm font-semibold text-white">Video Engine Connection</div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Video Engine URL</label>
              <input value={engineUrl} onChange={e => setEngineUrl(e.target.value)}
                placeholder="https://your-video-engine.railway.app"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
              <p className="text-xs text-gray-600 mt-1">Override NEXT_PUBLIC_VIDEO_ENGINE_URL env var at runtime</p>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">API Server URL</label>
              <input value={apiUrl} onChange={e => setApiUrl(e.target.value)}
                placeholder="https://your-api.railway.app"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm font-semibold text-white mb-3">Pipeline Defaults</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Default Tier', value: 'ECONOMICAL' },
                { label: 'Default Pipeline', value: 'MoneyPrinter' },
                { label: 'Default Language', value: 'English' },
                { label: 'Default Duration', value: '75 seconds' },
              ].map(s => (
                <div key={s.label} className="bg-gray-800 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">{s.label}</div>
                  <div className="text-gray-300 font-medium">{s.value}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">Per-channel settings override these defaults.</p>
          </div>
        </div>
      )}

      {section === 'system' && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm font-semibold text-white mb-3">Phase</div>
            <div className="bg-violet-900/20 border border-violet-800 rounded-lg p-4">
              <div className="text-violet-300 font-medium">Phase 1 — Private Internal Tool</div>
              <div className="text-violet-400/70 text-xs mt-1">No multi-tenancy. No billing. Single operator. Full control.</div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm font-semibold text-white mb-3">Data Storage</div>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Channel configs', where: 'localStorage (browser)' },
                { label: 'Settings & API keys', where: 'localStorage (browser) — encrypted in Phase 2' },
                { label: 'Video jobs', where: 'Video Engine server (/tmp)' },
                { label: 'Analytics', where: 'API Server (Postgres on Railway)' },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2.5">
                  <span className="text-gray-400">{d.label}</span>
                  <span className="text-gray-300 font-mono">{d.where}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm font-semibold text-white mb-3">Version</div>
            <div className="text-gray-400 text-xs space-y-1">
              <div>Faceless Viral OS v1.0.0-alpha</div>
              <div>Phase: 1 (Private)</div>
              <div>Build: {new Date().toISOString().slice(0, 10)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="mt-8">
        <button onClick={handleSave}
          className={`w-full font-semibold py-3 rounded-lg transition-colors ${
            saved ? 'bg-green-700 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}>
          {saved ? '✓ Settings Saved' : '💾 Save Settings'}
        </button>
        <p className="text-xs text-gray-600 text-center mt-2">API keys are stored in your browser's localStorage. Never shared with third parties.</p>
      </div>
    </div>
  );
}
