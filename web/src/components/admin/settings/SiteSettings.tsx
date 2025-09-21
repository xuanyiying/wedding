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
  PictureOutlined,
  LinkOutlined,
  WechatOutlined,
  VideoCameraOutlined,
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
  siteName: string;
  siteDescription: string;
  siteKeywords: string;
  logo: string;
  favicon: string;
  homepageBackgroundImage: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  workingHours: string;
  socialMedia: {
    wechat: string;
    officialAccount: string;
    douyin: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
}

const SiteSettings: React.FC = () => {
  const [form] = Form.useForm();
  const { state, updateSettings, saveSettings } = useSettings();
  const [homepageBackgroundImage, setHomepageBackgroundImage] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');

  // 初始化表单数据
  useEffect(() => {
    if (state.settings) {
      const settings = state.settings;

      if (settings.site?.logo) {
        setLogoUrl(settings.site.logo);
      }
      if (settings.site?.favicon) {
        setFaviconUrl(settings.site.favicon);
      }
      if (settings.homepageSections?.hero?.backgroundImage) {
        setHomepageBackgroundImage(settings.homepageSections.hero.backgroundImage);
      }

      // 映射API数据结构到表单字段
      const siteData = {
        siteName: settings.site?.name || '',
        siteDescription: settings.site?.description || '',
        siteKeywords: settings.site?.keywords || '',
        logo: settings.site?.logo || '',
        favicon: settings.site?.favicon || '',
        homepageBackgroundImage: settings.homepageSections?.hero?.backgroundImage || '',
        contactEmail: settings.homepageSections?.contact?.email || '',
        contactPhone: settings.homepageSections?.contact?.phone || '',
        address: settings.homepageSections?.contact?.address || '',
        workingHours: '', // 需要从其他地方获取
        socialMedia: {
          wechat: settings.homepageSections?.contact?.wechat || '',
          officialAccount: '', // 需要从其他地方获取
          douyin: settings.homepageSections?.contact?.douyin || '',
        },
        seo: {
          title: settings.seo?.title || '',
          description: settings.seo?.description || '',
          keywords: settings.seo?.keywords || ''
        }
      };
      form.setFieldsValue(siteData);
    }
  }, [state.settings, form]);

  // 保存网站设置
  const handleSave = async (values: SiteSettingsForm) => {
    try {
      const data = {
        site: {
          name: values.siteName,
          description: values.siteDescription,
          keywords: values.siteKeywords,
          logo: values.logo,
          favicon: values.favicon,
        },
        seo: values.seo,
        homepageSections: {
          ...state.settings?.homepageSections,
          hero: {
            ...state.settings?.homepageSections?.hero,
            backgroundImage: values.homepageBackgroundImage,
          },
          contact: {
            ...state.settings?.homepageSections?.contact,
            email: values.contactEmail,
            phone: values.contactPhone,
            address: values.address,
            wechat: values.socialMedia.wechat,
            douyin: values.socialMedia.douyin,
          }
        }
      };

      updateSettings(data);
      await saveSettings();
      message.success('网站设置保存成功');
    } catch (error) {
      message.error('保存设置失败，请重试');
    }
  };

  const handleUploadSuccess = (result: any, type: 'logo' | 'favicon' | 'homepageBackground') => {
    if (result && result.data) {
      const fileUrl = result.data.fileUrl || result.data.url || '';

      if (type === 'logo') {
        setLogoUrl(fileUrl);
        form.setFieldsValue({ logo: fileUrl });
      } else if (type === 'favicon') {
        setFaviconUrl(fileUrl);
        form.setFieldsValue({ favicon: fileUrl });
      } else if (type === 'homepageBackground') {
        setHomepageBackgroundImage(fileUrl);
        form.setFieldsValue({ homepageBackgroundImage: fileUrl });
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
                name="siteName"
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
            name="siteDescription"
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
                name="workingHours"
                label="营业时间"
              >
                <Input placeholder="请输入营业时间" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="联系地址"
            rules={[{ required: true, message: '请输入联系地址' }]}
          >
            <Input placeholder="请输入详细地址" />
          </Form.Item>
        </Card>
      </SettingSection>

      <SettingSection>
        <div className="section-title">
          <PictureOutlined />
          首页背景图片
        </div>
        <div className="section-description">上传一张图片作为网站首页的背景。</div>

        <Card style={{ marginBottom: 16 }}>
          <Form.Item name="homepageBackgroundImage">
            <SimpleUploader
              fileType="image"
              category="other"
              maxFileSize={5 * 1024 * 1024} // 5MB
              accept="image/*"
              onUploadSuccess={(result) => handleUploadSuccess(result, 'homepageBackground')}
              onUploadError={handleUploadError}
            >
              {homepageBackgroundImage ? (
                <div style={{ position: 'relative', width: '100%', height: '150px' }}>
                  <img
                    src={homepageBackgroundImage}
                    alt="背景图"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
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
                    <span style={{ color: 'white' }}>重新上传背景图</span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
                  <div>点击或拖拽上传背景图片</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>建议尺寸：1920x1080px，最大5MB</div>
                </div>
              )}
            </SimpleUploader>
          </Form.Item>
        </Card>
      </SettingSection>

      <SettingSection>
        <div className="section-title">
          <LinkOutlined />
          网站图标
        </div>
        <div className="section-description">上传网站Logo和图标</div>

        <Row gutter={16}>
          <Col span={12}>
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
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏷️</div>
                      <div>点击或拖拽上传Logo</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>建议尺寸：200x60px，格式：PNG/JPG，最大2MB</div>
                    </div>
                  )}
                </SimpleUploader>
              </Form.Item>
            </Card>
          </Col>
          <Col span={12}>
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
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏷️</div>
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
          <WechatOutlined />
          社交媒体
        </div>
        <div className="section-description">配置社交媒体账号信息</div>

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name={['socialMedia', 'wechat']} label="微信号">
                <Input placeholder="请输入微信号" prefix={<WechatOutlined />} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['socialMedia', 'officialAccount']} label="公众号">
                <Input placeholder="请输入公众号" prefix={<WechatOutlined />} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['socialMedia', 'douyin']} label="抖音账号">
                <Input placeholder="请输入抖音账号" prefix={<VideoCameraOutlined />} />
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
          保存设置
        </Button>
      </Form.Item>
    </Form>
  );
};

export default SiteSettings;