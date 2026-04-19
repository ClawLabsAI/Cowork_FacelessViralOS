'use client';

const TIERS = [
  {
    id: 'FREE',
    icon: '🆓',
    color: 'gray',
    cost: '$0.00',
    desc: 'Zero cost. Good for testing the pipeline.',
    script: 'GPT-3.5-turbo',
    voice: 'Edge TTS (free)',
    video: 'Pexels clips + FFmpeg',
    quality: '★★☆☆☆',
    speed: '~3 min',
    limit: '10 videos/day',
    useCase: 'Testing, draft content, proof of concept',
    escalate: 'When you need better script quality',
    downgrade: 'N/A — lowest tier',
  },
  {
    id: 'ECONOMICAL',
    icon: '💚',
    color: 'green',
    cost: '~$0.02–0.05',
    desc: 'Best ROI tier. Suitable for most faceless channels.',
    script: 'GPT-4o-mini',
    voice: 'Edge TTS (free)',
    video: 'Pexels clips + FFmpeg',
    quality: '★★★☆☆',
    speed: '~3 min',
    limit: 'Budget-based',
    useCase: 'Main production tier for high-volume channels',
    escalate: 'When top 20% performing content needs higher quality',
    downgrade: 'Switch to FREE for testing',
  },
  {
    id: 'OPTIMIZED',
    icon: '⚡',
    color: 'yellow',
    cost: '~$0.08–0.15',
    desc: 'Better audio quality. Good for channels with real audience.',
    script: 'GPT-4o',
    voice: 'ElevenLabs standard',
    video: 'Pexels clips + FFmpeg',
    quality: '★★★★☆',
    speed: '~4 min',
    limit: 'Budget-based',
    useCase: 'Channels with 1k+ subs, evergreen content',
    escalate: 'For breakout content or premium niches',
    downgrade: 'Switch to ECONOMICAL when ROI drops',
  },
  {
    id: 'PREMIUM',
    icon: '💎',
    color: 'violet',
    cost: '~$0.25–0.50',
    desc: 'High quality voice and scripts. For monetized channels.',
    script: 'Claude Sonnet',
    voice: 'ElevenLabs HD',
    video: 'AI images + FFmpeg',
    quality: '★★★★★',
    speed: '~6 min',
    limit: 'Budget-based',
    useCase: 'Sponsored content, premium niches, sponsor-ready channels',
    escalate: 'Use ULTRA for full AI video',
    downgrade: 'Switch to OPTIMIZED if margins are thin',
  },
  {
    id: 'ULTRA',
    icon: '🚀',
    color: 'blue',
    cost: '~$0.50–1.00',
    desc: 'Full AI-generated video via MiniMax API.',
    script: 'Claude Opus',
    voice: 'ElevenLabs HD',
    video: 'MiniMax AI video',
    quality: '★★★★★+',
    speed: '~10 min',
    limit: 'Budget-based',
    useCase: 'Flagship content, viral pushes, brand deals',
    escalate: 'Maximum tier',
    downgrade: 'Downgrade to PREMIUM if budget limit hit',
  },
  {
    id: 'MONEYPRINTER',
    icon: '💸',
    color: 'orange',
    cost: '~$0.02–0.05',
    desc: 'Full local pipeline. Cheapest at scale with local hardware.',
    script: 'Ollama (local)',
    voice: 'KittenTTS (local)',
    video: 'Nano Banana 2 (Gemini) + FFmpeg',
    quality: '★★★☆☆',
    speed: '~5 min',
    limit: 'Hardware-based',
    useCase: 'Maximum scale, cost-controlled, offline-capable',
    escalate: 'Switch to ECONOMICAL for cloud generation',
    downgrade: 'N/A — full local',
  },
];

