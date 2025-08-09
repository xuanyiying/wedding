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
  InputNumber} from 'antd';
import { useTheme } from '../../hooks/useTheme';
import {
  SaveOutlined,
  UploadOutlined,
  MailOutlined,
  GlobalOutlined,
  BgColorsOutlined} from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload/interface';

import styled from 'styled-components';
import { PageHeader, ImageWithPreview } from '../../components/admin/common';
import { settingsService, directUploadService } from '../../services';
import { FileType } from '../../types';

const { TabPane } = Tabs;
const { TextArea } = Input;

const SettingsContainer = styled.div`
  padding: 24px;
`;

const TabCard = styled.div`
  background: var(--admin-bg-container);
  border: 1px solid var(--admin-border-color);
  border-radius: var(--admin-border-radius);
  box-shadow: var(--admin-shadow-sm);
  padding: 24px;
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


interface SiteSettings {
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

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  enableSSL: boolean;
}




interface ThemeSettings {
  primaryColor: string;
  borderRadius: number;
  compactMode: boolean;
  darkMode: boolean;
  fontSize: number;
}

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('site');
  const [siteForm] = Form.useForm();
  const [homepageBackgroundImage, setHomepageBackgroundImage] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [emailForm] = Form.useForm();

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
      const data = response.data || {};
      const { site, email } = data;
      
      // 填充网站设置表单
      if (site) {
        const siteData = {
          siteName: site.site_name,
          siteDescription: site.site_description,
          contactEmail: site.contact_email,
          contactPhone: site.contact_phone,
          workingHours: site.working_hours,
          address: site.address,
          socialMedia: {
            wechat: site.wechat,
            weibo: site.weibo,
            instagram: site.instagram,
          },
          seo: {
            title: site.seo_title,
            description: site.seo_description,
            keywords: site.seo_keywords,
          },
          logo: site.logo,
          favicon: site.favicon,
          siteKeywords: site.site_keywords,
          homepageBackgroundImage: site.homepage_background_image,
        };

        if (site.homepage_background_image) {
          setHomepageBackgroundImage(site.homepage_background_image);
        }
        if (site.logo) {
          setLogoUrl(site.logo);
        }
        if (site.favicon) {
          setFaviconUrl(site.favicon);
        }

        siteForm.setFieldsValue(siteData);
      }
      
      // 填充邮件设置表单
      if (email) {
        const emailData = {
          smtpHost: email.smtp_host,
          smtpPort: email.smtp_port,
          smtpUser: email.smtp_user,
          smtpPassword: email.smtp_password,
          enableSSL: email.smtp_secure,
          fromEmail: email.email_from,
          fromName: email.email_from_name,
        };

        emailForm.setFieldsValue(emailData);
      }
      


      
      // 填充主题设置表单
      if (data.theme) {
        const themeData = {
          primaryColor: data.theme.primary_color || '#1890ff',
          borderRadius: data.theme.border_radius || 6,
          compactMode: data.theme.compact_mode || false,
          darkMode: data.theme.dark_mode || false,
          fontSize: data.theme.font_size || 14,
        };

        themeForm.setFieldsValue(themeData);
        // 应用客户端主题变体
      } else {
        // 如果没有主题数据，应用默认客户端主题
      }
    } catch (error) {
      message.error('加载设置失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 保存网站设置
  const saveSiteSettings = async (values: SiteSettings) => {
    try {
      setLoading(true);
      const data = {
        siteName: values.siteName,
        siteDescription: values.siteDescription,
        contactEmail: values.contactEmail,
        contactPhone: values.contactPhone,
        workingHours: values.workingHours,
        address: values.address,
        wechat: values.socialMedia?.wechat,
        weibo: values.socialMedia?.weibo,
        instagram: values.socialMedia?.instagram,
        seoTitle: values.seo?.title,
        seoDescription: values.seo?.description,
        seoKeywords: values.seo?.keywords,
        homepageBackgroundImage: values.homepageBackgroundImage,
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
  const saveEmailSettings = async (values: EmailSettings) => {
    try {
      setLoading(true);
      const data = {
        smtpHost: values.smtpHost,
        smtpPort: values.smtpPort,
        smtpUser: values.smtpUser,
        smtpPassword: values.smtpPassword,
        smtpSecure: values.enableSSL,
        emailFrom: values.fromEmail,
        emailFromName: values.fromName,
      };
      await settingsService.updateEmailSettings(data);
      

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

  // 保存主题设置
  const saveThemeSettings = async (values: ThemeSettings) => {
    try {
      setLoading(true);
      const data = {
        primaryColor: values.primaryColor,
        borderRadius: values.borderRadius,
        compactMode: values.compactMode,
        darkMode: values.darkMode,
        fontSize: values.fontSize,
      };
      await settingsService.updateSiteSettings(data);
      
     
      

      message.success('主题设置保存成功');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 重置主题设置
  const resetTheme = () => {
    const defaultTheme = {
      primaryColor: '#1890ff',
      borderRadius: 6,
      compactMode: false,
      darkMode: false,
      fontSize: 14,
    };

    themeForm.setFieldsValue(defaultTheme);
    message.success('主题已重置为默认设置');
  };
  
  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
        return false;
      }
      
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('图片大小不能超过2MB!');
        return false;
      }
      
      return false; // 阻止自动上传
    },
    onChange: (info) => {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} 上传成功`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`);
      }
    }
  };
  
  const handleUpload = async (file: File, type: 'logo' | 'favicon' | 'homepageBackground') => {
    try {
      setLoading(true);
      const result = await directUploadService.uploadFile(file, FileType.IMAGE, 'other');
      const fileUrl = result.url;

      if (type === 'logo') {
        setLogoUrl(fileUrl);
        siteForm.setFieldsValue({ logo: fileUrl });
        await settingsService.updateSiteSettings({ logo: fileUrl });
      } else if (type === 'favicon') {
        setFaviconUrl(fileUrl);
        siteForm.setFieldsValue({ favicon: fileUrl });
        await settingsService.updateSiteSettings({ favicon: fileUrl });
      } else if (type === 'homepageBackground') {
        setHomepageBackgroundImage(fileUrl);
        siteForm.setFieldsValue({ homepageBackgroundImage: fileUrl });
        await settingsService.updateSiteSettings({ homepageBackgroundImage: fileUrl });
      }
      
      message.success('上传成功');
    } catch (error) {
      message.error('上传失败');
    } finally {
      setLoading(false);
    }
  };

  const customUploadRequest = (options: any, type: 'logo' | 'favicon' | 'homepageBackground') => {
    handleUpload(options.file, type);
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
                    >
                      <Button icon={<UploadOutlined />}>点击上传</Button>
                    </Upload>
                    {homepageBackgroundImage && (
                      <div style={{ marginTop: 16 }}>
                        <ImageWithPreview width={200} src={homepageBackgroundImage} />
                      </div>
                    )}
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
                      >
                        <Button icon={<UploadOutlined />}>上传Logo</Button>
                      </Upload>
                      {logoUrl && (
                        <div style={{ marginTop: 16 }}>
                          <ImageWithPreview width={200} src={logoUrl} />
                        </div>
                      )}
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
                      >
                        <Button icon={<UploadOutlined />}>上传图标</Button>
                      </Upload>
                      {faviconUrl && (
                        <div style={{ marginTop: 16 }}>
                          <ImageWithPreview width={32} src={faviconUrl} />
                        </div>
                      )}
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
                <div className="section-title">布局配置</div>
                <div className="section-description">调整界面布局和显示效果</div>
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="borderRadius"
                      label="圆角大小"
                      rules={[{ required: true, message: '请输入圆角大小' }]}
                    >
                      <InputNumber min={0} max={20} addonAfter="px" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="fontSize"
                      label="字体大小"
                      rules={[{ required: true, message: '请输入字体大小' }]}
                    >
                      <InputNumber min={12} max={18} addonAfter="px" style={{ width: '100%' }} />
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
                        <span>深色模式</span>
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>
              </SettingSection>
              
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                    保存设置
                  </Button>
                  <Button onClick={resetTheme}>
                    重置为默认
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </TabCard>
        </TabPane>
        
      </Tabs>
    </SettingsContainer>
  );
};

export default SettingsPage;