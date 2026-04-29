'use client';

import React, { useState, useEffect } from 'react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'creation' | 'engagement' | 'monetization' | 'consistency';
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  reward: number;
}

interface GamificationData {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  achievements: Achievement[];
}

// Mock gamification data
const initialData: GamificationData = {
  xp: 2450,
  level: 8,
  streak: 12,
  longestStreak: 23,
  lastActiveDate: new Date().toISOString().split('T')[0],
  achievements: [
    {
      id: 'first-channel',
      title: 'First Steps',
      description: 'Create your first channel',
      icon: '🎬',
      category: 'creation',
      requirement: 1,
      progress: 1,
      unlocked: true,
      unlockedAt: new Date('2024-04-01'),
      reward: 100
    },
    {
      id: 'channel-master',
      title: 'Channel Master',
      description: 'Create 5 channels',
      icon: '🏆',
      category: 'creation',
      requirement: 5,
      progress: 3,
      unlocked: false,
      reward: 250
    },
    {
      id: 'video-creator',
      title: 'Video Visionary',
      description: 'Generate 10 videos',
      icon: '🎥',
      category: 'creation',
      requirement: 10,
      progress: 7,
      unlocked: false,
      reward: 300
    },
    {
      id: 'script-wizard',
      title: 'Script Wizard',
      description: 'Create 25 scripts',
      icon: '✍️',
      category: 'creation',
      requirement: 25,
      progress: 15,
      unlocked: false,
      reward: 400
    },
    {
      id: 'viral-spark',
      title: 'Viral Spark',
      description: 'Get a video to 1000 views',
      icon: '🔥',
      category: 'engagement',
      requirement: 1000,
      progress: 0,
      unlocked: false,
      reward: 500
    },
    {
      id: 'engagement-king',
      title: 'Engagement King',
      description: 'Achieve 10% engagement rate',
      icon: '👑',
      category: 'engagement',
      requirement: 10,
      progress: 6.5,
      unlocked: false,
      reward: 450
    },
    {
      id: 'money-maker',
      title: 'Money Maker',
      description: 'Earn $100 from content',
      icon: '💰',
      category: 'monetization',
      requirement: 100,
      progress: 45,
      unlocked: false,
      reward: 600
    },
    {
      id: 'affiliate-star',
      title: 'Affiliate Star',
      description: 'Make first affiliate sale',
      icon: '⭐',
      category: 'monetization',
      requirement: 1,
      progress: 0,
      unlocked: false,
      reward: 200
    },
    {
      id: 'streak-week',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '⚡',
      category: 'consistency',
      requirement: 7,
      progress: 12,
      unlocked: true,
      unlockedAt: new Date('2024-04-10'),
      reward: 150
    },
    {
      id: 'streak-month',
      title: 'Month Master',
      description: 'Maintain a 30-day streak',
      icon: '🌟',
      category: 'consistency',
      requirement: 30,
      progress: 12,
      unlocked: false,
      reward: 500
    },
    {
      id: 'consistency-king',
      title: 'Consistency King',
      description: 'Post for 100 days',
      icon: '📅',
      category: 'consistency',
      requirement: 100,
      progress: 45,
      unlocked: false,
      reward: 800
    },
    {
      id: 'high-scorer',
      title: 'High Scorer',
      description: 'Achieve a script score of 95+',
      icon: '💎',
      category: 'engagement',
      requirement: 95,
      progress: 0,
      unlocked: false,
      reward: 350
    }
  ]
};

const categoryColors: Record<Achievement['category'], string> = {
  creation: 'text-violet-400 bg-violet-900/30 border-violet-800',
  engagement: 'text-amber-400 bg-amber-900/30 border-amber-800',
  monetization: 'text-emerald-400 bg-emerald-900/30 border-emerald-800',
  consistency: 'text-sky-400 bg-sky-900/30 border-sky-800'
};

const categoryLabels: Record<Achievement['category'], string> = {
  creation: 'Creation',
  engagement: 'Engagement',
  monetization: 'Monetization',
  consistency: 'Consistency'
};

export function Gamification() {
  const [data, setData] = useState<GamificationData>(initialData);
  const [activeCategory, setActiveCategory] = useState<Achievement['category'] | 'all'>('all');
  const [showUnlocked, setShowUnlocked] = useState(false);
  const [animateXp, setAnimateXp] = useState(false);

  // Simulate XP gain
  const handleAddXp = (amount: number) => {
    setData(prev => {
      const newXp = prev.xp + amount;
      const xpForNextLevel = prev.level * 500;
      const newLevel = Math.floor(newXp / 500) + 1;
      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        achievements: prev.achievements.map(a => ({
          ...a,
          progress: Math.min(a.progress + (amount / 100), a.requirement)
        }))
      };
    });
    setAnimateXp(true);
    setTimeout(() => setAnimateXp(false), 500);
  };

  const filteredAchievements = data.achievements.filter(a => {
    const categoryMatch = activeCategory === 'all' || a.category === activeCategory;
    const statusMatch = showUnlocked ? a.unlocked : !a.unlocked;
    return categoryMatch && statusMatch;
  });

  const unlockedCount = data.achievements.filter(a => a.unlocked).length;
  const totalReward = data.achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.reward, 0);
