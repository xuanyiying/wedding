import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  Upload,
  message,
  Space,
  Row,
  Col,
  InputNumber,
  Card,
  ColorPicker,
  Select,
} from 'antd';
import { useTheme } from '../../hooks/useTheme';
import {
  SaveOutlined,
  PlusOutlined,
  MailOutlined,
  GlobalOutlined,
  HomeOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';

import styled from 'styled-components';
import { PageHeader } from '../../components/admin/common';
import { settingsService, directUploadService } from '../../services';
import { FileType } from '../../types';

const { TabPane } = Tabs;
const { TextArea } = Input;

const SettingsContainer = styled.div`
  padding: 12px;
  
  @media (max-width: 768px) {
    padding: 8px;
  }
`;

const TabCard = styled.div`
  background: var(--admin-bg-container);
  border: 1px solid var(--admin-border-color);
  border-radius: var(--admin-border-radius);
  box-shadow: var(--admin-shadow-sm);
  padding: 12px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const SettingSection = styled.div`
  margin-bottom: 32px;
  
  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--admin-text-primary);
  }
  
  .section-description {
    color: var(--admin-text-secondary);
    margin-bottom: 16px;
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
    weibo: string;
    instagram: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
}

interface EmailSettingsForm {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  enableSSL: boolean;
}

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('site');
  const [siteForm] = Form.useForm();
  const [homepageSectionsForm] = Form.useForm();
  const [homepageBackgroundImage, setHomepageBackgroundImage] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [emailForm] = Form.useForm();
  const [uploadingStates, setUploadingStates] = useState<{[key: string]: boolean}>({});

  const { initTheme } = useTheme();

  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);


  
  const [themeForm] = Form.useForm();
  
  // 加载设置数据
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getSettings();
      const settings = response.data || {};
      
      // 填充网站设置表单
      if (settings) {
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
          contact: {
            email: settings.homepageSections?.contact?.email || '',
            phone: settings.homepageSections?.contact?.phone || '',
            address: settings.homepageSections?.contact?.address || '',
            wechat: settings.homepageSections?.contact?.wechat || '',
            xiaohongshu: settings.homepageSections?.contact?.xiaohongshu || '',
            douyin: settings.homepageSections?.contact?.douyin || '',
          },
          seo: {
            title: settings.seo?.title || '',
            description: settings.seo?.description || '',
            keywords: settings.seo?.keywords || ''
          }
        };
        siteForm.setFieldsValue(siteData);
      }

      // 填充首页配置表单
      if (settings?.homepageSections) {
        const sectionsData = {
          hero: {
            title: settings.homepageSections.hero?.title || '',
            subtitle: settings.homepageSections.hero?.description || '',
            enabled: settings.homepageSections.hero?.visible || false
            ? 'visible'
            : 'hidden',
          },
          team: {
            title: settings.homepageSections.team?.title || '',
            description: settings.homepageSections.team?.description || '',
            visible: settings.homepageSections.team?.visible || false
          },
           teamShowcase: {
            title: settings.homepageSections.teamShowcase?.title || '',
            description: settings.homepageSections.teamShowcase?.description || '',
            visible: settings.homepageSections.teamShowcase?.visible || false
          },
          portfolio: {
            title: settings.homepageSections.portfolio?.title || '',
            description: settings.homepageSections.portfolio?.description || '',
            visible: settings.homepageSections.portfolio?.visible || false
          },
          schedule: {
            title: settings.homepageSections.schedule?.title || '',
            description: settings.homepageSections.schedule?.description || '',
            enabled: settings.homepageSections.schedule?.visible || false,
          },
          contact: {
            title: settings.homepageSections.contact?.title || '',
            description: settings.homepageSections.contact?.description || '',
            visible: settings.homepageSections.contact?.visible || false
          }
        };
        homepageSectionsForm.setFieldsValue(sectionsData);
      }
      
      // 填充邮件设置表单
      if (settings.email) {
        const emailData = {
          smtpHost: settings.email.smtpHost,
          smtpPort: settings.email.smtpPort,
          smtpUser: settings.email.smtpUser,
          smtpPassword: settings.email.smtpPassword,
          enableSSL: settings.email.smtpSecure,
          fromEmail: settings.email.emailFrom,
          fromName: settings.email.emailFromName,
        };
        emailForm.setFieldsValue(emailData);
      }
      
      // 填充主题设置表单
      if (settings.theme) {
        const themeData = {
          primaryColor: settings.theme.colors?.primary || '#1890ff',
          spacing: {
            containerPadding: settings.theme.spacing?.containerPadding || '16px',
            sectionPadding: settings.theme.spacing?.sectionPadding || '24px'
          }
        };
        themeForm.setFieldsValue(themeData);
      }
    } catch (error) {
      message.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  const saveHomepageSections = async (values: any) => {
    try {
      setLoading(true);
      await settingsService.updateHomepageSections(values);
      message.success('首页配置保存成功');
    } catch (error) {
      message.error('首页配置保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存主题设置
  const saveThemeSettings = async (values: any) => {
    try {
      setLoading(true);
      const themeData = {
        theme: {
          colors: {
            primary: values.primaryColor,
            secondary: '#52c41a',
            background: '#ffffff',
            text: '#000000'
          },
          fonts: {
            primary: 'Arial',
            secondary: 'Georgia'
          },
          spacing: {
            containerPadding: values.spacing?.containerPadding || '16px',
            sectionPadding: values.spacing?.sectionPadding || '24px'
          },
          borderRadius: values.borderRadius,
          compactMode: values.compactMode,
          darkMode: values.darkMode,
          fontSize: values.fontSize,
          clientThemeVariant: values.clientThemeVariant
        }
      };
      await settingsService.updateSiteSettings(themeData);
      message.success('主题设置保存成功');
    } catch (error) {
      message.error('主题设置保存失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 保存网站设置
  const saveSiteSettings = async (values: SiteSettingsForm) => {
    try {
      setLoading(true);
      const data = {
        site: {
          name: values.siteName,
          description: values.siteDescription,
          keywords: values.siteKeywords,
          logo: values.logo,
          favicon: values.favicon,
        }
      };
      await settingsService.updateSiteSettings(data);
      

      message.success('网站设置保存成功');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 保存邮件设置
  const saveEmailSettings = async (values: EmailSettingsForm) => {
    try {
      setLoading(true);
      const data = {
        email: {
          smtpHost: values.smtpHost,
          smtpPort: values.smtpPort,
          smtpUser: values.smtpUser,
          smtpPassword: values.smtpPassword,
          smtpSecure: values.enableSSL,
          emailFrom: values.fromEmail,
          emailFromName: values.fromName,
        }
      };
      await settingsService.updateSiteSettings(data);
      

      message.success('邮件设置保存成功');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  

  
  // 测试邮件发送
  const testEmail = async () => {
    try {
      setLoading(true);
      const emailFormValues = emailForm.getFieldsValue();
      await settingsService.testEmail({
        to: emailFormValues.fromEmail || 'test@example.com',
        subject: '测试邮件',
        content: '这是一封测试邮件，用于验证邮件配置是否正确。'
      });
      
      message.success('测试邮件发送成功');
    } catch (error) {
      console.error('邮件发送失败:', error);
      message.error('邮件发送失败');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpload = async (file: File, type: 'logo' | 'favicon' | 'homepageBackground') => {
    try {
      setUploadingStates(prev => ({ ...prev, [type]: true }));
      const result = await directUploadService.uploadFile(file, FileType.IMAGE, 'other');
      const fileUrl = result.url;

      if (type === 'logo') {
        setLogoUrl(fileUrl);
        siteForm.setFieldsValue({ logo: fileUrl });
      } else if (type === 'favicon') {
        setFaviconUrl(fileUrl);
        siteForm.setFieldsValue({ favicon: fileUrl });
      } else if (type === 'homepageBackground') {
        setHomepageBackgroundImage(fileUrl);
        siteForm.setFieldsValue({ homepageBackgroundImage: fileUrl });
      }
      
      message.success('上传成功');
    } catch (error) {
      message.error('上传失败');
    } finally {
      setUploadingStates(prev => ({ ...prev, [type]: false }));
    }
  };

  const customUploadRequest = (options: any, type: 'logo' | 'favicon' | 'homepageBackground') => {
    handleUpload(options.file, type)
      .then(() => {
        options.onSuccess?.(options.file);
      })
      .catch((error) => {
        options.onError?.(error);
      });
  };

  const beforeUpload = (file: any) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过2MB!');
    }
    return isImage && isLt2M;
  };


  
  return (
    <SettingsContainer>
      <PageHeader title="系统设置" />
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 网站设置 */}
        <TabPane tab={<span><GlobalOutlined />网站设置</span>} key="site">
          <TabCard>
            <Form
              form={siteForm}
              layout="vertical"
              onFinish={saveSiteSettings}
            >
              <SettingSection>
                <div className="section-title">基本信息</div>
                <div className="section-description">配置网站的基本信息和联系方式</div>
                
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

                <SettingSection>
                  <div className="section-title">首页背景图片</div>
                  <div className="section-description">上传一张图片作为网站首页的背景。</div>
                  <Form.Item name="homepageBackgroundImage">
                    <Upload
                      name="file"
                      action={`${import.meta.env.VITE_API_URL}/files/upload`}
                      headers={{ Authorization: `Bearer ${localStorage.getItem('adminToken')}` }}
                      beforeUpload={beforeUpload}
                      customRequest={(options) => customUploadRequest(options, 'homepageBackground')}
                      showUploadList={false}
                      listType="picture-card"
                    >
                      {homepageBackgroundImage ? (
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <img 
                            src={homepageBackgroundImage} 
                            alt="背景图" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            opacity: 0,
                            transition: 'opacity 0.3s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                          >
                            {uploadingStates.homepageBackground ? '上传中...' : '重新上传'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <PlusOutlined />
                          <div style={{ marginTop: 8 }}>
                            {uploadingStates.homepageBackground ? '上传中...' : '上传背景图'}
                          </div>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>
                </SettingSection>
                
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
                      rules={[{ required: true, message: '请输入营业时间' }]}
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
              </SettingSection>
              
              <SettingSection>
                <div className="section-title">品牌资源</div>
                <div className="section-description">上传网站Logo和图标</div>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="logo" label="网站Logo">
                      <Upload
                        name="file"
                        action={`${import.meta.env.VITE_API_URL}/files/upload`}
                        headers={{ Authorization: `Bearer ${localStorage.getItem('adminToken')}` }}
                        beforeUpload={beforeUpload}
                        customRequest={(options) => customUploadRequest(options, 'logo')}
                        showUploadList={false}
                        listType="picture-card"
                      >
                        {logoUrl ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img 
                              src={logoUrl} 
                              alt="Logo" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(0,0,0,0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              opacity: 0,
                              transition: 'opacity 0.3s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                            >
                              {uploadingStates.logo ? '上传中...' : '重新上传'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>
                              {uploadingStates.logo ? '上传中...' : '上传Logo'}
                            </div>
                          </div>
                        )}
                      </Upload>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 4 }}>建议尺寸：200x60px，格式：PNG/JPG</div>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="favicon" label="网站图标">
                      <Upload
                        name="file"
                        action={`${import.meta.env.VITE_API_URL}/files/upload`}
                        headers={{ Authorization: `Bearer ${localStorage.getItem('adminToken')}` }}
                        beforeUpload={beforeUpload}
                        customRequest={(options) => customUploadRequest(options, 'favicon')}
                        showUploadList={false}
                        listType="picture-card"
                      >
                        {faviconUrl ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img 
                              src={faviconUrl} 
                              alt="图标" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(0,0,0,0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              opacity: 0,
                              transition: 'opacity 0.3s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                            >
                              {uploadingStates.favicon ? '上传中...' : '重新上传'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>
                              {uploadingStates.favicon ? '上传中...' : '上传图标'}
                            </div>
                          </div>
                        )}
                      </Upload>
                      <div style={{ fontSize: 12, color: 'var(--admin-text-secondary)', marginTop: 4 }}>建议尺寸：32x32px，格式：ICO/PNG</div>
                    </Form.Item>
                  </Col>
                </Row>
              </SettingSection>
              
              <SettingSection>
                <div className="section-title">社交媒体</div>
                <div className="section-description">配置社交媒体账号信息</div>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name={['socialMedia', 'wechat']} label="微信号">
                      <Input placeholder="请输入微信号" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['socialMedia', 'officialAccount']} label="公众号">
                      <Input placeholder="请输入公众号" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['socialMedia', 'douyin']} label="抖音账号">
                      <Input placeholder="请输入抖音账号" />
                    </Form.Item>  
                  </Col>
                </Row>
              </SettingSection>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </TabCard>
        </TabPane>
        
        <TabPane tab={<span><HomeOutlined />首页配置</span>} key="homepage">
          <TabCard>
            <Form
              form={homepageSectionsForm}
              layout="vertical"
              onFinish={saveHomepageSections}
            >
              <SettingSection>
                <div className="section-title">首页配置</div>
                <div className="section-description">配置首页的内容和显示</div>
                <Row gutter={16}>
                  {[
                    { key: 'hero', title: '首页横幅', hasSubtitle: true },
                    { key: 'services', title: '服务介绍' },
                    { key: 'portfolio', title: '作品展示' },
                    { key: 'testimonials', title: '客户评价' },
                    { key: 'contact', title: '联系我们' }
                  ].map(section => (
                    <Col span={12} key={section.key}>
                      <Card title={section.title} style={{ marginBottom: 16 }}>
                        <Form.Item
                          name={[section.key, 'title']}
                          label="标题"
                        >
                          <Input placeholder={`请输入${section.title}标题`} />
                        </Form.Item>
                        {section.hasSubtitle && (
                          <Form.Item
                            name={[section.key, 'subtitle']}
                            label="副标题"
                          >
                            <Input placeholder="请输入副标题" />
                          </Form.Item>
                        )}
                        <Form.Item
                          name={[section.key, 'enabled']}
                          label="启用"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </SettingSection>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                  保存首页配置
                </Button>
              </Form.Item>
            </Form>
          </TabCard>
        </TabPane>

        {/* 邮件设置 */}
        <TabPane tab={<span><MailOutlined />邮件设置</span>} key="email">
          <TabCard>
            <Form
              form={emailForm}
              layout="vertical"
              onFinish={saveEmailSettings}
            >
              <SettingSection>
                <div className="section-title">SMTP配置</div>
                <div className="section-description">配置邮件发送服务器信息</div>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="smtpHost"
                      label="SMTP服务器"
                      rules={[{ required: true, message: '请输入SMTP服务器' }]}
                    >
                      <Input placeholder="例如：smtp.qq.com" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="smtpPort"
                      label="端口号"
                      rules={[{ required: true, message: '请输入端口号' }]}
                    >
                      <InputNumber placeholder="例如：587" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="smtpUser"
                      label="用户名"
                      rules={[{ required: true, message: '请输入用户名' }]}
                    >
                      <Input placeholder="请输入SMTP用户名" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="smtpPassword"
                      label="密码"
                      rules={[{ required: true, message: '请输入密码' }]}
                    >
                      <Input.Password placeholder="请输入SMTP密码" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item name="enableSSL" valuePropName="checked">
                  <Space>
                    <Switch />
                    <span>启用SSL加密</span>
                  </Space>
                </Form.Item>
              </SettingSection>
              
              <SettingSection>
                <div className="section-title">发件人信息</div>
                <div className="section-description">配置邮件发送者信息</div>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="fromEmail"
                      label="发件人邮箱"
                      rules={[
                        { required: true, message: '请输入发件人邮箱' },
                        { type: 'email', message: '请输入有效的邮箱地址' }
                      ]}
                    >
                      <Input placeholder="请输入发件人邮箱" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="fromName"
                      label="发件人姓名"
                      rules={[{ required: true, message: '请输入发件人姓名' }]}
                    >
                      <Input placeholder="请输入发件人姓名" />
                    </Form.Item>
                  </Col>
                </Row>
              </SettingSection>
              
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    保存设置
                  </Button>
                  <Button onClick={testEmail} loading={loading}>
                    测试邮件发送
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabCard>
        </TabPane>

        {/* 主题设置 */}
        <TabPane tab={<span><BgColorsOutlined />主题设置</span>} key="theme">
          <TabCard>
            <Form
              form={themeForm}
              layout="vertical"
              onFinish={saveThemeSettings}
            >
              <SettingSection>
                <div className="section-title">主题配置</div>
                <div className="section-description">配置网站的主题样式和外观</div>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="primaryColor"
                      label="主题色"
                      rules={[{ required: true, message: '请选择主题色' }]}
                    >
                      <ColorPicker showText />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="borderRadius"
                      label="边框圆角 (px)"
                      rules={[{ required: true, message: '请输入边框圆角' }]}
                    >
                      <InputNumber min={0} max={20} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="fontSize"
                      label="字体大小 (px)"
                      rules={[{ required: true, message: '请输入字体大小' }]}
                    >
                      <InputNumber min={12} max={18} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="clientThemeVariant"
                      label="客户端主题变体"
                      rules={[{ required: true, message: '请选择主题变体' }]}
                    >
                      <Select
                        options={[
                          { value: 'default', label: '默认' },
                          { value: 'elegant', label: '优雅' },
                          { value: 'modern', label: '现代' },
                          { value: 'classic', label: '经典' }
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="compactMode" valuePropName="checked">
                      <Space>
                        <Switch />
                        <span>紧凑模式</span>
                      </Space>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="darkMode" valuePropName="checked">
                      <Space>
                        <Switch />
                        <span>暗黑模式</span>
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>
              </SettingSection>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存主题设置
                </Button>
              </Form.Item>
            </Form>
          </TabCard>
        </TabPane>
        
      </Tabs>
    </SettingsContainer>
  );
};

export default SettingsPage;