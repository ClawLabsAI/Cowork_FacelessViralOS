'use client';

import { useState } from 'react';

const EXAMPLES = [
  { channel: 'Andrei Jikh', subs: '2.3M', niche: 'Personal Finance', avg_views: '450K', upload_freq: '2x/week', hook_style: 'Shocking stat', format: 'Listicle', tone: 'Casual' },
  { channel: 'Graham Stephan', subs: '4.5M', niche: 'Real Estate/Finance', avg_views: '800K', upload_freq: '3x/week', hook_style: 'Personal story', format: 'Story', tone: 'Conversational' },
  { channel: 'Nate O\'Brien', subs: '1.2M', niche: 'Minimalism/Finance', avg_views: '200K', upload_freq: '1x/week', hook_style: 'Question', format: 'Tutorial', tone: 'Calm' },
];

export default function CompetitorsPage() {
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate analysis (real implementation would call video engine)
    setTimeout(() => {
      setAnalysis({
        channel: url || 'Example Channel',
        hook_patterns: ['Shocking statistics in first 3s', 'Question-based hooks', 'Story-driven openings'],
        content_pillars: ['How-to guides', 'Top-N listicles', 'Beginner explainers'],
        avg_duration: '8-12 min',
        posting_freq: '2-3x per week',
        best_performing_topics: ['Passive income', 'Stock market basics', 'Side hustles'],
        recommended_topics: ['5 passive income streams under $1000', 'Index funds explained in 5 min', 'How I invested my first $500'],
      });
      setLoading(false);
    }, 1500);
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">🔍 Competitor Intelligence</h1>
        <p className="text-gray-400 text-sm mt-1">Reverse engineer successful channels to extract winning formats and hooks</p>
      </div>

      <form onSubmit={handleAnalyze} className="flex gap-3 mb-8">
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="YouTube channel URL or @handle..."
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
        <button type="submit" disabled={loading}
          className="bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          {loading ? 'Analyzing...' : '🔍 Analyze'}
        </button>
      </form>

      {analysis && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8 space-y-4">
          <h2 className="text-white font-semibold">Analysis: {analysis.channel}</h2>
          <div className="grid grid-cols-2 gap-4">
            <InfoBlock title="Hook Patterns" items={analysis.hook_patterns} />
            <InfoBlock title="Content Pillars" items={analysis.content_pillars} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Avg Duration', v: analysis.avg_duration },
              { l: 'Posting Freq', v: analysis.posting_freq },
            ].map(s => (
              <div key={s.l} className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400">{s.l}</div>
                <div className="text-white font-medium text-sm mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-300 mb-2">Recommended Topics to Steal</div>
            <div className="space-y-2">
              {analysis.recommended_topics.map((t: string) => (
                <div key={t} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-sm text-white">{t}</span>
                  <a href={`/dashboard/studio`} className="text-xs text-violet-400 hover:text-violet-300">Generate →</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top channels reference */}
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Finance Channels (Reference)</h2>
      <div className="space-y-3">
        {EXAMPLES.map(ch => (
          <div key={ch.channel} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white font-medium">{ch.channel}</div>
              <div className="text-gray-400 text-sm">{ch.subs} subs</div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                { l: 'Avg Views', v: ch.avg_views },
                { l: 'Frequency', v: ch.upload_freq },
                { l: 'Hook Style', v: ch.hook_style },
                { l: 'Format', v: ch.format },
              ].map(s => (
                <div key={s.l} className="bg-gray-800 rounded p-2">
                  <div className="text-gray-400">{s.l}</div>
                  <div className="text-white mt-0.5">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-xs font-medium text-gray-400 mb-2">{title}</div>
      <ul className="space-y-1">
        {items.map(i => <li key={i} className="text-sm text-white flex items-start gap-1.5"><span className="text-violet-400 mt-0.5">•</span>{i}</li>)}
      </ul>
    </div>
  );
}
