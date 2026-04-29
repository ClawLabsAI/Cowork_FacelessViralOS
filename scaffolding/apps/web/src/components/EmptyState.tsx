'use client';

import React from 'react';

type EmptyStateType = 
  | 'channels' 
  | 'videos' 
  | 'analytics' 
  | 'search' 
  | 'scripts' 
  | 'affiliates' 
  | 'general';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

// SVG Illustrations for different empty states
const EmptyStateSVG: Record<EmptyStateType, React.ReactNode> = {
  channels: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6">
      {/* Monitor/Screen */}
      <rect x="20" y="25" width="80" height="55" rx="4" stroke="currentColor" strokeWidth="2" fill="none" className="text-violet-600"/>
      <rect x="25" y="30" width="70" height="45" rx="2" fill="currentColor" fillOpacity="0.1" className="text-violet-400"/>
      {/* Play button */}
      <circle cx="60" cy="52" r="15" fill="currentColor" fillOpacity="0.2" className="text-violet-400"/>
      <path d="M55 45L68 52L55 59V45Z" fill="currentColor" className="text-violet-400"/>
      {/* Stand */}
      <rect x="55" y="80" width="10" height="10" fill="currentColor" fillOpacity="0.3" className="text-violet-500"/>
      <rect x="45" y="90" width="30" height="4" rx="2" fill="currentColor" fillOpacity="0.3" className="text-violet-500"/>
      {/* Floating elements */}
      <circle cx="15" cy="40" r="3" fill="currentColor" fillOpacity="0.4" className="text-violet-500 animate-float"/>
      <circle cx="105" cy="35" r="4" fill="currentColor" fillOpacity="0.3" className="text-fuchsia-500 animate-float-delay"/>
      <rect x="95" y="65" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.3" className="text-emerald-500 animate-float-delay-2"/>
    </svg>
  ),
  videos: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6">
      {/* Film strip */}
      <rect x="25" y="20" width="70" height="80" rx="4" stroke="currentColor" strokeWidth="2" fill="none" className="text-fuchsia-600"/>
      {/* Film holes */}
      <rect x="30" y="25" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="30" y="35" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="30" y="45" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="30" y="55" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="30" y="65" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="30" y="75" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="30" y="85" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="82" y="25" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="82" y="35" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="82" y="45" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="82" y="55" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="82" y="65" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="82" y="75" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      <rect x="82" y="85" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400"/>
      {/* Play icon in center */}
      <circle cx="60" cy="60" r="20" fill="currentColor" fillOpacity="0.15" className="text-fuchsia-400"/>
      <path d="M55 50L72 60L55 70V50Z" fill="currentColor" className="text-fuchsia-400"/>
      {/* Floating elements */}
      <circle cx="15" cy="50" r="4" fill="currentColor" fillOpacity="0.3" className="text-fuchsia-500 animate-float"/>
      <circle cx="105" cy="70" r="5" fill="currentColor" fillOpacity="0.3" className="text-violet-500 animate-float-delay"/>
    </svg>
  ),
  analytics: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6">
      {/* Chart background */}
      <rect x="20" y="30" width="80" height="60" rx="4" stroke="currentColor" strokeWidth="2" fill="none" className="text-emerald-600"/>
      {/* Grid lines */}
      <line x1="30" y1="45" x2="90" y2="45" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" className="text-emerald-400"/>
      <line x1="30" y1="60" x2="90" y2="60" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" className="text-emerald-400"/>
      <line x1="30" y1="75" x2="90" y2="75" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.3" className="text-emerald-400"/>
      {/* Bar chart bars */}
      <rect x="35" y="65" width="10" height="20" rx="2" fill="currentColor" fillOpacity="0.3" className="text-emerald-400"/>
      <rect x="50" y="50" width="10" height="35" rx="2" fill="currentColor" fillOpacity="0.5" className="text-emerald-400"/>
      <rect x="65" y="40" width="10" height="45" rx="2" fill="currentColor" fillOpacity="0.7" className="text-emerald-400"/>
      <rect x="80" y="35" width="10" height="50" rx="2" fill="currentColor" className="text-emerald-400"/>
      {/* Arrow going up */}
      <path d="M95 85L105 75L95 75L95 65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"/>
      {/* Floating elements */}
      <circle cx="15" cy="35" r="4" fill="currentColor" fillOpacity="0.4" className="text-emerald-500 animate-float"/>
      <rect x="100" y="25" width="10" height="10" rx="2" fill="currentColor" fillOpacity="0.3" className="text-violet-500 animate-float-delay"/>
    </svg>
  ),
  search: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6">
      {/* Magnifying glass */}
      <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="3" fill="none" className="text-amber-500"/>
      <line x1="68" y1="68" x2="85" y2="85" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-amber-500"/>
      {/* Question mark */}
      <text x="50" y="56" textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor" className="text-amber-400">?</text>
      {/* Floating elements */}
      <circle cx="20" cy="30" r="3" fill="currentColor" fillOpacity="0.4" className="text-amber-500 animate-float"/>
      <circle cx="95" cy="45" r="4" fill="currentColor" fillOpacity="0.3" className="text-violet-500 animate-float-delay"/>
      <rect x="85" y="80" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.3" className="text-fuchsia-500 animate-float-delay-2"/>
    </svg>
  ),
  scripts: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6">
      {/* Document */}
      <rect x="30" y="20" width="60" height="80" rx="4" stroke="currentColor" strokeWidth="2" fill="none" className="text-sky-500"/>
      {/* Lines */}
      <line x1="40" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" className="text-sky-400"/>
      <line x1="40" y1="52" x2="75" y2="52" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" className="text-sky-400"/>
      <line x1="40" y1="64" x2="70" y2="64" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" className="text-sky-400"/>
      <line x1="40" y1="76" x2="60" y2="76" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" className="text-sky-400"/>
      {/* Pencil */}
      <rect x="75" y="70" width="8" height="30" rx="2" transform="rotate(-45 75 70)" fill="currentColor" fillOpacity="0.6" className="text-sky-400"/>
      <polygon points="95,85 100,90 95,95 90,90" fill="currentColor" className="text-amber-500"/>
      {/* Floating elements */}
      <circle cx="20" cy="45" r="4" fill="currentColor" fillOpacity="0.4" className="text-sky-500 animate-float"/>
      <circle cx="100" cy="30" r="5" fill="currentColor" fillOpacity="0.3" className="text-violet-500 animate-float-delay"/>
    </svg>
  ),
  affiliates: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6">
      {/* Chain links */}
      <ellipse cx="45" cy="50" rx="15" ry="12" stroke="currentColor" strokeWidth="3" fill="none" className="text-rose-500"/>
      <ellipse cx="60" cy="65" rx="15" ry="12" stroke="currentColor" strokeWidth="3" fill="none" className="text-rose-400"/>
      <ellipse cx="75" cy="50" rx="15" ry="12" stroke="currentColor" strokeWidth="3" fill="none" className="text-rose-300"/>
      {/* Money symbol */}
      <circle cx="85" cy="30" r="15" fill="currentColor" fillOpacity="0.2" className="text-emerald-400"/>
      <text x="85" y="36" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor" className="text-emerald-400">$</text>
      {/* Floating elements */}
      <circle cx="20" cy="75" r="4" fill="currentColor" fillOpacity="0.4" className="text-rose-500 animate-float"/>
      <rect x="95" y="70" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.3" className="text-violet-500 animate-float-delay"/>
    </svg>
  ),
  general: (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-6">
      {/* Box/Inbox */}
      <path d="M20 40 L60 25 L100 40 L100 85 L60 100 L20 85 Z" stroke="currentColor" strokeWidth="2" fill="none" className="text-violet-500"/>
      <path d="M20 40 L60 55 L100 40" stroke="currentColor" strokeWidth="2" fill="none" className="text-violet-400"/>
      {/* Star sparkles */}
      <circle cx="30" cy="20" r="4" fill="currentColor" fillOpacity="0.5" className="text-violet-400 animate-float"/>
      <circle cx="90" cy="25" r="5" fill="currentColor" fillOpacity="0.4" className="text-fuchsia-400 animate-float-delay"/>
      <circle cx="105" cy="70" r="4" fill="currentColor" fillOpacity="0.4" className="text-emerald-400 animate-float-delay-2"/>
      {/* Sparkle */}
      <path d="M15 60 L20 65 L15 70 L10 65 Z" fill="currentColor" fillOpacity="0.5" className="text-amber-400"/>
    </svg>
  ),
};

