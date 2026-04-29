'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { EmptyState } from '@/components/EmptyState';
import { Gamification, StreakBadge, XPPoints } from '@/components/Gamification';
import { ScriptsManager } from '@/components/ScriptsManager';

// Register service worker for PWA
function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in window.navigator) {
    window.addEventListener('load', () => {
      window.navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful');
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    });
  }
}

export default function HomePage() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    registerServiceWorker();
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="p-6">
            {/* Dashboard Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-400">Welcome back to Faceless Viral OS</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Channels</div>
                <div className="text-3xl font-bold text-white">0</div>
                <div className="mt-2 flex items-center gap-2">
                  <StreakBadge streak={0} size="sm" />
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Scripts</div>
                <div className="text-3xl font-bold text-white">0</div>
                <div className="mt-2">
                  <XPPoints xp={0} size="sm" />
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Videos</div>
                <div className="text-3xl font-bold text-white">0</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Score</div>
                <div className="text-3xl font-bold text-violet-400">--</div>
              </div>
            </div>

            {/* Empty State - Channels */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Your Channels</h2>
              <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl">
                <EmptyState
                  type="channels"
                  title="No channels yet"
                  description="Create your first channel to start the content machine."
                  action={{
                    label: "Create Channel",
                    onClick: () => setCurrentView('channels')
                  }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setCurrentView('channels')}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-violet-600 transition-all text-left"
                >
                  <div className="text-2xl mb-3">📺</div>
                  <div className="text-white font-semibold mb-1">Channel Source</div>
                  <div className="text-gray-400 text-sm">Create new channels</div>
                </button>
                <button
                  onClick={() => setCurrentView('pipeline')}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-violet-600 transition-all text-left"
                >
                  <div className="text-2xl mb-3">🎬</div>
                  <div className="text-white font-semibold mb-1">Video Pipeline</div>
                  <div className="text-gray-400 text-sm">Generate content</div>
                </button>
                <button
                  onClick={() => setCurrentView('scripts')}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-violet-600 transition-all text-left"
                >
                  <div className="text-2xl mb-3">✍️</div>
                  <div className="text-white font-semibold mb-1">Scripts</div>
                  <div className="text-gray-400 text-sm">View script library</div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'channels':
        return (
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Channel Source</h1>
              <p className="text-gray-400">Create and manage your content channels</p>
            </div>

            {/* Channel Creation Methods */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: '🤖', title: 'AI Suggestions', desc: 'AI recommends niches based on trends' },
                { icon: '🔍', title: 'Spy Channels', desc: 'Analyze and clone successful channels' },
                { icon: '✍️', title: 'From Scratch', desc: 'Create custom channel from scratch' },
                { icon: '🛒', title: 'TikTok Shop', desc: 'Create channel from TikTok products' },
                { icon: '✂️', title: 'Clipping', desc: 'Create from existing video clips' },
                { icon: '🔄', title: 'Clone Channel', desc: 'Duplicate existing channel setup' },
              ].map((method, idx) => (
                <button
                  key={idx}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-violet-600 transition-all text-left group"
                >
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{method.icon}</div>
                  <div className="text-white font-semibold mb-1">{method.title}</div>
                  <div className="text-gray-400 text-sm">{method.desc}</div>
                </button>
              ))}
            </div>

            {/* Channel Directory */}
            <EmptyState
              type="channels"
              title="No channels created"
              description="Create your first channel to get started."
            />
          </div>
        );

      case 'pipeline':
        return (
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Video Pipeline</h1>
              <p className="text-gray-400">Generate viral content for your channels</p>
            </div>

            {/* Pipeline Steps */}
            <div className="grid grid-cols-5 gap-2 mb-8">
              {['Channel', 'Duration', 'Script', 'Score', 'Preview'].map((step, idx) => (
                <div
                  key={step}
                  className={`bg-gray-900 border rounded-xl p-4 text-center ${
                    idx === 0 ? 'border-violet-600' : 'border-gray-800'
                  }`}
                >
                  <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                    idx === 0 ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="text-sm text-gray-400">{step}</div>
                </div>
              ))}
            </div>

            <EmptyState
              type="videos"
              title="No videos generated"
              description="Start the pipeline to generate your first video."
              action={{
                label: "Start Pipeline",
                onClick: () => {}
              }}
            />
          </div>
        );

      case 'scripts':
        return <ScriptsManager />;

      case 'analytics':
        return (
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
              <p className="text-gray-400">Track your content performance</p>
            </div>
            <EmptyState
              type="analytics"
              title="No data available"
              description="Analytics will appear once you start generating content."
            />
          </div>
        );

      case 'autopilot':
        return (
          <div className="p-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">AutoPilot</h1>
              <p className="text-gray-400">Automated content generation</p>
            </div>

            {/* AutoPilot Status */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">AutoPilot Status</h3>
                  <p className="text-gray-400 text-sm">Automatically generate content</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm">OFF</span>
                  <div className="w-14 h-8 bg-gray-800 rounded-full p-1 cursor-pointer">
                    <div className="w-6 h-6 bg-gray-400 rounded-full transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                <div
                  key={day}
                  className={`bg-gray-900 border rounded-xl p-4 text-center ${
                    idx < 5 ? 'border-violet-600' : 'border-gray-800'
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-2">{day}</div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    {idx < 5 && <div className="h-full bg-violet-600 w-3/4" />}
                  </div>
                </div>
              ))}
            </div>

            <EmptyState
              type="general"
              title="AutoPilot not configured"
              description="Set up your autopilot schedule to start automated content generation."
            />
          </div>
        );

      case 'achievements':
        return <Gamification />;

      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400">Configure your workspace</p>
          </div>
        );

      case 'help':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-2">Help</h1>
            <p className="text-gray-400">Get help with Faceless Viral OS</p>
          </div>
        );

      default:
        return (
          <div className="p-6">
            <EmptyState
              type="general"
              title="Coming soon"
              description="This feature is under development."
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isPremium={true}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}