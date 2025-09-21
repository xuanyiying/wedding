import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Switch,
  Row,
  Col,
  Card,
  message,
} from 'antd';
import {
  SaveOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import { useSettings } from '../../../contexts/SettingsContext';

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

const HomepageConfig: React.FC = () => {
  const [form] = Form.useForm();
  const { state, updateHomepageSettings, saveHomepageSettings } = useSettings();

  // 初始化表单数据
  useEffect(() => {
    if (state.homepage) {
      const homepageData = state.homepage;

      const sectionsData = {
        hero: {
          title: homepageData.hero?.title || '',
          subtitle: homepageData.hero?.subtitle || '',
          backgroundImage: homepageData.hero?.backgroundImage || '',
          ctaText: homepageData.hero?.ctaText || '',
          ctaLink: homepageData.hero?.ctaLink || '',
          visible: homepageData.hero?.visible || false,
        },
        about: {
          title: homepageData.about?.title || '',
          content: homepageData.about?.content || '',
          image: homepageData.about?.image || '',
          visible: homepageData.about?.visible || false,
        },
        services: {
          title: homepageData.services?.title || '',
          visible: homepageData.services?.visible || false,
        },
        gallery: {
          title: homepageData.gallery?.title || '',
          visible: homepageData.gallery?.visible || false,
        },
        testimonials: {
          title: homepageData.testimonials?.title || '',
          visible: homepageData.testimonials?.visible || false,
        },
        contact: {
          title: homepageData.contact?.title || '',
          subtitle: homepageData.contact?.subtitle || '',
          email: homepageData.contact?.email || '',
          phone: homepageData.contact?.phone || '',
          address: homepageData.contact?.address || '',
          wechat: homepageData.contact?.wechat || '',
          douyin: homepageData.contact?.douyin || '',
          visible: homepageData.contact?.visible || false,
        }
      };
      form.setFieldsValue(sectionsData);
    }
  }, [state.homepage, form]);

  // 保存首页配置
  const handleSave = async (values: any) => {
    try {
      console.log('📝 表单提交的值:', values);
      console.log('📝 当前首页设置状态:', state.homepage);

      // 构建完整的首页设置数据结构
      const homepageData = {
        hero: {
          ...state.homepage.hero,
          title: values.hero?.title || '',
          subtitle: values.hero?.subtitle || '',
          backgroundImage: values.hero?.backgroundImage || state.homepage.hero?.backgroundImage || '',
          ctaText: values.hero?.ctaText || state.homepage.hero?.ctaText || '',
          ctaLink: values.hero?.ctaLink || state.homepage.hero?.ctaLink || '',
          visible: values.hero?.visible || false,
        },
        about: {
          ...state.homepage.about,
          title: values.about?.title || '',
          content: values.about?.content || '',
          image: values.about?.image || state.homepage.about?.image || '',
          visible: values.about?.visible || false,
        },
        services: {
          ...state.homepage.services,
          title: values.services?.title || '',
          visible: values.services?.visible || false,
          items: state.homepage.services?.items || [],
        },
        gallery: {
          ...state.homepage.gallery,
          title: values.gallery?.title || '',
          visible: values.gallery?.visible || false,
          images: state.homepage.gallery?.images || [],
        },
        testimonials: {
          ...state.homepage.testimonials,
          title: values.testimonials?.title || '',
          visible: values.testimonials?.visible || false,
          items: state.homepage.testimonials?.items || [],
        },
        contact: {
          ...state.homepage.contact,
          title: values.contact?.title || '',
          subtitle: values.contact?.subtitle || '',
          email: values.contact?.email || '',
          phone: values.contact?.phone || '',
          address: values.contact?.address || '',
          wechat: values.contact?.wechat || '',
          douyin: values.contact?.douyin || '',
          backgroundImage: state.homepage.contact?.backgroundImage || '',
          visible: values.contact?.visible || false,
        }
      };

      console.log('📝 构建的首页设置数据:', homepageData);

      // 先更新本地状态
      updateHomepageSettings(homepageData);

      // 保存到服务器
      const success = await saveHomepageSettings();

      if (!success) {
        throw new Error('首页设置保存失败');
      }

      message.success('首页配置保存成功');
    } catch (error) {
      console.error('保存首页配置失败:', error);
      message.error('保存首页配置失败，请重试');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
    >
      <SettingSection>
        <div className="section-title">
          <HomeOutlined />
          首页配置
        </div>
        <div className="section-description">配置首页的内容和显示</div>

        <Row gutter={[16, 16]}>
          {[
            { key: 'hero', title: '首页横幅', hasSubtitle: true, hasBackgroundImage: true },
            { key: 'about', title: '关于我们', hasContent: true },
            { key: 'services', title: '服务项目' },
            { key: 'gallery', title: '作品展示' },
            { key: 'testimonials', title: '客户评价' },
            { key: 'contact', title: '联系我们', hasContactInfo: true }
          ].map(section => (
            <Col xs={24} sm={24} md={12} lg={12} key={section.key}>
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

                {section.hasContent && (
                  <Form.Item
                    name={[section.key, 'content']}
                    label="内容"
                  >
                    <Input.TextArea placeholder="请输入内容" rows={3} />
                  </Form.Item>
                )}

                {section.hasContactInfo && (
                  <>
                    <Form.Item
                      name={[section.key, 'subtitle']}
                      label="副标题"
                    >
                      <Input placeholder="请输入副标题" />
                    </Form.Item>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item
                          name={[section.key, 'email']}
                          label="邮箱"
                        >
                          <Input placeholder="联系邮箱" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name={[section.key, 'phone']}
                          label="电话"
                        >
                          <Input placeholder="联系电话" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      name={[section.key, 'address']}
                      label="地址"
                    >
                      <Input placeholder="联系地址" />
                    </Form.Item>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item
                          name={[section.key, 'wechat']}
                          label="微信"
                        >
                          <Input placeholder="微信号" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name={[section.key, 'douyin']}
                          label="抖音"
                        >
                          <Input placeholder="抖音号" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )}

                <Form.Item
                  name={[section.key, 'visible']}
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
        <Button
          type="primary"
          htmlType="submit"
          loading={state.loading}
          icon={<SaveOutlined />}
        >
          保存
        </Button>
      </Form.Item>
    </Form>
  );
};

export default HomepageConfig;