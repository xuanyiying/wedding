import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  message,
  Space,
  Row,
  Col,
  InputNumber,
  Card,
  ColorPicker,
  Typography,
  Tooltip,
  Alert,
} from 'antd';
import { useTheme } from '../../hooks/useTheme';
import {
  SaveOutlined,
  MailOutlined,
  GlobalOutlined,
  HomeOutlined,
  BgColorsOutlined,
  EyeOutlined,
  HeartOutlined,
  StarOutlined,
  CrownOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

import styled from 'styled-components';
import { PageHeader } from '../../components/admin/common';
import { settingsService } from '../../services';
import { showSuccessNotification } from '../../components/common/SuccessNotification';
import { SimpleUploader } from '../../components/common/SimpleUploader';

const { TextArea } = Input;
const { Title, Text } = Typography;

// 婚礼主题预设方案
const WEDDING_THEME_PRESETS = [
  {
    id: 'elegant-rose',
    name: '优雅玫瑰',
    description: '温柔浪漫的玫瑰金配色，营造优雅氛围',
    icon: <HeartOutlined />,
    colors: {
      primary: '#D4A574',
      secondary: '#F5E6D3',
      accent: '#B8956A',
      background: '#FEFCF9',
      text: '#5D4E37'
    }
  },
  {
    id: 'classic-ivory',
    name: '经典象牙白',
    description: '纯净典雅的象牙白主题，永恒经典',
    icon: <StarOutlined />,
    colors: {
      primary: '#F8F6F0',
      secondary: '#E8E2D5',
      accent: '#D4C4A8',
      background: '#FFFFFF',
      text: '#4A4A4A'
    }
  },
  {
    id: 'royal-purple',
    name: '皇室紫',
    description: '高贵典雅的紫色系，彰显尊贵气质',
    icon: <CrownOutlined />,
    colors: {
      primary: '#8B5A96',
      secondary: '#E6D7EA',
      accent: '#6B4C75',
      background: '#FAF8FB',
      text: '#4A3B4F'
    }
  },
  {
    id: 'modern-blush',
    name: '现代腮红',
    description: '时尚的腮红粉配色，现代浪漫风格',
    icon: <HeartOutlined />,
    colors: {
      primary: '#E8B4B8',
      secondary: '#F5E1E3',
      accent: '#D19CA1',
      background: '#FEFBFC',
      text: '#5A4A4C'
    }
  }
];

const SettingsContainer = styled.div`
  padding: 24px;
  background: var(--admin-bg-layout);
  min-height: calc(100vh - 64px);
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const TabCard = styled.div`
  background: var(--admin-bg-container);
  border: 1px solid var(--admin-border-color);
  border-radius: 12px;
  box-shadow: var(--admin-shadow-sm);
  padding: 32px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    padding: 20px;
  }
