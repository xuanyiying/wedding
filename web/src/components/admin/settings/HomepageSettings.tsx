import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Switch,
  Row,
  Col,
  Card,
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
  const { state, updateSettings, saveSettings } = useSettings();

  // 初始化表单数据
  useEffect(() => {
    if (state.settings?.homepageSections) {
      const sectionsData = {
        hero: {
          title: state.settings.homepageSections.hero?.title || '',
          subtitle: state.settings.homepageSections.hero?.description || '',
          enabled: state.settings.homepageSections.hero?.visible || false,
        },
        team: {
          title: state.settings.homepageSections.team?.title || '',
          description: state.settings.homepageSections.team?.description || '',
          visible: state.settings.homepageSections.team?.visible || false
        },
        teamShowcase: {
          title: state.settings.homepageSections.teamShowcase?.title || '',
          description: state.settings.homepageSections.teamShowcase?.description || '',
          visible: state.settings.homepageSections.teamShowcase?.visible || false
        },
        portfolio: {
          title: state.settings.homepageSections.portfolio?.title || '',
          description: state.settings.homepageSections.portfolio?.description || '',
          visible: state.settings.homepageSections.portfolio?.visible || false
        },
        schedule: {
          title: state.settings.homepageSections.schedule?.title || '',
          description: state.settings.homepageSections.schedule?.description || '',
          enabled: state.settings.homepageSections.schedule?.visible || false,
        },
        contact: {
          title: state.settings.homepageSections.contact?.title || '',
          description: state.settings.homepageSections.contact?.description || '',
          visible: state.settings.homepageSections.contact?.visible || false
        }
      };
      form.setFieldsValue(sectionsData);
    }
  }, [state.settings, form]);

  // 保存首页配置
  const handleSave = async (values: any) => {
    const homepageSectionsData = {
      homepageSections: {
        hero: {
          ...state.settings?.homepageSections?.hero,
          title: values.hero?.title,
          description: values.hero?.subtitle,
          visible: values.hero?.enabled,
        },
        team: {
          ...state.settings?.homepageSections?.team,
          title: values.team?.title,
          description: values.team?.description,
          visible: values.team?.visible,
        },
        teamShowcase: {
          ...state.settings?.homepageSections?.teamShowcase,
          title: values.teamShowcase?.title,
          description: values.teamShowcase?.description,
          visible: values.teamShowcase?.visible,
        },
        portfolio: {
          ...state.settings?.homepageSections?.portfolio,
          title: values.portfolio?.title,
          description: values.portfolio?.description,
          visible: values.portfolio?.visible,
        },
        schedule: {
          ...state.settings?.homepageSections?.schedule,
          title: values.schedule?.title,
          description: values.schedule?.description,
          visible: values.schedule?.enabled,
        },
        contact: {
          ...state.settings?.homepageSections?.contact,
          title: values.contact?.title,
          description: values.contact?.description,
          visible: values.contact?.visible,
        }
      }
    };

    updateSettings(homepageSectionsData);
    await saveSettings();
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
        
        <Row gutter={16}>
          {[
            { key: 'hero', title: '首页横幅', hasSubtitle: true, enabledField: 'enabled' },
            { key: 'team', title: '团队介绍', enabledField: 'visible' },
            { key: 'teamShowcase', title: '团队展示', enabledField: 'visible' },
            { key: 'portfolio', title: '作品展示', enabledField: 'visible' },
            { key: 'schedule', title: '档期安排', enabledField: 'enabled' },
            { key: 'contact', title: '联系我们', enabledField: 'visible' }
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
                {!section.hasSubtitle && (
                  <Form.Item
                    name={[section.key, 'description']}
                    label="描述"
                  >
                    <Input.TextArea placeholder="请输入描述" rows={2} />
                  </Form.Item>
                )}
                <Form.Item
                  name={[section.key, section.enabledField]}
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