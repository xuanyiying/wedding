import React, { useState, useEffect } from 'react';
import { Row, Col, Modal, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTheme } from '../../hooks/useTheme';
import { WorkType, WorkStatus, type Work, FileType } from '../../types';
import { workService } from '../../services';
import { useDirectUpload } from '../../hooks/useDirectUpload';
import type { RootState } from '../../store';
import { useAppSelector } from '../../store';
import { PageHeader, StatCard } from '../../components/admin/common';
import ConditionalQueryBar, { type QueryFilters } from '../../components/common/QueryBar';
import { WorkForm, WorkPreviewModal, type Work as WorkCardType } from '../../components/admin/work';
import { isAdmin } from '../../utils/auth';
import styled from 'styled-components';

const WorksContainer = styled.div`
  padding: 16px;
  
  @media (max-width: 768px) {
    padding: 8px;
  }
  
  .works-grid {
    margin-top: 24px;
  }
  
  /* 移动端筛选栏优化 */
  .ant-row {
    @media (max-width: 768px) {
      gap: 8px !important;
      margin-bottom: 16px !important;
    }
  }
  
  .ant-input {
    @media (max-width: 768px) {
      width: 100% !important;
    }
  }
  
  .ant-select {
    @media (max-width: 768px) {
      width: 100% !important;
    }
  }
`;

// 抖音风格组件
const WorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
`;

const AdminWorkCard = styled.div`
  background: var(--admin-bg-container);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--admin-border-color);
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    border-color: var(--admin-primary-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const WorkMediaContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  overflow: hidden;
  background: var(--admin-bg-layout);
`;

const WorkMedia = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const WorkStatusBadge = styled.div<{ status: string }>`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: ${props => {
    switch (props.status) {
      case 'published': return '#52c41a';
      case 'draft': return '#faad14';
      case 'private': return '#f5222d';
      default: return '#d9d9d9';
    }
  }};
`;

const FeaturedBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(45deg, #ff6b6b, #ffa500);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`;

const WorkInfo = styled.div`
  padding: 16px;
`;

const WorkTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: var(--admin-text-primary);
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const WorkDescription = styled.p`
  font-size: 14px;
  color: var(--admin-text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const WorkMetaInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--admin-text-secondary);
  
  .anticon {
    font-size: 13px;
  }
`;

const WorkActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  
  .ant-btn {
    flex: 1;
    height: 32px;
    font-size: 12px;
  }
`;


// 格式化数字显示
const formatCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}w`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};

