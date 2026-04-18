import type { Platform } from '@fvos/core';

// ==============================================================================
// Base Publisher Interface
// ==============================================================================

export interface PublishRequest {
  videoFilePath: string;
  thumbnailFilePath?: string;
  title: string;
  description: string;
  tags: string[];
  platform: Platform;
  scheduledAt?: Date;
  platformAccountId: string;
  accessToken: string;
  refreshToken?: string;
}

export interface PublishResult {
  platformVideoId: string;
  platformUrl: string;
  publishedAt: Date;
  status: 'PUBLISHED' | 'SCHEDULED';
}

export abstract class BasePublisher {
  abstract readonly platform: Platform;

  abstract publish(request: PublishRequest): Promise<PublishResult>;
  abstract refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }>;
  abstract getVideoStatus(platformVideoId: string, accessToken: string): Promise<'processing' | 'live' | 'failed'>;
}

export class PublisherError extends Error {
  constructor(
    message: string,
    public readonly platform: Platform,
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'PublisherError';
  }
}
