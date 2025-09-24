import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Switch,
  Row,
  Col,
  Card,
  App,
} from 'antd';
import {
  SaveOutlined,
  HomeOutlined,
  WechatOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import { useAppSettings } from '../../../hooks/useAppSettings';
import { settingsService } from '../../../services';
import SimpleUploader from '../../common/SimpleUploader';

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

const HomepageSettings: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { settings, loading, refetch } = useAppSettings();
  const [backgroundImage, setBackgroundImage] = React.useState('');
  // 初始化表单数据
  useEffect(() => {
    if (settings?.homepage) {
      const homepageData = settings.homepage;

      const sectionsData = {
        hero: {
          title: homepageData.hero?.title || '',
          subtitle: homepageData.hero?.subtitle || '',
          description: homepageData.hero?.description || '',
          backgroundImage: homepageData.hero?.backgroundImage || '',
          visible: homepageData.hero?.visible || false,
        },
        team: {
          title: homepageData.team?.title || '',
          subtitle: homepageData.team?.subtitle || '',
          description: homepageData.team?.description || '',
          visible: homepageData.team?.visible || false,
        },
        teamShowcase: {
          title: homepageData.teamShowcase?.title || '',
          subtitle: homepageData.teamShowcase?.subtitle || '',
          description: homepageData.teamShowcase?.description || '',
          visible: homepageData.teamShowcase?.visible || false,
        },
        portfolio: {
          title: homepageData.portfolio?.title || '',
          subtitle: homepageData.portfolio?.subtitle || '',
          description: homepageData.portfolio?.description || '',
          visible: homepageData.portfolio?.visible || false,
        },
        schedule: {
          title: homepageData.schedule?.title || '',
          subtitle: homepageData.schedule?.subtitle || '',
          description: homepageData.schedule?.description || '',
          visible: homepageData.schedule?.visible || false,
        },
        contact: {
          title: homepageData.contact?.title || '',
          subtitle: homepageData.contact?.subtitle || '',
          description: homepageData.contact?.description || '',
          email: homepageData.contact?.email || '',
          phone: homepageData.contact?.phone || '',
          address: homepageData.contact?.address || '',
          wechat: homepageData.contact?.wechat || '',
          xiaohongshu: homepageData.contact?.xiaohongshu || '',
          douyin: homepageData.contact?.douyin || '',
          visible: homepageData.contact?.visible || false,
        }
      };
      form.setFieldsValue(sectionsData);
      // 同步设置背景图片状态
      setBackgroundImage(homepageData.hero?.backgroundImage || '');
    }
  }, [settings, form]);

  const handleUploadSuccess = (result: any) => {
    console.log('📝 上传结果:', result);
    if (result && result.data) {
      const fileUrl = result.data.fileUrl;
      // 正确设置嵌套的表单字段
      form.setFieldsValue({
        hero: {
          ...form.getFieldValue('hero'),
          backgroundImage: fileUrl
        }
      });
      setBackgroundImage(fileUrl);
      message.success('上传成功');
    }
  };

  const handleUploadError = (error: Error) => {
    message.error(`上传失败: ${error.message}`);
  };
  // 保存首页配置
  const handleSave = async (values: any) => {
    try {
      console.log('📝 表单提交的值:', values);
      console.log('📝 当前首页设置状态:', settings?.homepage);

      // 构建完整的首页设置数据结构
      const homepageData = {
        hero: {
          title: values.hero?.title || '',
          subtitle: values.hero?.subtitle || '',
          description: values.hero?.description || '',
          backgroundImage: values.hero?.backgroundImage
            || settings?.homepage?.hero?.backgroundImage
            || backgroundImage,
          visible: values.hero?.visible || false,
        },
        team: {
          title: values.team?.title || '',
          subtitle: values.team?.subtitle || '',
          description: values.team?.description || '',
          visible: values.team?.visible || false,
        },
        teamShowcase: {
          title: values.teamShowcase?.title || '',
          subtitle: values.teamShowcase?.subtitle || '',
          description: values.teamShowcase?.description || '',
          visible: values.teamShowcase?.visible || false,
        },
        portfolio: {
          title: values.portfolio?.title || '',
          subtitle: values.portfolio?.subtitle || '',
          description: values.portfolio?.description || '',
          visible: values.portfolio?.visible || false,
        },
        schedule: {
          title: values.schedule?.title || '',
          subtitle: values.schedule?.subtitle || '',
          description: values.schedule?.description || '',
          visible: values.schedule?.visible || false,
        },
        contact: {
          title: values.contact?.title || '',
          subtitle: values.contact?.subtitle || '',
          description: values.contact?.description || '',
          email: values.contact?.email || '',
          phone: values.contact?.phone || '',
          address: values.contact?.address || '',
          wechat: values.contact?.wechat || '',
          xiaohongshu: values.contact?.xiaohongshu || '',
          douyin: values.contact?.douyin || '',
          visible: values.contact?.visible || false,
        }
      };

      console.log('📝 构建的首页设置数据:', homepageData);

      // 调用API保存首页设置
      await settingsService.updateHomepageSettings(homepageData);
      console.log('✅ 首页设置保存成功');

      // 重新获取设置以更新状态
      await refetch();

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
          {/* 首页横幅 */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card title="首页横幅" style={{ marginBottom: 16 }}>
              <Form.Item name={['hero', 'title']} label="标题">
                <Input placeholder="请输入首页横幅标题" />
              </Form.Item>
              <Form.Item name={['hero', 'subtitle']} label="副标题">
                <Input placeholder="请输入副标题" />
              </Form.Item>
              <Form.Item name={['hero', 'description']} label="描述">
                <TextArea placeholder="请输入描述" rows={3} />
              </Form.Item>
              <Form.Item name={['hero', 'backgroundImage']} label="背景图片">

                <SimpleUploader
                  fileType="image"
                  category="other"
                  maxFileSize={5 * 1024 * 1024} // 5MB
                  accept="image/*"
                  onUploadSuccess={(result) => handleUploadSuccess(result)}
                  onUploadError={handleUploadError}
                >
                  {(form.getFieldValue(['hero', 'backgroundImage']) || backgroundImage) ? (
                    <div style={{ position: 'relative', width: '100%', height: '150px' }}>
                      <img
                        src={form.getFieldValue(['hero', 'backgroundImage']) || backgroundImage}
                        alt="背景图片"
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
                      <div>点击或拖拽上传背景图片</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>建议尺寸：200x60px，格式：PNG/JPG，最大2MB</div>
                    </div>
                  )}
                </SimpleUploader>
              </Form.Item>
              <Form.Item name={['hero', 'visible']} label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>

          {/* 团队介绍 */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card title="团队介绍" style={{ marginBottom: 16 }}>
              <Form.Item name={['team', 'title']} label="标题">
                <Input placeholder="请输入团队介绍标题" />
              </Form.Item>
              <Form.Item name={['team', 'subtitle']} label="副标题">
                <Input placeholder="请输入副标题" />
              </Form.Item>
              <Form.Item name={['team', 'description']} label="描述">
                <TextArea placeholder="请输入描述" rows={3} />
              </Form.Item>
              <Form.Item name={['team', 'visible']} label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>

          {/* 团队风采 */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card title="团队风采" style={{ marginBottom: 16 }}>
              <Form.Item name={['teamShowcase', 'title']} label="标题">
                <Input placeholder="请输入团队风采标题" />
              </Form.Item>
              <Form.Item name={['teamShowcase', 'subtitle']} label="副标题">
                <Input placeholder="请输入副标题" />
              </Form.Item>
              <Form.Item name={['teamShowcase', 'description']} label="描述">
                <TextArea placeholder="请输入描述" rows={3} />
              </Form.Item>
              <Form.Item name={['teamShowcase', 'visible']} label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>

          {/* 精选作品 */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card title="精选作品" style={{ marginBottom: 16 }}>
              <Form.Item name={['portfolio', 'title']} label="标题">
                <Input placeholder="请输入精选作品标题" />
              </Form.Item>
              <Form.Item name={['portfolio', 'subtitle']} label="副标题">
                <Input placeholder="请输入副标题" />
              </Form.Item>
              <Form.Item name={['portfolio', 'description']} label="描述">
                <TextArea placeholder="请输入描述" rows={3} />
              </Form.Item>
              <Form.Item name={['portfolio', 'visible']} label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>

          {/* 档期查询 */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card title="档期查询" style={{ marginBottom: 16 }}>
              <Form.Item name={['schedule', 'title']} label="标题">
                <Input placeholder="请输入档期查询标题" />
              </Form.Item>
              <Form.Item name={['schedule', 'subtitle']} label="副标题">
                <Input placeholder="请输入副标题" />
              </Form.Item>
              <Form.Item name={['schedule', 'description']} label="描述">
                <TextArea placeholder="请输入描述" rows={3} />
              </Form.Item>
              <Form.Item name={['schedule', 'visible']} label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>

          {/* 联系我们 */}
          <Col xs={24} sm={24} md={12} lg={12}>
            <Card title="联系我们" style={{ marginBottom: 16 }}>
              <Form.Item name={['contact', 'title']} label="标题">
                <Input placeholder="请输入联系我们标题" />
              </Form.Item>
              <Form.Item name={['contact', 'subtitle']} label="副标题">
                <Input placeholder="请输入副标题" />
              </Form.Item>
              <Form.Item name={['contact', 'description']} label="描述">
                <TextArea placeholder="请输入描述" rows={3} />
              </Form.Item>
              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name={['contact', 'email']} label="邮箱">
                    <Input placeholder="联系邮箱" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['contact', 'phone']} label="电话">
                    <Input placeholder="联系电话" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name={['contact', 'address']} label="地址">
                <Input placeholder="联系地址" />
              </Form.Item>
              <Row gutter={8}>
                <Col span={8}>
                  <Form.Item name={['contact', 'wechat']} label="微信">
                    <Input placeholder="微信号" prefix={<WechatOutlined />} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={['contact', 'xiaohongshu']} label="小红书">
                    <Input placeholder="小红书号" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={['contact', 'douyin']} label="抖音">
                    <Input placeholder="抖音号" prefix={<VideoCameraOutlined />} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name={['contact', 'visible']} label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </SettingSection>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          icon={<SaveOutlined />}
        >
          保存
        </Button>
      </Form.Item>
    </Form>
  );
};

export default HomepageSettings;