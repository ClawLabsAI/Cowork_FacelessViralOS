'use client';

import React, { useState, useMemo } from 'react';

interface Script {
  id: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  category: string;
  tags: string[];
  language: string;
  score: number;
  status: 'draft' | 'optimized' | 'ready';
  createdAt: Date;
  wordCount: number;
  estimatedDuration: number; // seconds
}

const mockScripts: Script[] = [
  {
    id: '1',
    title: 'The Hidden Pattern',
    hook: 'There\'s a pattern that top 1% of creators use...',
    body: 'Today I\'m going to reveal the hidden pattern that separates viral creators from everyone else. Most people think virality is random, but it\'s not. After analyzing thousands of viral videos, I discovered something remarkable: the first 3 seconds determine everything. The pattern is simple: start with a visual anomaly, add a pattern interrupt, then deliver a promise. But here\'s where most people fail - they try to be interesting instead of specific. The algorithm doesn\'t reward creativity, it rewards clarity.',
    cta: 'Follow for more secrets',
    category: 'Educational',
    tags: ['viral', 'algorithm', 'growth'],
    language: 'en',
    score: 92,
    status: 'optimized',
    createdAt: new Date('2024-04-15'),
    wordCount: 145,
    estimatedDuration: 58
  },
  {
    id: '2',
    title: 'Money Mindset Shift',
    hook: 'Your relationship with money is broken...',
    body: 'Before you can earn more, you need to understand why you\'re stuck at your current level. It\'s not about skills or opportunities. It\'s about your money mindset. The wealthiest people think about money completely differently than everyone else. They see opportunities where others see risks. They invest when others save. But the biggest difference? They don\'t equate spending with guilt.',
    cta: 'Save this for later',
    category: 'Mindset',
    tags: ['wealth', 'mindset', 'financial'],
    language: 'en',
    score: 88,
    status: 'ready',
    createdAt: new Date('2024-04-14'),
    wordCount: 98,
    estimatedDuration: 42
  },
  {
    id: '3',
    title: 'AI Tools Breakdown',
    hook: 'Stop paying for tools you can use for free...',
    body: 'The AI revolution created a massive opportunity for content creators, but most are overpaying for basic tools. I tested 50+ AI tools and found that 80% of what you\'re paying for has free alternatives. Here\'s my complete breakdown: image generation has Stable Diffusion, video editing has CapCut\'s AI features, script writing has Claude, and thumbnail creation has Canva AI.',
    cta: 'Follow for weekly tool breakdowns',
    category: 'Tech',
    tags: ['AI', 'tools', 'productivity'],
    language: 'en',
    score: 95,
    status: 'optimized',
    createdAt: new Date('2024-04-13'),
    wordCount: 112,
    estimatedDuration: 48
  },
  {
    id: '4',
    title: 'Morning Routine Secrets',
    hook: 'The 5am club is lying to you...',
    body: 'Forget the 5am club. Forget cold showers and 10k steps before breakfast. The real secret to productive mornings isn\'t about waking up early - it\'s about what you do in the first 90 minutes after waking. Science shows your cortisol levels are highest right after waking, making this the ideal time for creative work, not exercise.',
    cta: 'Save this for tomorrow morning',
    category: 'Lifestyle',
    tags: ['productivity', 'routine', 'habits'],
    language: 'en',
    score: 85,
    status: 'draft',
    createdAt: new Date('2024-04-12'),
    wordCount: 89,
    estimatedDuration: 38
  },
  {
    id: '5',
    title: 'Viral Hook Formula',
    hook: 'I tested 1000 video hooks and found the pattern...',
    body: 'After testing over 1000 different video hooks across multiple niches, I found one formula that works 80% of the time: start with a contrarian statement, add a specific number, then hint at the lesson. Example: "Most productivity advice is making you less productive (3 studies prove it)." This pattern triggers curiosity, objection, and promise simultaneously.',
    cta: 'Comment "HOOK" for more formulas',
    category: 'Educational',
    tags: ['viral', 'hooks', 'engagement'],
    language: 'en',
    score: 91,
    status: 'optimized',
    createdAt: new Date('2024-04-11'),
    wordCount: 105,
    estimatedDuration: 45
  }
];

