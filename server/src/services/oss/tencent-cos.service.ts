import COS from 'cos-nodejs-sdk-v5';
import { OssService, UploadResult, FileInfo } from './oss.service';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { OssConfig } from '@/config/config';

export class TencentCosService implements OssService {
    public bucketName: string;
    private cos: COS;
    private config: OssConfig;

    constructor(config: OssConfig) {
        this.config = config;
        this.bucketName = config.bucket;
        this.cos = new COS({
            SecretId: config.accessKeyId,
            SecretKey: config.accessKeySecret,
        });
    }

    async initializeBucket(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.cos.headBucket({
                Bucket: this.bucketName,
                Region: this.config.region,
            }, (err, _data) => {
                if (err) {
                    if (err.statusCode === 404) {
                        this.cos.putBucket({
                            Bucket: this.bucketName,
                            Region: this.config.region,
                        }, (err, _data) => {
                            if (err) {
                                console.error('Error creating Tencent COS bucket:', err);
                                reject(err);
                            } else {
                                console.log(`Tencent COS Bucket ${this.bucketName} created successfully`);
                                resolve();
                            }
                        });
                    } else {
                        console.error('Error checking Tencent COS bucket:', err);
                        reject(err);
                    }
                } else {
                    console.log(`Tencent COS Bucket ${this.bucketName} already exists`);
                    resolve();
                }
            });
        });
    }

    async uploadFile(file: Buffer | Readable, originalName: string, contentType: string, folder: string = ''): Promise<UploadResult> {
        const key = path.join(folder, `${uuidv4()}-${originalName}`);
        return new Promise((resolve, reject) => {
            this.cos.putObject({
                Bucket: this.bucketName,
                Region: this.config.region,
                Key: key,
                Body: file,
                ContentType: contentType,
            }, (err, _data) => {
                if (err) {
                    console.error('Error uploading file to Tencent COS:', err);
                    reject(err);
                } else {
                    const url = this.getFileUrl(key);
                    resolve({
                        key,
                        url,
                        size: (file as Buffer).length, // This is not accurate for streams
                        contentType,
                    });
                }
            });
        });
    }

    async downloadFile(key: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            this.cos.getObject({
                Bucket: this.bucketName,
                Region: this.config.region,
                Key: key,
            }, (err, data) => {
                if (err) {
                    console.error('Error downloading file from Tencent COS:', err);
                    reject(err);
                } else {
                    resolve(data.Body as Buffer);
                }
            });
        });
    }

    async deleteFile(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.cos.deleteObject({
                Bucket: this.bucketName,
                Region: this.config.region,
                Key: key,
            }, (err, _data) => {
                if (err) {
                    console.error('Error deleting file from Tencent COS:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getFileInfo(key: string): Promise<FileInfo> {
        return new Promise((resolve, reject) => {
            this.cos.headObject({
                Bucket: this.bucketName,
                Region: this.config.region,
                Key: key,
            }, (err, data) => {
                if (err) {
                    reject(err);
                } else if (data && data.headers) {
                    resolve({
                        key,
                        size: Number(data.headers['content-length']),
                        lastModified: new Date(data.headers['last-modified']),
                        contentType: data.headers['content-type'],
                        url: this.getFileUrl(key),
                    });
                } else {
                    reject(new Error('Could not get file info'));
                }
            });
        });
    }

    async listFiles(prefix?: string, maxKeys: number = 1000): Promise<FileInfo[]> {
        const params: COS.GetBucketParams = {
            Bucket: this.bucketName,
            Region: this.config.region,
            MaxKeys: maxKeys,
        };
        if (prefix) {
            params.Prefix = prefix;
        }
        return new Promise((resolve, reject) => {
            this.cos.getBucket(params, (err, data) => {
                if (err) {
                    console.error('Error listing files from Tencent COS:', err);
                    reject(err);
                } else {
                    const files = data.Contents.map(item => ({
                        key: item.Key,
                        size: Number(item.Size),
                        lastModified: new Date(item.LastModified),
                        contentType: '', // Not provided by listObjects
                        url: this.getFileUrl(item.Key),
                    }));
                    resolve(files);
                }
            });
        });
    }

    async fileExists(key: string): Promise<boolean> {
        try {
            await this.getFileInfo(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    getFileUrl(key: string): string {
        return `https://${this.bucketName}.cos.${this.config.region}.myqcloud.com/${key}`;
    }

    async deleteFiles(keys: string[]): Promise<void> {
        const objects = keys.map(key => ({ Key: key }));
        return new Promise((resolve, reject) => {
            this.cos.deleteMultipleObject({
                Bucket: this.bucketName,
                Region: this.config.region,
                Objects: objects,
            }, (err, _data) => {
                if (err) {
                    console.error('Error deleting files from Tencent COS:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async copyFile(sourceKey: string, targetKey: string): Promise<void> {
        const copySource = `${this.bucketName}.cos.${this.config.region}.myqcloud.com/${sourceKey}`;
        return new Promise((resolve, reject) => {
            this.cos.putObjectCopy({
                Bucket: this.bucketName,
                Region: this.config.region,
                Key: targetKey,
                CopySource: copySource,
            }, (err, _data) => {
                if (err) {
                    console.error('Error copying file in Tencent COS:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getPresignedUploadUrl(key: string, expires: number = 3600, contentType?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            (this.cos as any).getPresignedUrl({
                Bucket: this.bucketName,
                Region: this.config.region,
                Key: key,
                Method: 'PUT',
                Expires: expires,
                Headers: {
                    'Content-Type': contentType,
                }
            }, (err: any, data: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.PresignedUrl);
                }
            });
        });
    }

    async getPresignedDownloadUrl(key: string, expires: number = 3600): Promise<string> {
        return new Promise((resolve, reject) => {
            (this.cos as any).getPresignedUrl({
                Bucket: this.bucketName,
                Region: this.config.region,
                Key: key,
                Method: 'GET',
                Expires: expires,
            }, (err: any, data: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.PresignedUrl);
                }
            });
        });
    }
}