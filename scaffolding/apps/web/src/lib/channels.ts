// Channel store — localStorage-backed for Phase 1 private tool

export type ContentType = 'SHORT' | 'LONG' | 'BOTH';
export type Platform = 'YouTube' | 'TikTok' | 'Instagram';
export type Language = 'English' | 'Spanish';
export type VoiceProvider = 'edge-tts' | 'ElevenLabs' | 'Local';
export type Pipeline = 'MiniMax' | 'MoneyPrinter' | 'Hybrid';
export type Tier = 'FREE' | 'ECONOMICAL' | 'OPTIMIZED' | 'PREMIUM' | 'ULTRA' | 'MONEYPRINTER';

export interface Channel {
  id: string;
  name: string;
  niche: string;
  nichePrompt: string;          // AI-generated editable master prompt
  contentType: ContentType;
  platforms: Platform[];
  language: Language;
  audience: string;
  contentPillars: string[];
  hooks: string[];
  cta: string;
  keywords: string[];
  voiceProvider: VoiceProvider;
  voiceId: string;
  tier: Tier;
  pipeline: Pipeline;
  autopilot: boolean;
  autopilotFreq: 'daily' | '2x-day' | 'weekly';
  autopilotTime: string;
  monetization: string[];
  costLimit: number;            // monthly USD
  status: 'Active' | 'Paused' | 'Draft';
  videoCount: number;
  createdAt: string;
}

const KEY = 'fvos_channels';

export function getChannels(): Channel[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch { return []; }
}

export function saveChannels(channels: Channel[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(channels));
}

export function getChannel(id: string): Channel | undefined {
  return getChannels().find(c => c.id === id);
}

export function upsertChannel(channel: Channel): void {
  const channels = getChannels();
  const idx = channels.findIndex(c => c.id === channel.id);
  if (idx >= 0) channels[idx] = channel;
  else channels.push(channel);
  saveChannels(channels);
}

export function deleteChannel(id: string): void {
  saveChannels(getChannels().filter(c => c.id !== id));
}

export function createDefaultChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: crypto.randomUUID(),
    name: '',
    niche: '',
    nichePrompt: '',
    contentType: 'SHORT',
    platforms: ['YouTube'],
    language: 'English',
    audience: '',
    contentPillars: [],
    hooks: [],
    cta: 'Follow for more',
    keywords: [],
    voiceProvider: 'edge-tts',
    voiceId: 'en-US-GuyNeural',
    tier: 'ECONOMICAL',
    pipeline: 'MoneyPrinter',
    autopilot: false,
    autopilotFreq: 'daily',
    autopilotTime: '09:00',
    monetization: [],
    costLimit: 25,
    status: 'Draft',
    videoCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
