// ==============================================================================
// Cloud Storage — Cloudflare R2 (S3-compatible) adapter
// ==============================================================================

export interface StorageUploadOptions {
  key: string;
  data: Buffer | Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
  public?: boolean;
}

export interface StorageUploadResult {
  key: string;
  url: string;
  sizeBytes: number;
}

export class R2StorageClient {
  private readonly accountId: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor() {
    this.accountId = process.env['CLOUDFLARE_R2_ACCOUNT_ID'] ?? '';
    this.accessKeyId = process.env['CLOUDFLARE_R2_ACCESS_KEY_ID'] ?? '';
    this.secretAccessKey = process.env['CLOUDFLARE_R2_SECRET_ACCESS_KEY'] ?? '';
    this.bucketName = process.env['CLOUDFLARE_R2_BUCKET_NAME'] ?? '';
    this.publicUrl = process.env['CLOUDFLARE_R2_PUBLIC_URL'] ?? '';

    if (!this.accountId || !this.accessKeyId || !this.secretAccessKey) {
      console.warn('R2 credentials not fully configured — storage operations will fail');
    }
  }

  private getS3Client() {
    const { S3Client } = require('@aws-sdk/client-s3') as typeof import('@aws-sdk/client-s3');
    return new S3Client({
      region: 'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = this.getS3Client();

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: options.key,
        Body: options.data,
        ContentType: options.contentType,
        Metadata: options.metadata,
      }),
    );

    const url = `${this.publicUrl}/${options.key}`;

    return {
      key: options.key,
      url,
      sizeBytes: options.data.length,
    };
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = this.getS3Client();

    await client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