const colorMap: Record<string, { badge: string; ring: string; icon: string }> = {
  gray:   { badge: 'text-gray-400 bg-gray-800 border-gray-700',     ring: 'border-gray-700',   icon: 'bg-gray-800' },
  green:  { badge: 'text-green-400 bg-green-900/30 border-green-800', ring: 'border-green-800',  icon: 'bg-green-900/40' },
  yellow: { badge: 'text-yellow-400 bg-yellow-900/30 border-yellow-800', ring: 'border-yellow-800', icon: 'bg-yellow-900/40' },
  violet: { badge: 'text-violet-400 bg-violet-900/30 border-violet-800', ring: 'border-violet-800', icon: 'bg-violet-900/40' },
  blue:   { badge: 'text-blue-400 bg-blue-900/30 border-blue-800',   ring: 'border-blue-800',   icon: 'bg-blue-900/40' },
  orange: { badge: 'text-orange-400 bg-orange-900/30 border-orange-800', ring: 'border-orange-800', icon: 'bg-orange-900/40' },
};

export default function TiersPage() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">⚡ Tiers & Cost</h1>
        <p className="text-gray-400 text-sm mt-1">Choose the right generation tier for each channel and workflow</p>
      </div>

      {/* Quick comparison */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Tier</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Cost/Video</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Script</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Voice</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3 pr-4">Quality</th>
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-3">Speed</th>
            </tr>
          </thead>
          <tbody>
            {TIERS.map(t => {
              const c = colorMap[t.color];
              return (
                <tr key={t.id} className="border-b border-gray-900">
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.badge}`}>
                      {t.icon} {t.id}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-green-400 font-mono text-xs">{t.cost}</td>
                  <td className="py-3 pr-4 text-gray-300 text-xs">{t.script}</td>
                  <td className="py-3 pr-4 text-gray-300 text-xs">{t.voice}</td>
                  <td className="py-3 pr-4 text-yellow-400 text-xs">{t.quality}</td>
                  <td className="py-3 text-gray-400 text-xs">{t.speed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tier cards */}
      <div className="space-y-4">
        {TIERS.map(t => {
          const c = colorMap[t.color];
          return (
            <div key={t.id} className={`bg-gray-900 border ${c.ring} rounded-2xl p-5`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center text-2xl`}>{t.icon}</div>
                  <div>
                    <div className={`text-lg font-bold ${c.badge.includes('green') ? 'text-green-400' : c.badge.includes('yellow') ? 'text-yellow-400' : c.badge.includes('violet') ? 'text-violet-400' : c.badge.includes('blue') ? 'text-blue-400' : c.badge.includes('orange') ? 'text-orange-400' : 'text-gray-300'}`}>{t.id}</div>
                    <div className="text-gray-400 text-sm">{t.desc}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold font-mono">{t.cost}</div>
                  <div className="text-gray-500 text-xs">per video</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-800 rounded-lg p-3 text-xs">
                  <div className="text-gray-500 mb-1.5">Stack</div>
                  <div className="text-gray-300">📝 {t.script}</div>
                  <div className="text-gray-300">🎙️ {t.voice}</div>
                  <div className="text-gray-300">🎬 {t.video}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-xs">
                  <div className="text-gray-500 mb-1.5">Performance</div>
                  <div className="text-yellow-400">Quality: {t.quality}</div>
                  <div className="text-gray-300">Speed: {t.speed}</div>
                  <div className="text-gray-300">Limit: {t.limit}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-800/60 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">Best for</div>
                  <div className="text-gray-300">{t.useCase}</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">Escalate when</div>
                  <div className="text-gray-300">{t.escalate}</div>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">Downgrade when</div>
                  <div className="text-gray-300">{t.downgrade}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 bg-blue-900/20 border border-blue-800 rounded-xl p-4">
        <div className="text-blue-300 text-sm font-medium mb-1">💡 Routing Strategy</div>
        <div className="text-blue-400/70 text-xs">
          Recommended: Run ECONOMICAL as your default tier for all channels. When a video performs well (top 20% by views), escalate that topic to OPTIMIZED or PREMIUM for a higher-quality version. Use MONEYPRINTER for maximum volume at minimum cost.
        </div>
      </div>
    </div>
  );
}
