import { createReadStream } from 'fs';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

import type { PublishRequest, PublishResult } from './base.js';
import { BasePublisher, PublisherError } from './base.js';

// ==============================================================================
// YouTube Publisher Adapter
// Uses YouTube Data API v3
// ==============================================================================

export class YouTubePublisher extends BasePublisher {
  readonly platform = 'YOUTUBE' as const;

  private createOAuthClient(): OAuth2Client {
    return new google.auth.OAuth2(
      process.env['YOUTUBE_CLIENT_ID'],
      process.env['YOUTUBE_CLIENT_SECRET'],
      process.env['YOUTUBE_REDIRECT_URI'],
    );
  }

  async publish(request: PublishRequest): Promise<PublishResult> {
    const auth = this.createOAuthClient();
    auth.setCredentials({
      access_token: request.accessToken,
      refresh_token: request.refreshToken,
    });

    const youtube = google.youtube({ version: 'v3', auth });

    try {
      // Upload video
      const uploadResponse = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: request.title,
            description: request.description,
            tags: request.tags,
            categoryId: '22', // People & Blogs — adjust per niche
          },
          status: {
            privacyStatus: request.scheduledAt ? 'private' : 'public',
            publishAt: request.scheduledAt?.toISOString(),
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          mimeType: 'video/mp4',
          body: createReadStream(request.videoFilePath),
        },
      });

      const videoId = uploadResponse.data.id;
      if (!videoId) {
        throw new PublisherError(
          'YouTube upload succeeded but returned no video ID',
          'YOUTUBE',
          'MISSING_VIDEO_ID',
          false,
        );
      }

      // Upload thumbnail if provided
      if (request.thumbnailFilePath) {
        await youtube.thumbnails.set({
          videoId,
          media: {
            mimeType: 'image/jpeg',
            body: createReadStream(request.thumbnailFilePath),
          },
        }).catch((err: Error) => {
          // Thumbnail upload failure is non-fatal
          console.warn(`Thumbnail upload failed for ${videoId}: ${err.message}`);
        });
      }

      const publishedAt = new Date();

      return {
        platformVideoId: videoId,
        platformUrl: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt,
        status: request.scheduledAt ? 'SCHEDULED' : 'PUBLISHED',
      };
    } catch (err) {
      if (err instanceof PublisherError) throw err;
      throw this.mapError(err);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const auth = this.createOAuthClient();
    auth.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await auth.refreshAccessToken();

    if (!credentials.access_token) {
      throw new PublisherError(
        'Failed to refresh YouTube access token',
        'YOUTUBE',
        'REFRESH_FAILED',
        false,
      );
    }

    return {
      accessToken: credentials.access_token,
      expiresAt: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000),
    };
  }

  async getVideoStatus(
    platformVideoId: string,
    accessToken: string,
  ): Promise<'processing' | 'live' | 'failed'> {
    const auth = this.createOAuthClient();
    auth.setCredentials({ access_token: accessToken });

    const youtube = google.youtube({ version: 'v3', auth });

    const response = await youtube.videos.list({
      part: ['processingDetails', 'status'],
      id: [platformVideoId],
    });

    const video = response.data.items?.[0];
    if (!video) return 'failed';

    const processingStatus = video.processingDetails?.processingStatus;
    const uploadStatus = video.status?.uploadStatus;

    if (uploadStatus === 'failed' || processingStatus === 'failed') return 'failed';
    if (uploadStatus === 'processed' && processingStatus === 'succeeded') return 'live';
    return 'processing';
  }

  private mapError(err: unknown): PublisherError {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('quota')) {
      return new PublisherError(
        `YouTube API quota exceeded: ${message}`,
        'YOUTUBE',
        'QUOTA_EXCEEDED',
        true,
      );
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return new PublisherError(
        'YouTube authentication failed — token may be expired',
        'YOUTUBE',
        'AUTH_ERROR',
        false,
      );
    }

    return new PublisherError(
      `YouTube publish failed: ${message}`,
      'YOUTUBE',
      'UNKNOWN',
      true,
    );
  }
}
