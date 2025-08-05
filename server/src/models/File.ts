import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import User from './User';
import { FileType, StorageType } from '../types';

// File attributes interface
export interface FileAttributes {
  id: string;
  userId: string;
  originalName: string;
  filename: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  fileType: FileType;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailUrl: string | null;
  hashMd5: string | null;
  hashSha256: string | null;
  storageType: StorageType;
  bucketName: string | null;
  isPublic: boolean;
  downloadCount: number;
  metadata: any | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

// File creation attributes interface
export interface FileCreationAttributes extends Optional<FileAttributes, 'id'> {}

// File model class
class File extends Model<FileAttributes, FileCreationAttributes> implements FileAttributes {
  public id!: string;
  public userId!: string;
  public originalName!: string;
  public filename!: string;
  public filePath!: string;
  public fileUrl!: string;
  public fileSize!: number;
  public mimeType!: string;
  public fileType!: FileType;
  public width!: number | null;
  public height!: number | null;
  public duration!: number | null;
  public thumbnailUrl!: string | null;
  public hashMd5!: string | null;
  public hashSha256!: string | null;
  public storageType!: StorageType;
  public bucketName!: string | null;
  public isPublic!: boolean;
  public downloadCount!: number;
  public metadata!: any | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date;

  // Associations
  public readonly user?: User;

  // Method to get full URL
  public getUrl(): string {
    return this.fileUrl;
  }

  // Method to increment download count
  public async incrementDownloadCount(): Promise<void> {
    this.downloadCount += 1;
    await this.save();
  }
}

export const initFile = (sequelize: Sequelize): void => {
  File.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '文件ID',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        field: 'user_id',
        comment: '上传用户ID',
      },
      originalName: {
        type: new DataTypes.STRING(255),
        allowNull: false,
        field: 'original_name',
        comment: '原始文件名',
      },
      filename: {
        type: new DataTypes.STRING(255),
        allowNull: false,
        comment: '存储文件名',
      },
      filePath: {
        type: new DataTypes.STRING(500),
        allowNull: false,
        field: 'file_path',
        comment: '文件路径',
      },
      fileUrl: {
        type: new DataTypes.STRING(500),
        allowNull: false,
        field: 'file_url',
        comment: '访问URL',
      },
      fileSize: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'file_size',
        comment: '文件大小(字节)',
      },
      mimeType: {
        type: new DataTypes.STRING(100),
        allowNull: false,
        field: 'mime_type',
        comment: 'MIME类型',
      },
      fileType: {
        type: DataTypes.ENUM(...Object.values(FileType)),
        allowNull: false,
        field: 'file_type',
        comment: '文件类型',
      },
      width: {
        type: DataTypes.INTEGER,
        comment: '图片/视频宽度',
      },
      height: {
        type: DataTypes.INTEGER,
        comment: '图片/视频高度',
      },
      duration: {
        type: DataTypes.INTEGER,
        comment: '音视频时长(秒)',
      },
      thumbnailUrl: {
        type: new DataTypes.STRING(500),
        field: 'thumbnail_url',
        comment: '缩略图URL',
      },
      hashMd5: {
        type: new DataTypes.STRING(32),
        field: 'hash_md5',
        comment: 'MD5哈希值',
      },
      hashSha256: {
        type: new DataTypes.STRING(64),
        field: 'hash_sha256',
        comment: 'SHA256哈希值',
      },
      storageType: {
        type: DataTypes.ENUM(...Object.values(StorageType)),
        allowNull: false,
        defaultValue: StorageType.MINIO,
        field: 'storage_type',
        comment: '存储类型',
      },
      bucketName: {
        type: new DataTypes.STRING(100),
        field: 'bucket_name',
        comment: '存储桶名称',
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_public',
        comment: '是否公开访问',
      },
      downloadCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'download_count',
        comment: '下载次数',
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        comment: '创建时间',
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
        comment: '更新时间',
      },
      deletedAt: {
        type: DataTypes.DATE,
        field: 'deleted_at',
        comment: '删除时间',
      },
      metadata: {
        type: DataTypes.JSON,
        comment: '文件元数据',
      },
    },
    {
      tableName: 'files',
      sequelize,
      timestamps: true,
      paranoid: true,
      comment: '文件表',
      indexes: [
        { name: 'idx_files_user_id', fields: ['user_id'] },
        { name: 'idx_files_filename', fields: ['filename'] },
        { name: 'idx_files_file_type', fields: ['file_type'] },
        { name: 'idx_files_mime_type', fields: ['mime_type'] },
        { name: 'idx_files_hash_md5', fields: ['hash_md5'] },
        { name: 'idx_files_storage_type', fields: ['storage_type'] },
        { name: 'idx_files_created_at', fields: ['created_at'] },
        { name: 'idx_files_deleted_at', fields: ['deleted_at'] },
      ],
    },
  );

  File.belongsTo(User, { as: 'user', foreignKey: 'userId' });
};

export default File;
