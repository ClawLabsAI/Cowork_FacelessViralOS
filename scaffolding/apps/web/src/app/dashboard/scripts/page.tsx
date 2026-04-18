'use client';

import { useEffect, useState, useCallback } from 'react';
import { listScripts, getScript } from '@/lib/api';

type Script = {
  id: string;
  topic: string;
  status: string;
  content: string | null;
  wordCount: number | null;
  estimatedCostUsd: number | null;
  actualCostUsd: number | null;
  modelUsed: string | null;
  format: string;
  tone: string;
  language: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  PROCESSING: 'bg-blue-900/40 text-blue-400 border-blue-800',
  COMPLETED: 'bg-green-900/40 text-green-400 border-green-800',
  FAILED: 'bg-red-900/40 text-red-400 border-red-800',
};

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selected, setSelected] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listScripts();
      setScripts(res.scripts ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function refresh() {
    setRefreshing(true);
    await load();
    if (selected) {
      try {
        const updated = await getScript(selected.id);
        setSelected(updated);
      } catch { /* ignore */ }
    }
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading scripts...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Scripts</h1>
          <p className="text-gray-400 text-sm mt-1">{scripts.length} scripts generated</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {scripts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-gray-500 text-4xl mb-4">✎</div>
          <div className="text-gray-400">No scripts yet. Generate one from the Overview page.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {scripts.map(script => (
            <div
              key={script.id}
              onClick={() => setSelected(selected?.id === script.id ? null : script)}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLORS[script.status] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      {script.status}
                    </span>
                    <span className="text-gray-600 text-xs">{script.format} · {script.tone} · {script.language.toUpperCase()}</span>
                  </div>
                  <h3 className="text-white font-medium truncate">{script.topic}</h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {script.wordCount && <span>{script.wordCount} words</span>}
                    {script.modelUsed && <span>{script.modelUsed}</span>}
                    {script.actualCostUsd != null
                      ? <span className="text-green-500">${script.actualCostUsd.toFixed(4)}</span>
                      : script.estimatedCostUsd != null
                      ? <span>~${script.estimatedCostUsd.toFixed(4)} est.</span>
                      : null}
                    <span>{new Date(script.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <span className="text-gray-600 text-sm">{selected?.id === script.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded content */}
              {selected?.id === script.id && script.content && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Generated Script</div>
                  <div className="bg-gray-800 rounded-lg p-4 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {script.content}
                  </div>
                </div>
              )}

              {selected?.id === script.id && !script.content && script.status !== 'FAILED' && (
                <div className="mt-4 pt-4 border-t border-gray-800 text-center">
                  <div className="text-gray-500 text-sm">
                    {script.status === 'QUEUED' || script.status === 'PROCESSING'
                      ? '⟳ Worker is processing this script... Click Refresh to check.'
                      : 'No content available.'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
