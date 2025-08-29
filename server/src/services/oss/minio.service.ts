import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutBucketPolicyCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// 如果找不到模块，请先安装:
// npm install @aws-sdk/client-s3
// 或
// yarn add @aws-sdk/client-s3
import { Readable } from 'stream';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OssService, UploadResult, FileInfo } from './oss.service';
import logger from '@/utils/logger';

export interface MinIOConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export class MinIOService implements OssService {
  public bucketName: string;
  private s3Client: S3Client;
  private bucket: string;
  private config: MinIOConfig;

  constructor(config: MinIOConfig) {
    this.config = config;
    this.bucket = config.bucket;
    this.bucketName = config.bucket;
    this.s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      forcePathStyle: true, // MinIO需要路径样式访问
    });
  }

  /**
   * 初始化存储桶
   */
  async initializeBucket(): Promise<void> {
    try {
      const command = new CreateBucketCommand({
        Bucket: this.bucket
      });
      await this.s3Client.send(command);
      console.log(`MinIO Bucket ${this.bucket} created successfully`);
    } catch (error: any) {
      if (error.name === 'BucketAlreadyOwnedByYou' || error.name === 'BucketAlreadyExists') {
        console.log(`MinIO Bucket ${this.bucket} already exists`);
      } else {
        console.error('Error creating MinIO bucket:', error);
        throw error;
      }
    }

    // 设置bucket策略，允许公共读取
    try {
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${this.bucket}/*`
          }
        ]
      };

      const policyCommand = new PutBucketPolicyCommand({
        Bucket: this.bucket,
        Policy: JSON.stringify(bucketPolicy)
      });

      await this.s3Client.send(policyCommand);
      console.log(`MinIO Bucket ${this.bucket} policy set successfully`);
    } catch (error) {
      console.error('Error setting MinIO bucket policy:', error);
      // 不抛出错误，因为策略设置失败不应该阻止服务启动
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(
    file: Buffer | Readable,
    originalName: string,
    contentType: string,
    folder?: string
  ): Promise<UploadResult> {
    try {
      // 生成唯一文件名
      const fileExtension = path.extname(originalName);
      const fileName = `${uuidv4()}${fileExtension}`;
      const key = folder ? `${folder}/${fileName}` : fileName;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
          originalName: encodeURIComponent(originalName),
          uploadTime: new Date().toISOString()
        }
      });

      await this.s3Client.send(command);

      const url = this.getFileUrl(key);

      // 对于流式上传，我们无法预先知道大小
      const headCommand = new HeadObjectCommand({ Bucket: this.bucket, Key: key });
      const { ContentLength } = await this.s3Client.send(headCommand);

      return {
        key,
        url,
        size: ContentLength || 0,
        contentType
      };
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new Error('Failed to upload file to MinIO');
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('File not found');
      }

      // 将流转换为Buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as Readable;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading file from MinIO:', error);
      throw new Error('Failed to download file from MinIO');
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      throw new Error('Failed to delete file from MinIO');
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'application/octet-stream',
        url: this.getFileUrl(key)
      };
    } catch (error) {
      console.error('Error getting file info from MinIO:', error);
      throw new Error('Failed to get file info from MinIO');
    }
  }

  /**
   * 列出文件
   */
  async listFiles(prefix?: string, maxKeys: number = 100): Promise<FileInfo[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      return response.Contents.map((obj: any) => ({
        key: obj.Key || '',
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        contentType: 'application/octet-stream', // S3 ListObjects不返回ContentType
        url: this.getFileUrl(obj.Key || '')
      }));
    } catch (error) {
      console.error('Error listing files from MinIO:', error);
      throw new Error('Failed to list files from MinIO');
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileInfo(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件访问URL
   */
  getFileUrl(key: string): string {
    // 检查key是否已经包含了完整的URL，避免重复拼接
    if (key.startsWith('http://') || key.startsWith('https://')) {
      // 如果key已经是完整URL，直接返回
      return key;
    }

    // 检查是否有CDN_BASE_URL环境变量，如果有则使用CDN地址
    const cdnBaseUrl = process.env.CDN_BASE_URL;
    logger.info(`CDN_BASE_URL: ${cdnBaseUrl}`);
    if (cdnBaseUrl) {
      // 确保URL格式正确
      const baseUrl = cdnBaseUrl.endsWith('/') ? cdnBaseUrl.slice(0, -1) : cdnBaseUrl;
      const bucketPath = this.bucket;
      const keyPath = key.startsWith('/') ? key.substring(1) : key;
      return `${baseUrl}/${bucketPath}/${keyPath}`;
    }

    // 如果没有CDN配置，检查是否有外部访问URL配置
    logger.info(`MINIO_PUBLIC_ENDPOINT: ${process.env.MINIO_PUBLIC_ENDPOINT}`);
    logger.info(`VITE_MINIO_URL: ${process.env.VITE_MINIO_URL}`);
    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || process.env.VITE_MINIO_URL;
    if (publicEndpoint) {
      // 确保URL格式正确
      const baseUrl = publicEndpoint.endsWith('/') ? publicEndpoint.slice(0, -1) : publicEndpoint;
      const bucketPath = this.bucket;
      const keyPath = key.startsWith('/') ? key.substring(1) : key;
      return `${baseUrl}/${bucketPath}/${keyPath}`;
    }

    // 默认使用内部MinIO地址
    const endpoint = this.config.endpoint;
    if (process.env.NODE_ENV === 'development' && endpoint.includes('minio')) {
      return `${endpoint.replace('minio', '127.0.0.1')}/${this.bucket}/${key}`;
    }

    return `${endpoint}/${this.bucket}/${key}`;
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(keys: string[]): Promise<void> {
    try {
      const deletePromises = keys.map(key => this.deleteFile(key));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting files from MinIO:', error);
      throw new Error('Failed to delete files from MinIO');
    }
  }

  /**
   * 复制文件
   */
  async copyFile(sourceKey: string, targetKey: string): Promise<void> {
    try {
      // 先下载源文件
      const fileBuffer = await this.downloadFile(sourceKey);
      const fileInfo = await this.getFileInfo(sourceKey);

      // 再上传到目标位置
      await this.uploadFile(fileBuffer, path.basename(targetKey), fileInfo.contentType, path.dirname(targetKey));
    } catch (error) {
      console.error('Error copying file in MinIO:', error);
      throw new Error('Failed to copy file in MinIO');
    }
  }

  /**
   * 生成预签名上传URL
   */
  async getPresignedUploadUrl(key: string, expires: number = 3600, contentType?: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn: expires });
    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      throw new Error('Failed to generate presigned upload URL');
    }
  }

  /**
   * 生成预签名下载URL
   */
  async getPresignedDownloadUrl(key: string, expires: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn: expires });
    } catch (error) {
      console.error('Error generating presigned download URL:', error);
      throw new Error('Failed to generate presigned download URL');
    }
  }
}