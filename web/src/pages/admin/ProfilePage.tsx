import React, { useState, useEffect, useCallback } from 'react';
import {
  message,
  Tabs,
  Card,
  Space,
  Tag,
  Button,
  Modal,
  Switch,
} from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  PictureOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import { userService, profileService } from '../../services';

import { useAppSelector } from '../../store/hooks';
import type { MediaFile, User } from '../../types';
import { formatDate } from '../../utils';
import ProfileEditForm from '../../components/admin/profile/ProfileEditForm';
import AvatarUploader from '../../components/AvatarUploader';
import MediaGallery from '../../components/admin/profile/MediaGallery';
import { fileService } from '../../services';

const { TabPane } = Tabs;

const ProfileContainer = styled.div`
  padding: 12px;
  max-width: 1200px;
  margin: 0 auto;
`;

const PublicProfileContainer = styled.div`
  .profile-header {
    background: white;
    padding: 40px 24px;
    text-align: center;
    color: #333;
    border-radius: 12px 12px 0 0;
    
    .avatar {
      margin: 0 auto 16px auto;
      width: 120px;
      height: 120px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .name {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .title {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 16px;
    }
    
    .stats {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-top: 24px;
      
      .stat-item {
        text-align: center;
        
        .number {
          font-size: 24px;
          font-weight: 600;
          display: block;
        }
        
        .label {
          font-size: 14px;
          opacity: 0.8;
        }
      }
    }
  }
  
  .profile-content {
    background: white;
    border-radius: 0 0 12px 12px;
    
    .section {
      padding: 24px;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .section-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        
        .anticon {
          color: #667eea;
        }
      }
    }
    
    .contact-info {
      .contact-item {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
        
        .anticon {
          color: #666;
          width: 16px;
        }
      }
    }
    
    .media-gallery {
      .media-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 16px;
        
        .media-item {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          aspect-ratio: 4/3;
          cursor: grab;
          transition: all 0.3s;
          
          img, video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            
            .media-actions {
              opacity: 1;
            }
          }
          
          &.dragging {
            cursor: grabbing;
            transform: rotate(5deg);
            z-index: 1000;
          }
          
          .video-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 32px;
            z-index: 2;
          }
          
          .video-bg {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            z-index: 1;
          }
          
          .media-actions {
            position: absolute;
            top: 8px;
            right: 8px;
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 3;
            
            .action-btn {
              width: 28px;
              height: 28px;
              background: rgba(0, 0, 0, 0.6);
              border: none;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.3s;
              
              &:hover {
                background: rgba(0, 0, 0, 0.8);
                transform: scale(1.1);
              }
              
              &.delete-btn:hover {
                background: #ff4d4f;
              }
            }
          }
          
          .drag-handle {
            position: absolute;
            top: 8px;
            left: 8px;
            width: 28px;
            height: 28px;
            background: rgba(0, 0, 0, 0.6);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 3;
            
            &:active {
              cursor: grabbing;
            }
          }
        }
      }
      
      .upload-area {
        border: 2px dashed #d9d9d9;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        
        &:hover {
          border-color: #667eea;
          background: #f8f9ff;
        }
        
        .upload-icon {
          font-size: 32px;
          color: #d9d9d9;
          margin-bottom: 8px;
          display: flex;
          justify-content: center;
        }
        
        .upload-text {
          color: #666;
          text-align: center;
        }
      }
    }
  }
`;


