'use client';

import { useState } from 'react';

export default function AutopilotPage() {
  const [enabled, setEnabled] = useState(false);
  const [freq, setFreq] = useState('daily');
  const [niche, setNiche] = useState('finance');
  const [language, setLanguage] = useState('English');
  const [time, setTime] = useState('09:00');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🤖 Autopilot</h1>
        <p className="text-gray-400 text-sm mt-1">Automatically generate and queue videos on a schedule</p>
      </div>

      {/* Master toggle */}
      <div className={`border rounded-2xl p-5 mb-6 flex items-center justify-between ${enabled ? 'bg-violet-900/10 border-violet-700' : 'bg-gray-900 border-gray-800'}`}>
        <div>
          <div className="text-white font-semibold">Autopilot Mode</div>
          <div className="text-gray-400 text-sm mt-0.5">{enabled ? '✅ Active — generating videos automatically' : 'Disabled — manual mode'}</div>
        </div>
        <button onClick={() => setEnabled(!enabled)}
          className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-violet-600' : 'bg-gray-700'}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
        <h2 className="text-white font-semibold">Schedule Settings</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-2">Frequency</label>
            <select value={freq} onChange={e => setFreq(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="daily">Daily (1 video/day)</option>
              <option value="2x-day">2x per day</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-2">Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-2">Niche</label>
            <input value={niche} onChange={e => setNiche(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-2">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option>English</option>
              <option>Spanish</option>
            </select>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-sm font-medium text-gray-300 mb-3">What autopilot will do</div>
          <ul className="space-y-2 text-sm text-gray-400">
            {[
              `Generate 1 video per ${freq === 'daily' ? 'day' : freq === '2x-day' ? '12 hours' : 'week'} at ${time}`,
              `Use GPT-4o-mini to create a trending ${niche} topic`,
              'Generate TTS audio with edge-tts (free)',
              'Download matching stock clips from Pexels',
              'Assemble and save video to My Videos',
              'YouTube upload: coming soon (requires OAuth)',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-violet-400 text-xs mt-0.5">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        <button onClick={handleSave}
          className={`w-full font-semibold rounded-lg px-4 py-3 transition-colors ${
            saved ? 'bg-green-700 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'
          }`}>
          {saved ? '✓ Saved' : 'Save Autopilot Settings'}
        </button>
      </div>
    </div>
  );
}
