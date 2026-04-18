import type { Language } from '@fvos/core';

// ==============================================================================
// TTS (Text-to-Speech) Pipeline
// ==============================================================================

export interface TTSRequest {
  text: string;
  language: Language;
  voiceId: string;
  provider: 'elevenlabs' | 'aws-polly';
  outputFormat?: 'mp3' | 'opus';
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}

export interface TTSResult {
  audioUrl: string;
  durationSeconds: number;
  sizeBytes: number;
  provider: string;
  voiceId: string;
  costUsd: number;
}

export interface TTSProvider {
  synthesize(request: TTSRequest): Promise<Buffer>;
  estimateDuration(wordCount: number): number;
}

/**
 * ElevenLabs TTS Provider
 * Docs: https://api.elevenlabs.io/docs
 */
export class ElevenLabsProvider implements TTSProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesize(request: TTSRequest): Promise<Buffer> {
    const url = `${this.baseUrl}/text-to-speech/${request.voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: request.text,
        model_id: request.language === 'ES' ? 'eleven_multilingual_v2' : 'eleven_monolingual_v1',
        voice_settings: {
          stability: request.stability ?? 0.5,
          similarity_boost: request.similarityBoost ?? 0.75,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS failed: ${response.status} — ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  estimateDuration(wordCount: number): number {
    // Average speaking rate at default speed: ~150 words/minute
    return (wordCount / 150) * 60;
  }
}

/**
 * AWS Polly TTS Provider (fallback)
 */
export class AWSPollyProvider implements TTSProvider {
  async synthesize(request: TTSRequest): Promise<Buffer> {
    // Dynamic import to avoid requiring AWS SDK if not configured
    const { PollyClient, SynthesizeSpeechCommand, OutputFormat } = await import(
      '@aws-sdk/client-polly'
    );

    const client = new PollyClient({
      region: process.env['AWS_POLLY_REGION'] ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env['AWS_POLLY_ACCESS_KEY_ID'] ?? '',
        secretAccessKey: process.env['AWS_POLLY_SECRET_ACCESS_KEY'] ?? '',
      },
    });

    const command = new SynthesizeSpeechCommand({
      Text: request.text,
      VoiceId: request.voiceId as 'Joanna',
      OutputFormat: OutputFormat.MP3,
      Engine: 'neural',
      LanguageCode: request.language === 'ES' ? 'es-US' : 'en-US',
    });

    const response = await client.send(command);

    if (!response.AudioStream) {
      throw new Error('AWS Polly returned no audio stream');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  estimateDuration(wordCount: number): number {
    return (wordCount / 150) * 60;
  }
}