const ProfilePage: React.FC = () => {
  const  user  = useAppSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [isPublicProfilePublished, setIsPublicProfilePublished] = useState(false);

  // 获取当前用户信息
  const loadCurrentUser = async () => {
    try {
      if (!user?.id) {
        return;
      }
      setLoading(true);
      const response = await userService.getCurrentUser();
      const userData = response.data;
      setCurrentUser(userData ?? null);
      setIsPublicProfilePublished(userData?.isPublic || false);

      // 加载媒体资料
      if (userData?.id) {
        try {
          const mediaResponse = await profileService.getUserMediaProfiles();
          if (mediaResponse.success && mediaResponse.data) {
            // 转换为MediaFile格式以兼容MediaGallery组件
            const files = mediaResponse.data.map(media => ({
              id: media.id!,
              userId: media.userId,
              fileId: media.fileId,
              fileUrl: media.fileUrl,
              thumbnailUrl: media.thumbnailUrl,
              fileType: media.fileType,
              fileName: `media_${media.id}`,
              fileSize: 0,
              mediaOrder: media.mediaOrder,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));
            setMediaFiles(files);
          }
        } catch (error) {
          console.error('加载媒体文件失败:', error);
        }
      }
    } catch (error) {
      message.error('加载用户信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  // 处理头像变更
  const handleAvatarChange = useCallback((url: string) => {
    setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: url } : null));
  }, []);

  // 处理基本信息保存
  const handleBasicInfoSave = async (values: any) => {
    try {
      setLoading(true);
      await userService.updateCurrentUserProfile(values);
      message.success('基本信息保存成功');
      await loadCurrentUser();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存公开资料
  const handleSavePublicProfile = async () => {
    try {
      setSaving(true);

      // 保存用户基本信息和发布状态
      if (currentUser) {
        await userService.updateCurrentUserProfile({
          bio: currentUser.bio,
          specialties: currentUser.specialties,
          experienceYears: currentUser.experienceYears,
          location: currentUser.location,
          contactInfo: currentUser.contactInfo,
          socialLinks: currentUser.socialLinks,
        });

        // 更新发布状态
        await userService.toggleCurrentUserProfilePublish(isPublicProfilePublished);
      }

      // 保存媒体文件排序
      if (mediaFiles.length > 0 && currentUser?.id) {
        try {
          const sortData = mediaFiles.map((media, index) => ({
            fileId: media.fileId,
            mediaOrder: index,
          }));

          await profileService.updateMediaProfilesOrder({ orderData: sortData });
        } catch (error) {
          console.error('保存排序失败:', error);
        }
      }

      message.success('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };




  // 处理头像上传
  const handleAvatarUpload = async (file: File): Promise<string> => {
    try {
      setUploading(true);
      const uploadResults = await fileService.uploadFile(file, {
        fileType: 'image',
        category: 'avatar',
      });

      if (uploadResults.data?.fileUrl) {
        const newAvatarUrl = uploadResults.data.fileUrl;
        // 更新当前用户的头像URL
        await userService.updateCurrentUserProfile({ avatarUrl: newAvatarUrl });
        setCurrentUser(prev => prev ? { ...prev, avatarUrl: newAvatarUrl } : null);
        message.success('头像上传成功');
        return newAvatarUrl;
      }
      throw new Error('上传失败：未返回文件信息');
    } catch (error) {
      message.error('头像上传失败');
      throw error;
    } finally {
      setUploading(false);
    }
  };



  // 预览图片
  const handlePreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };



  // 渲染公开资料页面
  const renderPublicProfile = () => (
    <PublicProfileContainer>
      <div className="profile-header">
        <div className="avatar">

          <AvatarUploader
                value={currentUser?.avatarUrl}
                onChange={handleAvatarChange}
                disabled={uploading}
                size={120}
                shape="square"
                category="avatar"
              />
        </div>
        <div className="name">
          {currentUser?.realName || currentUser?.nickname}
        </div>
        <div className="title">
          {currentUser?.bio || '暂无个人简介'}
        </div>
        <div className="stats">
          <div className="stat-item">
            <span className="number">{currentUser?.experienceYears || 0}</span>
            <span className="label">从业年限</span>
          </div>
          <div className="stat-item">
            <span className="number">{mediaFiles.length}</span>
            <span className="label">作品数量</span>
          </div>
          <div className="stat-item">
            <span className="number">{currentUser?.specialties?.length || 0}</span>
            <span className="label">专业技能</span>
          </div>
        </div>
      </div>

      <div className="profile-content">
        {/* 个人介绍 */}
        {currentUser?.bio && (
          <div className="section">
            <div className="section-title">
              <UserOutlined />
              个人介绍
            </div>
            <p style={{ color: '#666', lineHeight: '1.6' }}>{currentUser.bio}</p>
          </div>
        )}

        {/* 专业技能 */}
        {currentUser?.specialties && currentUser.specialties.length > 0 && (
          <div className="section">
            <div className="section-title">
              <CalendarOutlined />
              专业技能
            </div>
            <Space wrap>
              {currentUser.specialties.map((skill: string, index: number) => (
                <Tag key={index} color="blue">{skill}</Tag>
              ))}
            </Space>
          </div>
        )}

        {/* 作品展示 */}
        <div className="section">
          <div className="section-title">
            <PictureOutlined />
            作品展示
            <Space style={{ marginLeft: 'auto' }}>
              <Switch
                checkedChildren={<GlobalOutlined />}
                unCheckedChildren="私有"
                checked={isPublicProfilePublished}
                onChange={setIsPublicProfilePublished}
              />
              <span style={{ fontSize: '14px', color: '#666' }}>
                {isPublicProfilePublished ? '公开展示' : '私有状态'}
              </span>

              <Button
                type="default"
                size="small"
                loading={saving}
                onClick={handleSavePublicProfile}
              >
                保存排序
              </Button>
            </Space>
          </div>
          <MediaGallery
            mediaFiles={mediaFiles}
            onMediaFilesChange={setMediaFiles}
            onPreview={handlePreview}
            uploading={uploading}
            onUploadingChange={setUploading}
          />
        </div>
      </div>
    </PublicProfileContainer>
  );

  return (
    <ProfileContainer>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="基本信息" key="basic">
          <Card>
            <ProfileEditForm
              initialValues={{
                ...currentUser,
                createdAt: formatDate(currentUser?.createdAt || new Date()),
                updatedAt: formatDate(currentUser?.updatedAt || new Date()),
              }}
              onSubmit={handleBasicInfoSave}
              onCancel={() => { }}
              loading={loading}
              onUpload={handleAvatarUpload}
              avatarUrl={currentUser?.avatarUrl}
              onAvatarChange={handleAvatarChange}
            />
          </Card>
        </TabPane>

        <TabPane tab="公开资料" key="public">
          {renderPublicProfile()}
        </TabPane>
      </Tabs>



      {/* 图片预览模态框 */}
      <Modal
        open={previewVisible}
        title="预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <img
          alt="preview"
          style={{ width: '100%' }}
          src={previewImage}
        />
      </Modal>
    </ProfileContainer>
  );
};

export default ProfilePage;