const defaultContent: Record<EmptyStateType, { title: string; description: string }> = {
  channels: {
    title: 'No channels yet',
    description: 'Create your first channel to start generating viral content.'
  },
  videos: {
    title: 'No videos generated',
    description: 'Use the video pipeline to generate your first viral video.'
  },
  analytics: {
    title: 'No data to display',
    description: 'Analytics will appear once you start generating content.'
  },
  search: {
    title: 'No results found',
    description: 'Try adjusting your search terms or filters.'
  },
  scripts: {
    title: 'No scripts yet',
    description: 'Create your first script to start your content pipeline.'
  },
  affiliates: {
    title: 'No affiliate links',
    description: 'Connect affiliate programs to start earning.'
  },
  general: {
    title: 'Nothing here yet',
    description: 'Check back later or try adding some content.'
  },
};

export function EmptyState({ type, title, description, action, secondaryAction }: EmptyStateProps) {
  const content = defaultContent[type];
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {/* SVG Illustration with animation */}
      <div className="relative">
        <div className="text-violet-500">
          {EmptyStateSVG[type]}
        </div>
        {/* Animated background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        </div>
      </div>

      {/* Title and Description */}
      <h3 className="text-xl font-semibold text-white mb-2">
        {title || content.title}
      </h3>
      <p className="text-gray-400 text-sm max-w-sm mb-6">
        {description || content.description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Card wrapper for empty states
export function EmptyStateCard({ type, title, description, action }: Omit<EmptyStateProps, 'secondaryAction'>) {
  return (
    <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl">
      <EmptyState type={type} title={title} description={description} action={action} />
    </div>
  );
}

// Compact inline empty state
export function EmptyInline({ type, message }: { type: EmptyStateType; message?: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-center">
      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
        {type === 'search' ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <span className="text-gray-500 text-sm">{message || defaultContent[type].title}</span>
    </div>
  );
}

export default EmptyState;