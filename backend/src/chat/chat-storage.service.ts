import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatStorageService {
  private readonly logger = new Logger(ChatStorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly signedUrlTtlSeconds = 900; // 15 minutes

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('SUPABASE_S3_ENDPOINT');
    const region = this.configService.get<string>('SUPABASE_S3_REGION', 'ap-southeast-1');
    const accessKeyId = this.configService.get<string>('SUPABASE_S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('SUPABASE_S3_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_STORAGE_BUCKET', 'chat_attachments');

    if (accessKeyId && secretAccessKey && endpoint) {
      this.s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
    } else {
      this.logger.warn('S3 client configuration is incomplete. Storage features may fail.');
      this.s3Client = new S3Client({ region });
    }
  }

  validateImageFile(file: Express.Multer.File): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('File buffer is empty');
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE || file.buffer.length > MAX_SIZE) {
      throw new BadRequestException('Image size exceeds 5 MB limit');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    // Magic bytes verification
    const buffer = file.buffer;
    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isPng =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;

    const isWebp =
      buffer.length >= 12 &&
      buffer.toString('utf8', 0, 4) === 'RIFF' &&
      buffer.toString('utf8', 8, 12) === 'WEBP';

    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('File magic bytes do not match an approved image format');
    }
  }

  async uploadAttachment(
    conversationId: string,
    file: Express.Multer.File,
  ): Promise<{ storageKey: string; mimeType: string; fileSize: number; originalName: string }> {
    this.validateImageFile(file);

    const safeName = (file.originalname || 'image.jpg')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100);
    const storageKey = `chat-attachments/${conversationId}/${randomUUID()}-${safeName}`;

    try {
      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(putCommand);

      return {
        storageKey,
        mimeType: file.mimetype,
        fileSize: file.size,
        originalName: safeName,
      };
    } catch (error) {
      this.logger.error(`Failed to upload attachment to S3: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload image attachment to storage');
    }
  }

  async generateSignedUrl(storageKey: string): Promise<{ signedUrl: string; expiresAt: Date }> {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });

      const signedUrl = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: this.signedUrlTtlSeconds,
      });

      const expiresAt = new Date(Date.now() + this.signedUrlTtlSeconds * 1000);
      return { signedUrl, expiresAt };
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for key ${storageKey}: ${error.message}`);
      return { signedUrl: '', expiresAt: new Date() };
    }
  }
}