`;

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

const ThemePresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const ThemePresetCard = styled.div<{ selected?: boolean }>`
  border: 2px solid ${props => props.selected ? 'var(--admin-primary-color)' : 'var(--admin-border-color)'};
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--admin-bg-container);
  position: relative;
  
  &:hover {
    border-color: var(--admin-primary-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  
  .preset-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  
  .preset-icon {
    font-size: 20px;
    color: var(--admin-primary-color);
  }
  
  .preset-name {
    font-weight: 600;
    font-size: 16px;
    color: var(--admin-text-primary);
  }
  
  .preset-description {
    color: var(--admin-text-secondary);
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 16px;
  }
  
  .color-palette {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 2px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .selected-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    color: var(--admin-primary-color);
    font-size: 18px;
  }
`;

const ColorCustomizer = styled.div`
  background: var(--admin-bg-secondary, #fafafa);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  
  .customizer-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--admin-text-primary);
  }
`;

const PreviewSection = styled.div`
  background: var(--admin-bg-secondary, #fafafa);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  
  .preview-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--admin-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .preview-content {
    border: 1px solid var(--admin-border-color);
    border-radius: 8px;
    padding: 20px;
    background: white;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
`;

const SaveButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid var(--admin-border-color);
  margin-top: 32px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    
    .ant-btn {
      width: 100%;
    }
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
  const [themeForm] = Form.useForm();

  // 主题相关状态
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customColors, setCustomColors] = useState({
    primary: '#D4A574',
    secondary: '#F5E6D3',
    accent: '#B8956A',
    background: '#FEFCF9',
    text: '#5D4E37'
  });
  const [previewMode, setPreviewMode] = useState(false);

  const { initTheme, applyThemeSettings } = useTheme();

  useEffect(() => {
    initTheme('admin');
  }, [initTheme]);

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

  // 选择主题预设
  const handlePresetSelect = (presetId: string) => {
    const preset = WEDDING_THEME_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setCustomColors(preset.colors);

      // 更新表单值
      themeForm.setFieldsValue({
        primaryColor: preset.colors.primary,
        secondaryColor: preset.colors.secondary,
        accentColor: preset.colors.accent,
        backgroundColor: preset.colors.background,
        textColor: preset.colors.text,
        clientThemeVariant: presetId
      });

      // 实时预览
      if (previewMode) {
        applyPreviewTheme(preset.colors);
      }

      showSuccessNotification({
        title: `已选择 ${preset.name} 主题`,
        description: preset.description,
        duration: 3
      });
    }
  };

  // 应用预览主题
  const applyPreviewTheme = (colors: any) => {
    const root = document.documentElement;
    root.style.setProperty('--client-primary-color', colors.primary);
    root.style.setProperty('--client-secondary-color', colors.secondary);
    root.style.setProperty('--client-accent-color', colors.accent);
    root.style.setProperty('--client-bg-primary', colors.background);
    root.style.setProperty('--client-text-primary', colors.text);
  };

  // 切换预览模式
  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
    if (!previewMode) {
      applyPreviewTheme(customColors);
      message.info('预览模式已开启，您可以实时查看主题效果');
    } else {
      // 恢复原始主题
      initTheme('admin');
      message.info('预览模式已关闭');
    }
  };

  // 自定义颜色变化处理
  const handleColorChange = (colorType: string, color: any) => {
    const colorValue = typeof color === 'string' ? color : color.toHexString();
    const newColors = { ...customColors, [colorType]: colorValue };
    setCustomColors(newColors);

    // 清除预设选择
    setSelectedPreset('');

    // 实时预览
    if (previewMode) {
      applyPreviewTheme(newColors);
    }
  };

  // 保存主题设置
  const saveThemeSettings = async (values: any) => {
    try {
      setLoading(true);
      const themeData = {
        theme: {
          colors: {
            primary: customColors.primary,
            secondary: customColors.secondary,
            accent: customColors.accent,
            background: customColors.background,
            text: customColors.text
          },
          fonts: {
            primary: 'Arial',
            secondary: 'Georgia'
          },
          spacing: {
            containerPadding: values.spacing?.containerPadding || '16px',
            sectionPadding: values.spacing?.sectionPadding || '24px'
          },
          borderRadius: values.borderRadius || 8,
          compactMode: values.compactMode || false,
          darkMode: values.darkMode || false,
          fontSize: values.fontSize || 14,
          clientThemeVariant: selectedPreset || 'custom'
        }
      };

      await settingsService.updateSiteSettings(themeData);

      // 关闭预览模式并应用最终主题
      setPreviewMode(false);
      applyThemeSettings(themeData.theme);

      showSuccessNotification({
        title: '主题设置保存成功！',
        description: '您的婚礼主题配色已应用到客户端界面，访客将看到全新的视觉效果',
        duration: 4
      });
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

  const handleUploadSuccess = (results: any[], type: 'logo' | 'favicon' | 'homepageBackground') => {
    if (results && results.length > 0) {
      const fileUrl = results[0].url;

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
    }
  };

  const handleUploadError = (error: Error) => {
    message.error(`上传失败: ${error.message}`);
  };





  return (
    <SettingsContainer>
      <PageHeader title="系统设置" />

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'site',
          label: <span><GlobalOutlined />网站设置</span>,
          children: (
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
                      <SimpleUploader
                        fileType="image"
                        category="other"
                        maxFileSize={5 * 1024 * 1024} // 5MB
                        accept="image/*"
                        onUploadSuccess={(result) => handleUploadSuccess([result], 'homepageBackground')}
                        onUploadError={handleUploadError}
                        className="mb-4"
                      >
                        {homepageBackgroundImage ? (
                          <div className="relative w-full h-32">
                            <img
                              src={homepageBackgroundImage}
                              alt="背景图"
                              className="w-full h-full object-cover rounded"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity rounded">
                              重新上传背景图
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">🖼️</div>
                            <div>点击或拖拽上传背景图片</div>
                            <div className="text-sm text-gray-500 mt-1">建议尺寸：1920x1080px，最大5MB</div>
                          </div>
                        )}
                      </SimpleUploader>
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
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="logo" label="网站Logo">
                        <SimpleUploader
                          fileType="image"
                          category="logo"
                          maxFileSize={2 * 1024 * 1024} // 2MB
                          accept="image/*"
                          onUploadSuccess={(result) => handleUploadSuccess([result], 'logo')}
                          onUploadError={handleUploadError}
                          className="mb-4"
                        >
                          {logoUrl ? (
                            <div className="relative w-full h-32">
                              <img
                                src={logoUrl}
                                alt="Logo"
                                className="w-full h-full object-contain rounded"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity rounded">
                                重新上传
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-2">🏷️</div>
                              <div>点击或拖拽上传Logo</div>
                              <div className="text-sm text-gray-500 mt-1">建议尺寸：200x60px，格式：PNG/JPG，最大2MB</div>
                            </div>
                          )}
                        </SimpleUploader>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="favicon" label="网站图标">
                        <SimpleUploader
                          fileType="image"
                          category="favicon"
                          maxFileSize={2 * 1024 * 1024} // 2MB
                          accept="image/*"
                          onUploadSuccess={(result) => handleUploadSuccess([result], 'favicon')}
                          onUploadError={handleUploadError}
                          className="mb-4"
                        >
                          {faviconUrl ? (
                            <div className="relative w-full h-32">
                              <img
                                src={faviconUrl}
                                alt="图标"
                                className="w-full h-full object-contain rounded"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity rounded">
                                重新上传
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-2">🏷️</div>
                              <div>点击或拖拽上传图标</div>
                              <div className="text-sm text-gray-500 mt-1">建议尺寸：32x32px，格式：ICO/PNG，最大2MB</div>
                            </div>
                          )}
                        </SimpleUploader>
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
          )
        },
        {
          key: 'homepage',
          label: <span><HomeOutlined />首页配置</span>,
          children: (
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
          )
        },

        // 邮件设置
        {
          key: 'email',
          label: <span><MailOutlined />邮件设置</span>,
          children: (
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
          )
        },

        // 主题设置
        {
          key: 'theme',
          label: <span><BgColorsOutlined />主题设置</span>,
          children: (
            <TabCard>
              {/* 预览模式提示 */}
              {previewMode && (
                <Alert
                  message="预览模式已开启"
                  description="您正在实时预览主题效果，记得保存设置以应用到客户端界面"
                  type="info"
                  showIcon
                  closable
                  onClose={() => setPreviewMode(false)}
                  style={{ marginBottom: 24 }}
                />
              )}

              <Form
                form={themeForm}
                layout="vertical"
                onFinish={saveThemeSettings}
              >
                {/* 婚礼主题预设 */}
                <SettingSection>
                  <div className="section-title">
                    <HeartOutlined />
                    婚礼主题预设
                  </div>
                  <div className="section-description">
                    选择专为婚礼服务设计的精美主题配色方案，营造浪漫优雅的视觉体验
                  </div>

                  <ThemePresetGrid>
                    {WEDDING_THEME_PRESETS.map((preset) => (
                      <ThemePresetCard
                        key={preset.id}
                        selected={selectedPreset === preset.id}
                        onClick={() => handlePresetSelect(preset.id)}
                      >
                        {selectedPreset === preset.id && (
                          <div className="selected-badge">
                            <CheckCircleOutlined />
                          </div>
                        )}
                        <div className="preset-header">
                          <div className="preset-icon">{preset.icon}</div>
                          <div className="preset-name">{preset.name}</div>
                        </div>
                        <div className="preset-description">{preset.description}</div>
                        <div className="color-palette">
                          <div
                            className="color-swatch"
                            style={{ backgroundColor: preset.colors.primary }}
                            title="主色调"
                          />
                          <div
                            className="color-swatch"
                            style={{ backgroundColor: preset.colors.secondary }}
                            title="辅助色"
                          />
                          <div
                            className="color-swatch"
                            style={{ backgroundColor: preset.colors.accent }}
                            title="强调色"
                          />
                          <div
                            className="color-swatch"
                            style={{ backgroundColor: preset.colors.background }}
                            title="背景色"
                          />
                        </div>
                      </ThemePresetCard>
                    ))}
                  </ThemePresetGrid>
                </SettingSection>

                {/* 自定义颜色配置 */}
                <SettingSection>
                  <div className="section-title">
                    <BgColorsOutlined />
                    自定义颜色配置
                  </div>
                  <div className="section-description">
                    精细调整主题颜色，打造独特的品牌视觉效果
                  </div>

                  <ColorCustomizer>
                    <div className="customizer-title">主题色彩</div>
                    <Row gutter={[16, 16]}>
                      <Col span={12} md={8}>
                        <Form.Item label="主色调" name="primaryColor">
                          <ColorPicker
                            value={customColors.primary}
                            onChange={(color) => handleColorChange('primary', color)}
                            showText
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12} md={8}>
                        <Form.Item label="辅助色" name="secondaryColor">
                          <ColorPicker
                            value={customColors.secondary}
                            onChange={(color) => handleColorChange('secondary', color)}
                            showText
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12} md={8}>
                        <Form.Item label="强调色" name="accentColor">
                          <ColorPicker
                            value={customColors.accent}
                            onChange={(color) => handleColorChange('accent', color)}
                            showText
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12} md={8}>
                        <Form.Item label="背景色" name="backgroundColor">
                          <ColorPicker
                            value={customColors.background}
                            onChange={(color) => handleColorChange('background', color)}
                            showText
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12} md={8}>
                        <Form.Item label="文字色" name="textColor">
                          <ColorPicker
                            value={customColors.text}
                            onChange={(color) => handleColorChange('text', color)}
                            showText
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </ColorCustomizer>
                </SettingSection>

                {/* 实时预览 */}
                <SettingSection>
                  <div className="section-title">
                    <EyeOutlined />
                    实时预览
                  </div>
                  <div className="section-description">
                    开启预览模式，实时查看主题效果
                  </div>

                  <PreviewSection>
                    <div className="preview-title">
                      <EyeOutlined />
                      主题效果预览
                      <Tooltip title={previewMode ? "关闭预览模式" : "开启预览模式"}>
                        <Button
                          type={previewMode ? "primary" : "default"}
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={togglePreviewMode}
                          style={{ marginLeft: 'auto' }}
                        >
                          {previewMode ? '关闭预览' : '开启预览'}
                        </Button>
                      </Tooltip>
                    </div>

                    <div className="preview-content" style={{
                      backgroundColor: customColors.background,
                      color: customColors.text,
                      border: `2px solid ${customColors.secondary}`
                    }}>
                      <Title level={4} style={{ color: customColors.primary, margin: 0 }}>
                        完美婚礼，从这里开始
                      </Title>
                      <Text style={{ color: customColors.text, display: 'block', margin: '12px 0' }}>
                        专业的婚礼策划团队，为您打造独一无二的梦想婚礼
                      </Text>
                      <Button
                        type="primary"
                        style={{
                          backgroundColor: customColors.primary,
                          borderColor: customColors.primary,
                          color: customColors.background
                        }}
                      >
                        开始策划您的婚礼
                      </Button>
                      <div style={{
                        marginTop: 16,
                        padding: 12,
                        backgroundColor: customColors.secondary,
                        borderRadius: 8,
                        border: `1px solid ${customColors.accent}`
                      }}>
                        <Text style={{ color: customColors.accent, fontSize: 12 }}>
                          预览效果 • 当前主题：{selectedPreset ? WEDDING_THEME_PRESETS.find(p => p.id === selectedPreset)?.name : '自定义'}
                        </Text>
                      </div>
                    </div>
                  </PreviewSection>
                </SettingSection>

                {/* 高级设置 */}
                <SettingSection>
                  <div className="section-title">高级设置</div>
                  <div className="section-description">配置主题的高级选项和样式细节</div>

                  <Row gutter={16}>
                    <Col span={12} md={8}>
                      <Form.Item
                        name="borderRadius"
                        label="边框圆角 (px)"
                        initialValue={8}
                      >
                        <InputNumber min={0} max={20} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12} md={8}>
                      <Form.Item
                        name="fontSize"
                        label="字体大小 (px)"
                        initialValue={14}
                      >
                        <InputNumber min={12} max={18} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12} md={8}>
                      <Form.Item name="compactMode" valuePropName="checked">
                        <Space>
                          <Switch />
                          <span>紧凑模式</span>
                        </Space>
                      </Form.Item>
                    </Col>
                  </Row>
                </SettingSection>

                <SaveButtonGroup>
                  <Button onClick={() => {
                    setSelectedPreset('');
                    setCustomColors({
                      primary: '#D4A574',
                      secondary: '#F5E6D3',
                      accent: '#B8956A',
                      background: '#FEFCF9',
                      text: '#5D4E37'
                    });
                    themeForm.resetFields();
                  }}>
                    重置设置
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={loading}
                    size="large"
                  >
                    保存主题设置
                  </Button>
                </SaveButtonGroup>
              </Form>
            </TabCard>
          )
        }
      ]} />
    </SettingsContainer>
  );
};

export default SettingsPage;