import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Row,
  Col,
  message,
  Card,
} from 'antd';
import {
  SaveOutlined,
  GlobalOutlined,
  LinkOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import { useSettings } from '../../../contexts/SettingsContext';
import { SimpleUploader } from '../../common/SimpleUploader';

const { TextArea } = Input;

const SettingSection = styled.div`
  margin-bottom: 40px;
  
  .section-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--admin-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .section-description {
    color: var(--admin-text-secondary);
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.6;
  }
`;

interface SiteSettingsForm {
  name: string;
  description: string;
  keywords: string;
  logo: string;
  favicon: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  icp: string;
  copyright: string;
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogImage: string;
  };
}

const SiteSettings: React.FC = () => {
  const [form] = Form.useForm();
  const { state, updateSiteSettings, saveSiteSettings } = useSettings();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');

  // 初始化表单数据
  useEffect(() => {
    if (state.site) {
      const siteData = state.site;

      if (siteData.logo) {
        setLogoUrl(siteData.logo);
      }
      if (siteData.favicon) {
        setFaviconUrl(siteData.favicon);
      }

      // 直接使用新的数据结构
      form.setFieldsValue({
        name: siteData.name || '',
        description: siteData.description || '',
        keywords: siteData.keywords || '',
        logo: siteData.logo || '',
        favicon: siteData.favicon || '',
        contactEmail: siteData.contactEmail || '',
        contactPhone: siteData.contactPhone || '',
        address: siteData.address || '',
        icp: siteData.icp || '',
        copyright: siteData.copyright || '',
        seo: {
          title: siteData.seo?.title || '',
          description: siteData.seo?.description || '',
          keywords: siteData.seo?.keywords || '',
          ogImage: siteData.seo?.ogImage || '',
        }
      });
    }
  }, [state.site, form]);

  // 保存网站设置
  const handleSave = async (values: SiteSettingsForm) => {
    try {
      console.log('📝 表单提交的值:', values);
      console.log('📝 当前设置状态:', state.site);

      // 构建完整的网站设置数据结构
      const siteData = {
        name: values.name || '',
        description: values.description || '',
        keywords: values.keywords || '',
        logo: values.logo || '',
        favicon: values.favicon || '',
        contactEmail: values.contactEmail || '',
        contactPhone: values.contactPhone || '',
        address: values.address || '',
        icp: values.icp || '',
        copyright: values.copyright || '',
        seo: {
          title: values.seo?.title || '',
          description: values.seo?.description || '',
          keywords: values.seo?.keywords || '',
          ogImage: values.seo?.ogImage || '',
        }
      };

      console.log('📝 构建的网站设置数据:', siteData);

      // 先更新本地状态
      updateSiteSettings(siteData);

      // 保存到服务器
      const success = await saveSiteSettings();

      if (!success) {
        throw new Error('网站设置保存失败');
      }

      message.success('网站设置保存成功');
    } catch (error) {
      console.error('❌ 保存设置失败:', error);
      message.error('保存设置失败，请重试');
    }
  };

  const handleUploadSuccess = (result: any, type: 'logo' | 'favicon') => {
    if (result && result.data) {
      const fileUrl = result.data.fileUrl || result.data.url || '';

      if (type === 'logo') {
        setLogoUrl(fileUrl);
        form.setFieldsValue({ logo: fileUrl });
      } else if (type === 'favicon') {
        setFaviconUrl(fileUrl);
        form.setFieldsValue({ favicon: fileUrl });
      }

      message.success('上传成功');
    }
  };

  const handleUploadError = (error: Error) => {
    message.error(`上传失败: ${error.message}`);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
    >
      <SettingSection>
        <div className="section-title">
          <GlobalOutlined />
          基本信息
        </div>
        <div className="section-description">配置网站的基本信息和联系方式</div>

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="网站名称"
                rules={[{ required: true, message: '请输入网站名称' }]}
              >
                <Input placeholder="请输入网站名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contactEmail"
                label="联系邮箱"
                rules={[
                  { required: true, message: '请输入联系邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入联系邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="网站描述"
            rules={[{ required: true, message: '请输入网站描述' }]}
          >
            <TextArea
              placeholder="请输入网站描述"
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contactPhone"
                label="联系电话"
                rules={[{ required: true, message: '请输入联系电话' }]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="keywords"
                label="关键词"
              >
                <Input placeholder="请输入网站关键词，用逗号分隔" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="address"
                label="联系地址"
                rules={[{ required: true, message: '请输入联系地址' }]}
              >
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="icp"
                label="ICP备案号"
              >
                <Input placeholder="请输入ICP备案号" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="copyright"
            label="版权信息"
          >
            <Input placeholder="请输入版权信息" />
          </Form.Item>
        </Card>
      </SettingSection>

      <SettingSection>
        <div className="section-title">
          <LinkOutlined />
          网站图标
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card title="网站Logo" style={{ marginBottom: 16 }}>
              <Form.Item name="logo">
                <SimpleUploader
                  fileType="image"
                  category="logo"
                  maxFileSize={2 * 1024 * 1024} // 2MB
                  accept="image/*"
                  onUploadSuccess={(result) => handleUploadSuccess(result, 'logo')}
                  onUploadError={handleUploadError}
                >
                  {logoUrl ? (
                    <div style={{ position: 'relative', width: '100%', height: '150px' }}>
                      <img
                        src={logoUrl}
                        alt="Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          opacity: 0,
                          transition: 'opacity 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                      >
                        <span style={{ color: 'white' }}>重新上传</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div>点击或拖拽上传Logo</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>建议尺寸：200x60px，格式：PNG/JPG，最大2MB</div>
                    </div>
                  )}
                </SimpleUploader>
              </Form.Item>
            </Card>
          </Col>
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card title="网站图标" style={{ marginBottom: 16 }}>
              <Form.Item name="favicon">
                <SimpleUploader
                  fileType="image"
                  category="favicon"
                  maxFileSize={2 * 1024 * 1024} // 2MB
                  accept="image/*"
                  onUploadSuccess={(result) => handleUploadSuccess(result, 'favicon')}
                  onUploadError={handleUploadError}
                >
                  {faviconUrl ? (
                    <div style={{ position: 'relative', width: '100%', height: '150px' }}>
                      <img
                        src={faviconUrl}
                        alt="图标"
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          opacity: 0,
                          transition: 'opacity 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                      >
                        <span style={{ color: 'white' }}>重新上传</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div>点击或拖拽上传图标</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>建议尺寸：32x32px，格式：ICO/PNG，最大2MB</div>
                    </div>
                  )}
                </SimpleUploader>
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </SettingSection>

      <SettingSection>
        <div className="section-title">
          <SearchOutlined />
          SEO设置
        </div>
        <div className="section-description">配置搜索引擎优化相关信息</div>

        <Card style={{ marginBottom: 16 }}>
          <Form.Item
            name={['seo', 'title']}
            label="SEO标题"
            rules={[{ required: true, message: '请输入SEO标题' }]}
          >
            <Input placeholder="请输入SEO标题" />
          </Form.Item>

          <Form.Item
            name={['seo', 'description']}
            label="SEO描述"
            rules={[{ required: true, message: '请输入SEO描述' }]}
          >
            <TextArea
              placeholder="请输入SEO描述"
              rows={3}
              maxLength={160}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['seo', 'keywords']}
                label="SEO关键词"
              >
                <Input placeholder="请输入SEO关键词，用逗号分隔" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['seo', 'ogImage']}
                label="分享图片URL"
              >
                <Input placeholder="请输入分享图片URL" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </SettingSection>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={state.loading}
        >
          保存网站设置
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SiteSettings;