const xpForNextLevel = data.level * 500;
  const xpProgress = (data.xp % xpForNextLevel) / xpForNextLevel * 100;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          Achievements & Rewards
        </h1>
        <p className="text-gray-400 mt-1">Track your progress and unlock rewards</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {/* Level Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Level</div>
            <div className="text-4xl font-bold text-amber-400">{data.level}</div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>XP Progress</span>
                <span>{data.xp % xpForNextLevel} / {xpForNextLevel}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ${animateXp ? 'scale-x-110' : ''}`}
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* XP Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total XP</div>
          <div className={`text-3xl font-bold text-violet-400 transition-transform ${animateXp ? 'scale-110' : ''}`}>
            {data.xp.toLocaleString()}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>+{totalReward} earned</span>
          </div>
        </div>

        {/* Streak Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-500/10 rounded-full" />
          <div className="relative">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Streak</div>
            <div className="text-3xl font-bold text-orange-400">{data.streak}</div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-2xl">🔥</span>
              <span className="text-xs text-gray-400">Best: {data.longestStreak} days</span>
            </div>
          </div>
        </div>

        {/* Achievements Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Unlocked</div>
          <div className="text-3xl font-bold text-emerald-400">{unlockedCount}</div>
          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            <span>of {data.achievements.length} achievements</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => { setActiveCategory('all'); setShowUnlocked(false); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'all' && !showUnlocked
              ? 'bg-violet-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          All Locked
        </button>
        {(['creation', 'engagement', 'monetization', 'consistency'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setShowUnlocked(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat
                ? categoryColors[cat]
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => setShowUnlocked(!showUnlocked)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showUnlocked
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Show Unlocked ({unlockedCount})
          </button>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map(achievement => (
          <div
            key={achievement.id}
            className={`relative p-5 rounded-xl border transition-all ${
              achievement.unlocked
                ? 'bg-gray-900/80 border-gray-700 opacity-80'
                : 'bg-gray-900 border-gray-800 hover:border-violet-600/50'
            }`}
          >
            {/* Progress overlay for locked */}
            {!achievement.unlocked && (
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent rounded-xl" />
            )}
            
            <div className="relative">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30'
                    : 'bg-gray-800 border border-gray-700'
                }`}>
                  {achievement.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${achievement.unlocked ? 'text-amber-400' : 'text-white'}`}>
                      {achievement.title}
                    </h3>
                    {achievement.unlocked && (
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{achievement.description}</p>
                  
                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className={categoryColors[achievement.category].split(' ')[0]}>
                        {categoryLabels[achievement.category]}
                      </span>
                      <span>{Math.round(achievement.progress)} / {achievement.requirement}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          achievement.unlocked
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : categoryColors[achievement.category].split(' ')[0].replace('text-', 'bg-')
                        }`}
                        style={{ width: `${Math.min((achievement.progress / achievement.requirement) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Reward */}
                  <div className="flex items-center gap-1 text-xs">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-amber-400">+{achievement.reward} XP reward</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simulate XP gain (for demo) */}
      <div className="mt-8 p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
        <p className="text-xs text-gray-500 mb-3">Demo: Simulate XP gains</p>
        <div className="flex gap-3">
          <button
            onClick={() => handleAddXp(50)}
            className="px-3 py-1.5 bg-violet-600/20 text-violet-400 text-xs rounded-lg hover:bg-violet-600/30 transition-colors"
          >
            +50 XP
          </button>
          <button
            onClick={() => handleAddXp(100)}
            className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 text-xs rounded-lg hover:bg-emerald-600/30 transition-colors"
          >
            +100 XP
          </button>
          <button
            onClick={() => handleAddXp(250)}
            className="px-3 py-1.5 bg-amber-600/20 text-amber-400 text-xs rounded-lg hover:bg-amber-600/30 transition-colors"
          >
            +250 XP
          </button>
        </div>
      </div>
    </div>
  );
}

// Streak Badge Component
export function StreakBadge({ streak, size = 'md' }: { streak: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2'
  };

  const emojiSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const getStreakLevel = () => {
    if (streak >= 30) return { color: 'from-amber-500 to-orange-500', label: 'Legendary' };
    if (streak >= 14) return { color: 'from-violet-500 to-fuchsia-500', label: 'On Fire' };
    if (streak >= 7) return { color: 'from-orange-500 to-red-500', label: 'Hot' };
    if (streak >= 3) return { color: 'from-yellow-500 to-amber-500', label: 'Warming' };
    return { color: 'from-gray-600 to-gray-500', label: 'Starting' };
  };

  const level = getStreakLevel();

  return (
    <div className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${level.color} ${sizeClasses[size]} font-bold text-white shadow-lg`}>
      <span className={emojiSize[size]}>🔥</span>
      <span>{streak}</span>
      {size === 'lg' && (
        <span className="text-xs opacity-80 ml-1">{level.label}</span>
      )}
    </div>
  );
}

// XP Points Display
export function XPPoints({ xp, size = 'md', showLabel = true }: { xp: number; size?: 'sm' | 'md' | 'lg'; showLabel?: boolean }) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const getLevel = () => Math.floor(xp / 500) + 1;

  return (
    <div className={`inline-flex items-center gap-2 ${sizeClasses[size]} font-bold`}>
      <span className="text-violet-400">⚡</span>
      <span className="text-white">{xp.toLocaleString()}</span>
      {showLabel && (
        <span className="text-xs text-gray-400">XP</span>
      )}
      <span className="text-xs text-gray-500 ml-2">
        Lvl {getLevel()}
      </span>
    </div>
  );
}

export default Gamification;