const WorksPage: React.FC = () => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [previewWork, setPreviewWork] = useState<WorkCardType | null>(null);
  const [filters, setFilters] = useState<QueryFilters>({
    search: '',
    teamId: '',
    userId: '',
    date: null,
  });
  const { uploadWorkImages } = useDirectUpload();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { initTheme } = useTheme();
  const userIsAdmin = isAdmin();

  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);

  const loadWorks = async (queryFilters?: {
    teamId?: string;
    userId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    try {
      const response = await workService.getWorks({
        page: 1,
        limit: 100,
        ...queryFilters
      });
      setWorks(response.data?.works || []);
    } catch (error) {
      console.error('加载作品数据失败:', error);
      message.error('加载作品数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 统计数据
  const stats = {
    total: works.length,
    public: works.filter(work => work.isPublic).length,
    featured: works.filter(work => work.isFeatured).length,
    views: works.reduce((sum, work) => sum + (work.viewCount || 0), 0),
    likes: works.reduce((sum, work) => sum + (work.likeCount || 0), 0),
    downloads: works.reduce((sum, work) => sum + (work.downloads || 0), 0),
  };

  // 打开添加/编辑模态框
  const openModal = (work?: Work) => {
    if (work) {
      // 权限检查：普通用户只能编辑自己的作品
      if (!userIsAdmin && work.userId !== user?.id) {
        message.error('您没有权限编辑此作品');
        return;
      }
    }
    setEditingWork(work || null);
    setModalVisible(true);
  };

  // 预览作品
  const handlePreviewWork = (work: Work) => {
    let coverUrl = '';
    let contentUrls: string[] = [];
    work.files?.forEach(file => {
      if ( file.fileUrl) {
         contentUrls.push(file.fileUrl);
      }
      if (file.fileType === FileType.VIDEO && file.thumbnailUrl) {
        coverUrl = file.thumbnailUrl || '';
      }
      if (file.fileType === FileType.IMAGE && file.fileUrl) {
        coverUrl = file.fileUrl || '';
      }
    })
    const workCardData: WorkCardType = {
      id: work.id,
      title: work.title,
      description: work.description || '',
      category: work.category,
      type: work.type === 'image' ? 'photo' : 'video',
      coverImage: coverUrl || '',
      contentUrls: contentUrls || [],
      tags: work.tags || [],
      author: work.author || '',
      customer: work.customer || undefined,
      weddingDate: work.weddingDate || undefined,
      isPublic: work.isPublic ?? false,
      isFeatured: work.isFeatured ?? false,
      views: work.viewCount || 0,
      likes: work.likeCount || 0,
      downloads: work.downloads || 0,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
      files : work.files || []
    };
    setPreviewWork(workCardData);
    setPreviewVisible(true);
  };

  // 上传文件
  const handleUpload = async (file: File): Promise<string> => {
    try {
      const results = await uploadWorkImages([file]);
      return results[0].url;
    } catch (error) {
      throw new Error('文件上传失败');
    }
  };

  // 保存作品
  const handleSave = async (values: any) => {
    try {
      const workData: Omit<Work, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user?.id || '',
        title: values.title,
        description: values.description || null,
        type: values.type as WorkType,
        category: values.category,
        tags: values.tags || null,
        weddingDate: values.weddingDate || null,
        author: values.author || user?.username || null,
        customer: values.customer || null,
        downloads: 0,
        isPublic: values.isPublic || false,
        equipmentInfo: null,
        technicalInfo: null,
        status: WorkStatus.PUBLISHED,
        isFeatured: values.isFeatured || false,
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
        sortOrder: 0,
        publishedAt: new Date().toISOString(),
        deletedAt: null,
        files: values.files || []
      };

      if (editingWork) {
        await workService.updateWork(editingWork.id, workData);
        message.success('作品更新成功');
      } else {
        await workService.createWork(workData);
        message.success('作品添加成功');
      }

      setModalVisible(false);
      loadWorks();
    } catch (error) {
      console.error('保存作品失败:', error);
      message.error('操作失败，请重试');
    }
  };

  // 删除作品
  const handleDelete = async (workId: string) => {
    const work = works.find(w => w.id === workId);
    if (!work) {
      message.error('作品不存在');
      return;
    }
    
    // 权限检查：普通用户只能删除自己的作品
    if (!userIsAdmin && work.userId !== user?.id) {
      message.error('您没有权限删除此作品');
      return;
    }
    
    try {
      await workService.deleteWork(workId);
      message.success('作品删除成功');
      loadWorks();
    } catch (error) {
      console.error('删除作品失败:', error);
      message.error('删除失败，请重试');
    }
  };



  return (
    <WorksContainer>
      <PageHeader
        title="作品管理"
        subtitle="管理您的摄影作品"
        actions={[
          {
            key: 'add',
            label: '添加作品',
            onClick: () => openModal(),
            type: 'primary' as const,
            icon: <PlusOutlined />
          }
        ]}
      />

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            title="总作品"
            value={stats.total}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            title="公开作品"
            value={stats.public}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            title="精选作品"
            value={stats.featured}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            title="总浏览"
            value={stats.views}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            title="总点赞"
            value={stats.likes}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            title="总下载"
            value={stats.downloads}
            loading={loading}
          />
        </Col>
      </Row>

      {/* 筛选栏 */}
        <ConditionalQueryBar
          showMealFilter={false}
          onQuery={(queryFilters) => {
            const newFilters = {
              teamId: queryFilters.teamId || '',
              userId: queryFilters.userId || '',
              date: queryFilters.date || null,
              search: queryFilters.search || '',
            };
            setFilters(newFilters);
            loadWorks(newFilters);
          }}
          onReset={() => {
            const resetFilters = {
              search: '',
              teamId: '',
              userId: '',
              date: null,
            };
            setFilters(resetFilters);
            loadWorks(resetFilters);
          }}
          initialFilters={filters}
        />

      {/* 作品网格 - 抖音风格布局 */}
      <WorksGrid>
        {works.map((work) => (
          <AdminWorkCard key={work.id}>
            <WorkMediaContainer>
              <WorkMedia>
                <img src={work.files?.[0]?.fileUrl || ''} alt={work.title} />
                <WorkStatusBadge status={work.isPublic ? 'published' : 'private'}>
                  {work.isPublic ? '已发布' : '私有'}
                </WorkStatusBadge>
                {work.isFeatured && (
                  <FeaturedBadge>精选</FeaturedBadge>
                )}
              </WorkMedia>
            </WorkMediaContainer>
            
            <WorkInfo>
              <WorkTitle>{work.title}</WorkTitle>
              <WorkDescription>{work.description}</WorkDescription>
              
              <WorkMetaInfo>
                <MetaItem>
                  <span>👁️</span>
                  <span>{formatCount(work.viewCount || 0)}</span>
                </MetaItem>
                <MetaItem>
                  <span>❤️</span>
                  <span>{formatCount(work.likeCount || 0)}</span>
                </MetaItem>
                <MetaItem>
                  <span>📥</span>
                  <span>{formatCount(work.downloads || 0)}</span>
                </MetaItem>
                {work.weddingDate && (
                  <MetaItem>
                    <span>📅</span>
                    <span>{new Date(work.weddingDate).toLocaleDateString('zh-CN')}</span>
                  </MetaItem>
                )}
              </WorkMetaInfo>
              
              <WorkActions>
                <button 
                  className="ant-btn ant-btn-sm"
                  onClick={() => handlePreviewWork(work)}
                >
                  预览
                </button>
                {/* 只有管理员或作品所有者可以编辑 */}
                {(userIsAdmin || work.userId === user?.id) && (
                  <button 
                    className="ant-btn ant-btn-sm"
                    onClick={() => openModal(work)}
                  >
                    编辑
                  </button>
                )}
                {/* 只有管理员或作品所有者可以删除 */}
                {(userIsAdmin || work.userId === user?.id) && (
                  <button 
                    className="ant-btn ant-btn-sm ant-btn-danger"
                    onClick={() => handleDelete(work.id)}
                  >
                    删除
                  </button>
                )}
              </WorkActions>
            </WorkInfo>
          </AdminWorkCard>
        ))}
      </WorksGrid>

      {/* 添加/编辑模态框 */}
      <Modal
        title={editingWork ? '编辑作品' : '添加作品'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <WorkForm
           initialValues={editingWork ? {
             title: editingWork.title,
             description: editingWork.description || '',
             category: editingWork.category,
             type: editingWork.type === 'image' ? 'photo' : 'video',
             files: editingWork.files || [],
             tags: editingWork.tags || [],
             author: editingWork.author || '',
             customer: editingWork.customer || '',
             weddingDate: editingWork.weddingDate ? new Date(editingWork.weddingDate) : undefined,
             isPublic: editingWork.isPublic ?? false,
             isFeatured: editingWork.isFeatured ?? false,
           } : undefined}
           onSubmit={handleSave}
           onCancel={() => setModalVisible(false)}
           isEdit={!!editingWork}
           onUpload={handleUpload}
         />
      </Modal>

      {/* 预览模态框 */}
      <WorkPreviewModal
        visible={previewVisible}
        work={previewWork}
        onClose={() => setPreviewVisible(false)}
      />
    </WorksContainer>
  );
};

export default WorksPage;