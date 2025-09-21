import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Row,
  Col,
  message,
} from 'antd';
import {
  SaveOutlined,
  GlobalOutlined,
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
  };

  const handleUploadSuccess = (results: any[], type: 'logo' | 'favicon' | 'homepageBackground') => {
    if (results && results.length > 0) {
      const fileUrl = results[0].url;

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
      </SettingSection>

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

      <SettingSection>
        <div className="section-title">网站图标</div>
        <div className="section-description">上传网站Logo和图标</div>
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