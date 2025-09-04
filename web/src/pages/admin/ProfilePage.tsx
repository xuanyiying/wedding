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
  Image,
  Popconfirm,
} from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  PictureOutlined,
  GlobalOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import { userService, profileService } from '../../services';
import { useAppSelector } from '../../store/hooks';
import { FileType, type MediaFile, type User } from '../../types';
import { formatDate } from '../../utils';
import ProfileEditForm from '../../components/admin/profile/ProfileEditForm';
import AvatarUploader from '../../components/AvatarUploader';
import { MediaUploader } from '../../components/common/MediaUploader';
import { PlayButton } from '../../components/client/WorkCardStyles';

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
const ProfileMediaItem = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  cursor: pointer;
  
  .ant-image {
    width: 100%;
    height: 100%;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
`;

const ProfilePage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');


  const [uploading] = useState(false);

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
          const mediaResponse = await profileService.getUserMediaProfiles(userData.id);
          if (mediaResponse.success && mediaResponse.data) {
            setMediaFiles(mediaResponse.data);
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

  // 处理头像变更（仅更新本地状态，上传由AvatarUploader内部处理）
  const handleAvatarChange = useCallback((url: string) => {
    // 只更新本地状态，避免重复API调用
    setCurrentUser((prev) => {
      // 避免不必要的状态更新，防止无限循环
      if (prev?.avatarUrl === url) {
        return prev;
      }
      userService.updateCurrentUserProfile({ ...prev, avatarUrl: url });
      return prev ? { ...prev, avatarUrl: url } : null;
    });
  }, []);

  // 处理基本信息保存
  const handleBasicInfoSave = async (values: any) => {
    try {
      setLoading(true);

      // 验证必填字段
      if (!values.realName?.trim() && !values.nickname?.trim()) {
        message.error('请输入真实姓名或昵称');
        return;
      }

      if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        message.error('请输入有效的邮箱地址');
        return;
      }

      await userService.updateCurrentUserProfile(values);
      message.success('基本信息保存成功');
      await loadCurrentUser();
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '保存失败，请检查网络连接后重试';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleOnRemoveMediaFile = async (fileId: string) => {
    try {
      // 调用后端API删除文件
      await profileService.deleteMediaProfile(user?.id || '', fileId);
      // 更新本地状态
      setMediaFiles(prev => prev.filter(f => f.id !== fileId));
      message.success('删除成功');
    } catch (error) {
      console.error('Delete error:', error);
      message.error('删除失败，请重试');
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
          const sortData = mediaFiles
            .filter(media => media.id) // 过滤掉没有id的媒体文件
            .map((media, index) => ({
              fileId: media.id as string, // 类型断言，因为我们已经过滤了undefined的情况
              mediaOrder: index,
            }));

          await profileService.updateMediaProfilesOrder(currentUser.id, { orderData: sortData });
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

  const handleUploadSuccess = async () => {
    if (currentUser?.id) {
      try {
        const mediaResponse = await profileService.getUserMediaProfiles(currentUser.id);
        if (mediaResponse.success && mediaResponse.data) {
          setMediaFiles(mediaResponse.data);
        }
      } catch (error) {
        console.error('重新加载媒体文件失败:', error);
      }
    }
  };

  // 预览媒体文件
  const handlePreview = (file: MediaFile) => {
    setPreviewImage(file.fileUrl || '');
    setPreviewVisible(true);
  };
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
              avatarUrl={currentUser?.avatarUrl}
              onAvatarChange={handleAvatarChange}
            />
          </Card>
        </TabPane>

        <TabPane tab="公开资料" key="public">
          <PublicProfileContainer>
            <div className="profile-header">
              <div className="avatar">

                <AvatarUploader
                  value={currentUser?.avatarUrl}
                  onChange={handleAvatarChange}
                  disabled={uploading || loading}
                  size={120}
                  category="avatar"
                  style={{
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid #f0f0f0',
                    transition: 'all 0.3s ease'
                  }}
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
                <MediaUploader
                  config={{
                    maxCount: 20,
                    accept: ['image/*', 'video/*'],
                    category: 'profile',
                    multiple: true,
                    concurrent: 2
                  }}
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={(error: Error) => {
                    console.error('上传失败:', error);
                    message.error('文件上传失败，请重试');
                  }}
                />
                {mediaFiles && Array.isArray(mediaFiles) && mediaFiles.length > 0 ? (
                  mediaFiles
                    .filter(m => m && m.id && m.fileUrl) // 过滤掉无效的媒体文件
                    .map((m) => (
                      <ProfileMediaItem key={m.id}>
                        {m.fileType === FileType.VIDEO && m.thumbnailUrl && m.fileUrl ?
                          <>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                              <img
                                src={m.thumbnailUrl as string}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  // 处理图片加载错误
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <PlayButton>
                                <PlayCircleOutlined />
                              </PlayButton>
                            </div>
                          </> :
                          <Image
                            preview={false}
                            src={m.fileUrl}
                            onClick={() => handlePreview(m)}
                            style={{ cursor: 'pointer' }}
                            onError={(e) => {
                              // 处理图片加载错误
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        }
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          display: 'flex',
                          gap: 4
                        }}>
                          <Button
                            type="primary"
                            icon={<EyeOutlined />}
                            size="small"
                            onClick={() => handlePreview(m)}
                            style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: 'none' }}
                          />
                          <Popconfirm
                            title="确定要删除这个文件吗？"
                            onConfirm={() => handleOnRemoveMediaFile(m.id!)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button
                              type="primary"
                              icon={<DeleteOutlined />}
                              size="small"
                              danger
                              style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: 'none' }}
                            />
                          </Popconfirm>
                        </div>
                      </ProfileMediaItem>
                    ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    暂无媒体文件
                  </div>
                )}
              </div>
            </div>
          </PublicProfileContainer>
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
        {previewImage &&
          (previewImage.includes('.mp4') || previewImage.includes('.mov') || previewImage.includes('.avi') ? (
            <video
              src={previewImage}
              controls
              style={{ width: '100%', maxHeight: '600px' }}
              autoPlay
            />
          ) : (
            <img
              alt="preview"
              style={{ width: '100%' }}
              src={previewImage}
            />
          ))
        }
      </Modal>
    </ProfileContainer>
  );
};

export default ProfilePage;