const categories = ['All', 'Educational', 'Mindset', 'Tech', 'Lifestyle'];
const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'score', label: 'Highest Score' },
  { value: 'duration', label: 'Shortest Duration' }
];

export default function ScriptsManager() {
  const [scripts] = useState<Script[]>(mockScripts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const filteredScripts = useMemo(() => {
    let filtered = scripts.filter(script => {
      const matchesSearch = script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            script.hook.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            script.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || script.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    switch (sortBy) {
      case 'score':
        return filtered.sort((a, b) => b.score - a.score);
      case 'duration':
        return filtered.sort((a, b) => a.estimatedDuration - b.estimatedDuration);
      default:
        return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }, [scripts, searchQuery, selectedCategory, sortBy]);

  const stats = useMemo(() => ({
    total: scripts.length,
    avgScore: Math.round(scripts.reduce((sum, s) => sum + s.score, 0) / scripts.length),
    totalWords: scripts.reduce((sum, s) => sum + s.wordCount, 0),
    avgDuration: Math.round(scripts.reduce((sum, s) => sum + s.estimatedDuration, 0) / scripts.length)
  }), [scripts]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Scripts Library
            </h1>
            <p className="text-gray-400 mt-1">AI-generated scripts ready for production</p>
          </div>
          <button 
            onClick={() => setShowTemplates(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Script
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Scripts</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Avg Score</div>
            <div className="text-2xl font-bold text-emerald-400">{stats.avgScore}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Words</div>
            <div className="text-2xl font-bold text-white">{stats.totalWords}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Avg Duration</div>
            <div className="text-2xl font-bold text-white">{stats.avgDuration}s</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search scripts, hooks, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:border-violet-600 focus:ring-1 focus:ring-violet-600 outline-none transition-colors"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:border-violet-600 focus:ring-1 focus:ring-violet-600 outline-none cursor-pointer"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:border-violet-600 focus:ring-1 focus:ring-violet-600 outline-none cursor-pointer"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredScripts.map(script => (
          <div 
            key={script.id}
            onClick={() => setSelectedScript(script)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-violet-600/50 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors mb-1">
                  {script.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    script.status === 'optimized' 
                      ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800'
                      : script.status === 'ready'
                      ? 'bg-violet-900/30 text-violet-400 border-violet-800'
                      : 'bg-gray-800 text-gray-400 border-gray-700'
                  }`}>
                    {script.status}
                  </span>
                  <span className="text-xs text-gray-500">{script.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-bold text-violet-400">{script.score}</span>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-3 line-clamp-2">{script.hook}</p>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex gap-1">
                {script.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-800 rounded text-gray-400">#{tag}</span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span>{script.wordCount} words</span>
                <span>•</span>
                <span>{script.estimatedDuration}s</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Script Detail Modal */}
      {selectedScript && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => setSelectedScript(null)}
        >
          <div 
            className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedScript.title}</h2>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      selectedScript.status === 'optimized' 
                        ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800'
                        : selectedScript.status === 'ready'
                        ? 'bg-violet-900/30 text-violet-400 border-violet-800'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      {selectedScript.status}
                    </span>
                    <span className="text-xs text-gray-500">{selectedScript.category}</span>
                    <div className="flex items-center gap-1 bg-violet-900/30 border border-violet-800 rounded px-2 py-0.5">
                      <svg className="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm font-bold text-violet-400">{selectedScript.score}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedScript(null)}
                  className="text-gray-500 hover:text-white transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Hook</h4>
                <p className="text-lg text-violet-400 font-medium">{selectedScript.hook}</p>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Script Body</h4>
                <p className="text-gray-300 leading-relaxed">{selectedScript.body}</p>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Call to Action</h4>
                <p className="text-emerald-400 font-medium">{selectedScript.cta}</p>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-gray-800">
                {selectedScript.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-400">#{tag}</span>
                ))}
                <span className="text-sm text-gray-500 ml-auto">
                  {selectedScript.wordCount} words • {selectedScript.estimatedDuration}s
                </span>
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors">
                Generate Video
              </button>
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors">
                Copy Script
              </button>
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors">
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}