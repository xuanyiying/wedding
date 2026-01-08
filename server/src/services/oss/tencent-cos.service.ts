import COS from 'cos-nodejs-sdk-v5';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OssService, UploadResult, FileInfo } from './oss.service';
import { Readable } from 'stream';
import logger from '@/utils/logger';
import STS from 'qcloud-cos-sts';

export interface TencentCOSConfig {
  region: string;
  secretId: string;
  secretKey: string;
  bucket: string;
}

export class TencentCOSService implements OssService {
  public bucketName: string;
  private cosClient: COS;
  private bucket: string;
  private region: string;
  private config: TencentCOSConfig;

  constructor(config: TencentCOSConfig) {
    this.config = config;
    this.bucket = config.bucket;
    this.bucketName = config.bucket;
    this.region = config.region;
    this.cosClient = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });
  }

  /**
   * 获取 STS 临时密钥
   */
  async getSTSToken(scope: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const policy = {
        version: '2.0',
        statement: [{
          action: scope.map(s => s.action),
          effect: 'allow',
          resource: ['*'],
        }],
      };

      STS.getCredential(
        {
          secretId: this.config.secretId,
          secretKey: this.config.secretKey,
          policy: policy,
          durationSeconds: 3600,
        },
        (err, credential) => {
          if (err) {
            logger.error(`Error getting STS token from Tencent COS: ${JSON.stringify(err)}`);
            reject(err);
          } else {
            resolve(credential);
          }
        }
      );
    });
  }

  /**
   * 初始化存储桶并配置 CORS
   */
  async initializeBucket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cosClient.headBucket(
        {
          Bucket: this.bucket,
          Region: this.region,
        },
        async (err) => {
          try {
            if (err) {
              if (err.statusCode === 404) {
                await new Promise<void>((res, rej) => {
                  this.cosClient.putBucket(
                    {
                      Bucket: this.bucket,
                      Region: this.region,
                    },
                    (putErr) => {
                      if (putErr) rej(putErr);
                      else res();
                    }
                  );
                });
                logger.info(`Tencent COS Bucket ${this.bucket} created successfully`);
              } else {
                throw err;
              }
            } else {
              logger.info(`Tencent COS Bucket ${this.bucket} already exists`);
            }

            // 配置 CORS
            try {
              await this.putBucketCors();
            } catch (corsErr) {
              logger.warn(`Failed to configure CORS (may already be configured or transient error): ${corsErr instanceof Error ? corsErr.message : String(corsErr)}`);
            }
            resolve();
          } catch (e) {
            logger.error(`Error initializing Tencent COS bucket: ${e instanceof Error ? e.message : String(e)}`);
            reject(e);
          }
        }
      );
    });
  }

  /**
   * 配置存储桶 CORS
   */
  private async putBucketCors(): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: this.bucket,
        Region: this.region,
        CORSRules: [
          {
            AllowedOrigin: ['luhe.site', '*.luhe.site'], // 在生产环境中建议指定具体的域名
            AllowedMethod: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
            AllowedHeader: ['*'],
            ExposeHeader: [
              'ETag',
              'Content-Type',
              'Content-Length',
              'x-cos-request-id',
              'x-cos-meta-filename',
              'x-cos-meta-fileid'
            ],
            MaxAgeSeconds: 600,
          },
        ],
      };

      this.cosClient.putBucketCors(params, (err) => {
        if (err) {
          logger.error(`Error setting CORS for Tencent COS bucket: ${err.message}`);
          reject(err);
        } else {
          logger.info(`Tencent COS Bucket ${this.bucket} CORS configured successfully`);
          resolve();
        }
      });
    });
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
    const fileExtension = path.extname(originalName);
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = folder ? `${folder}/${fileName}` : fileName;

    return new Promise((resolve, reject) => {
      const params: COS.PutObjectParams = {
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
        Body: file,
        ContentType: contentType,
      };

      this.cosClient.putObject(params, (err) => {
        if (err) {
          logger.error(`Error uploading file to Tencent COS: ${err.message}`);
          reject(err);
        } else {
          // Tencent COS response data.Location usually includes the protocol or is just the domain
          const url = this.getFileUrl(key);
          
          // Get file size if it's a Buffer
          let size = 0;
          if (Buffer.isBuffer(file)) {
            size = file.length;
          }

          resolve({
            key,
            url,
            size,
            contentType,
          });
        }
      });
    });
  }

  /**
   * 下载文件
   */
  async downloadFile(key: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.cosClient.getObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err, data) => {
          if (err) {
            logger.error(`Error downloading file from Tencent COS: ${err.message}`);
            reject(err);
          } else {
            resolve(data.Body as Buffer);
          }
        }
      );
    });
  }

  /**
   * 删除文件
   */
  async deleteFile(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cosClient.deleteObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err) => {
          if (err) {
            logger.error(`Error deleting file from Tencent COS: ${err.message}`);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    return new Promise((resolve, reject) => {
      this.cosClient.headObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err, data) => {
          if (err) {
            logger.error(`Error getting file info from Tencent COS: ${err.message}`);
            reject(err);
          } else {
            const headers = data?.headers || {};
            resolve({
              key,
              size: parseInt((headers['content-length'] as string) || '0', 10),
              lastModified: new Date((headers['last-modified'] as string) || Date.now()),
              contentType: (headers['content-type'] as string) || 'application/octet-stream',
              url: this.getFileUrl(key),
            });
          }
        }
      );
    });
  }

  /**
   * 列出文件
   */
  async listFiles(prefix?: string, maxKeys?: number): Promise<FileInfo[]> {
    return new Promise((resolve, reject) => {
      const params: COS.GetBucketParams = {
        Bucket: this.bucket,
        Region: this.region,
      };
      if (prefix) params.Prefix = prefix;
      if (maxKeys) params.MaxKeys = maxKeys;

      this.cosClient.getBucket(params, (err, data) => {
          if (err) {
            logger.error(`Error listing files from Tencent COS: ${err.message}`);
            reject(err);
          } else {
            const files = (data?.Contents || []).map((item) => ({
              key: item.Key,
              size: parseInt(item.Size, 10),
              lastModified: new Date(item.LastModified),
              contentType: '', // getBucket doesn't return Content-Type
              url: this.getFileUrl(item.Key),
            }));
            resolve(files);
          }
        }
      );
    });
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
    // Tencent COS URL format: https://<BucketName-APPID>.cos.<Region>.myqcloud.com/<Key>
    return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(keys: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cosClient.deleteMultipleObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Objects: keys.map((key) => ({ Key: key })),
        },
        (err) => {
          if (err) {
            logger.error(`Error deleting files from Tencent COS: ${err.message}`);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * 复制文件
   */
  async copyFile(sourceKey: string, targetKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cosClient.putObjectCopy(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: targetKey,
          CopySource: `${this.bucket}.cos.${this.region}.myqcloud.com/${sourceKey}`,
        },
        (err) => {
          if (err) {
            logger.error(`Error copying file in Tencent COS: ${err.message}`);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * 生成预签名上传URL
   */
  async getPresignedUploadUrl(key: string, expires?: number, contentType?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cosClient.getObjectUrl(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Sign: true,
          Method: 'PUT',
          Expires: expires || 3600,
          Headers: contentType ? { 'Content-Type': contentType } : {},
        },
        (err, data) => {
          if (err) {
            logger.error(`Error generating presigned upload URL from Tencent COS: ${err.message}`);
            reject(err);
          } else {
            resolve(data.Url);
          }
        }
      );
    });
  }

  /**
   * 生成预签名下载URL
   */
  async getPresignedDownloadUrl(key: string, expires?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cosClient.getObjectUrl(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Sign: true,
          Method: 'GET',
          Expires: expires || 3600,
        },
        (err, data) => {
          if (err) {
            logger.error(`Error generating presigned download URL from Tencent COS: ${err.message}`);
            reject(err);
          } else {
            resolve(data.Url);
          }
        }
      );
    });
  }

  /**
   * 初始化分块上传
   */
  async initMultipartUpload(key: string, contentType: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cosClient.multipartInit(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          ContentType: contentType,
        },
        (err, data) => {
          if (err) {
            logger.error(`Error initializing multipart upload in Tencent COS: ${err.message}`);
            reject(err);
          } else {
            resolve(data.UploadId);
          }
        }
      );
    });
  }

  /**
   * 上传分块
   */
  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer | Readable
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cosClient.multipartUpload(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: body,
        },
        (err, data) => {
          if (err) {
            logger.error(`Error uploading part ${partNumber} to Tencent COS: ${err.message}`);
            reject(err);
          } else {
            resolve(data.ETag);
          }
        }
      );
    });
  }

  /**
   * 完成分块上传
   */
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: { PartNumber: number; ETag: string }[]
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      this.cosClient.multipartComplete(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          UploadId: uploadId,
          Parts: parts.map(p => ({
            PartNumber: p.PartNumber,
            ETag: p.ETag
          })),
        },
        async (err, _data) => {
          if (err) {
            logger.error(`Error completing multipart upload in Tencent COS: ${err.message}`);
            reject(err);
          } else {
            try {
              // 完成后获取文件信息以填充真实的 size 和 contentType
              const fileInfo = await this.getFileInfo(key);
              resolve({
                key,
                url: fileInfo.url,
                size: fileInfo.size,
                contentType: fileInfo.contentType,
              });
            } catch (error) {
              resolve({
                key,
                url: this.getFileUrl(key),
                size: 0,
                contentType: 'application/octet-stream',
              });
            }
          }
        }
      );
    });
  }

  /**
   * 取消分块上传
   */
  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cosClient.multipartAbort(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          UploadId: uploadId,
        },
        (err) => {
          if (err) {
            logger.error(`Error aborting multipart upload in Tencent COS: ${err.message}`);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}
