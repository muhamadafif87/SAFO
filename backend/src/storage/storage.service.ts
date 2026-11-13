import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint =
      this.configService.get<string>('SUPABASE_S3_ENDPOINT') ||
      'https://cyakqxtjwyettzyzysok.storage.supabase.co/storage/v1/s3';

    const region =
      this.configService.get<string>('SUPABASE_S3_REGION') || 'ap-southeast-1';

    const accessKeyId =
      this.configService.get<string>('SUPABASE_S3_ACCESS_KEY_ID') || '';

    const secretAccessKey =
      this.configService.get<string>('SUPABASE_S3_SECRET_ACCESS_KEY') || '';

    this.bucket =
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET') || 'products';

    // Base public URL for Supabase storage objects
    // Example: https://cyakqxtjwyettzyzysok.supabase.co/storage/v1/object/public
    const defaultPublicBase = endpoint.replace('.storage.supabase.co/storage/v1/s3', '.supabase.co/storage/v1/object/public');
    this.publicUrlBase =
      this.configService.get<string>('SUPABASE_STORAGE_PUBLIC_URL') || defaultPublicBase;

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  /**
   * Upload file to Supabase S3-compatible storage
   * @param file Express.Multer.File
   * @param folder optional subfolder or prefix
   * @returns Public URL of uploaded image
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'products'): Promise<string> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File tidak ditemukan atau buffer kosong');
    }

    // Determine extension
    const ext = path.extname(file.originalname) || this.getExtensionFromMime(file.mimetype);
    const filename = `${folder ? `${folder}/` : ''}${Date.now()}-${uuidv4()}${ext}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype || 'image/jpeg',
        }),
      );

      // Determine public URL
      // If publicUrlBase already includes the bucket name, don't duplicate it
      const baseClean = this.publicUrlBase.replace(/\/+$/, '');
      const hasBucketInBase = baseClean.endsWith(`/${this.bucket}`);
      const publicUrl = hasBucketInBase
        ? `${baseClean}/${filename}`
        : `${baseClean}/${this.bucket}/${filename}`;

      this.logger.log(`File uploaded successfully to Supabase S3: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`Gagal upload file ke Supabase S3: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Gagal mengunggah foto ke storage: ${error.message}`,
      );
    }
  }

  /**
   * Optional helper to delete old file when replaced
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    try {
      // Extract key from public URL
      const urlParts = fileUrl.split(`/${this.bucket}/`);
      if (urlParts.length < 2) return;
      const key = urlParts[1];

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Deleted file from Supabase S3: ${key}`);
    } catch (err) {
      this.logger.warn(`Gagal menghapus file lama dari storage: ${err.message}`);
    }
  }

  private getExtensionFromMime(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      default:
        return '.jpg';
    }
  }
}
