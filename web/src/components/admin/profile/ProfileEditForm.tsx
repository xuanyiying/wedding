import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Space, Row, Col, InputNumber, Select, Switch } from 'antd';
import AvatarUploader from '../../AvatarUploader';
import styled from 'styled-components';
import type { ProfileData } from './ProfileSection';
import { PRICE_RANGE_OPTIONS } from '../../../constants';

const { TextArea } = Input;

interface ProfileEditFormProps {
  initialValues?: Partial<ProfileData> & { hideSocialSection?: boolean };
  onSubmit: (values: any) => void;
  onCancel: () => void;
  loading?: boolean;
  onUpload?: (file: File) => Promise<string>;
  avatarUrl?: string;
  onAvatarChange: (url: string) => void;
}

const FormContainer = styled.div`
  .ant-form-item-label > label {
    font-size: 16px;
  }

  .ant-input, .ant-select-selector {
    font-size: 16px;
  }

  .avatar-upload {
    text-align: center;
    margin-bottom: 24px;
    
    .ant-upload {
      display: inline-block;
    }
    
    .ant-upload-wrapper.ant-upload-picture-circle-wrapper {
      .ant-upload.ant-upload-select {
        border-radius: 50% !important;
      }
    }
    
    .upload-button {
      border: 2px dashed var(--admin-border-color);
      border-radius: 50%;
      background: var(--admin-bg-secondary);
      width: 120px;
      height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      
      &:hover {
        border-color: var(--admin-primary-color);
      }
    }
  }
  
  .specialty-input {
    margin-bottom: 12px;
  }
  
  .specialty-tags {
    margin-bottom: 16px;
    
    .specialty-tag {
      margin-bottom: 8px;
    }
  }
  
  .social-section {
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--admin-text-primary);
    }
  }
  
  // 根据hideSocialSection字段隐藏社交媒体部分
  .hide-social-section {
    .social-section {
      display: none;
    }
  }
`;

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
  avatarUrl,
  onAvatarChange,
}) => {
  const [form] = Form.useForm();
  const [uploading] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [hideSocialLinks, setHideSocialLinks] = useState(false);

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);

      if (initialValues.avatarUrl) {
        onAvatarChange(initialValues.avatarUrl);
      }

      if (initialValues.specialties) {
        setSpecialties(initialValues.specialties);
      }

      // 设置初始的隐藏状态
      if (initialValues.hideSocialSection !== undefined) {
        setHideSocialLinks(initialValues.hideSocialSection as boolean);
      }
    }
  }, [initialValues, form]);

  // 监听hideSocialSection字段的变化
  const onValuesChange = (changedValues: any) => {
    if (changedValues.hasOwnProperty('hideSocialSection')) {
      setHideSocialLinks(changedValues.hideSocialSection);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        ...values,
        avatarUrl,
        specialties,
      };
      onSubmit(submitData);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };
  return (
    <FormContainer>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        autoComplete="off"
        onValuesChange={onValuesChange}
      >
        <div className="avatar-upload">
          <AvatarUploader
            value={avatarUrl}
            onChange={onAvatarChange}
            size={120}
            shape="square"
            disabled={uploading}
            category="avatar"
          />
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="username"
              label="账号"
              rules={[
                { max: 50, message: '账号不能超过50个字符' },
              ]}
            >
              <Input
                placeholder="请输入账号"
                maxLength={50}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="realName"
              label="姓名"
              rules={[
                { max: 50, message: '姓名不能超过50个字符' },
              ]}
            >
              <Input
                placeholder="请输入姓名"
                maxLength={50}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="phone"
              label="电话"
              rules={[
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
              ]}
            >
              <Input
                placeholder="请输入电话号码"
                maxLength={11}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="bio"
          label="个人简介"
          rules={[
            { max: 500, message: '个人简介不能超过500个字符' },
          ]}
        >
          <TextArea
            placeholder="请输入个人简介"
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="specialties"
          label="个人特长"
        >
          <Input.TextArea
            placeholder="请输入个人特长"
            rows={3}
            maxLength={300}
            showCount
          />
        </Form.Item>

        <Row gutter={16}>

          <Col xs={24} sm={12}>
            <Form.Item
              name="experienceYears"
              label="从业年限"
            >
              <InputNumber
                placeholder="请输入从业年限"
                min={0}
                max={50}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 价格区间*/}
        <Form.Item
          name="priceRange"
          label="价格区间"
          rules={[
            { required: false, message: '请选择价格区间' },
          ]}
        >
          <Select
            mode="multiple"
            placeholder="请选择价格区间"
            options={PRICE_RANGE_OPTIONS}
            onChange={(values) => {
              form.setFieldsValue({ priceRange: values });
            }}
          />
        </Form.Item>

        {/* 控制整个社交媒体部分显示/隐藏的开关 */}
        <Form.Item
          name="hideSocialLinks"
          label="隐藏社交媒体部分"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        {/* 社交媒体部分，根据hideSocialLinks状态显示/隐藏 */}
        {!hideSocialLinks && (
          <div className="social-section">
            <div className="section-title">社交媒体</div>

            <Row gutter={16}>
              <Col xs={24} sm={6}>
                <Form.Item
                  name={['socialMedia', 'wechat', 'value']}
                  label="微信号"
                >
                  <Input
                    placeholder="请输入微信号"
                    maxLength={50}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={6}>
                <Form.Item
                  name={['socialMedia', 'weibo', 'value']}
                  label="微博"
                >
                  <Input
                    placeholder="请输入微博账号"
                    maxLength={50}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item
                  name={['socialMedia', 'xiaohongshu', 'value']}
                  label="小红书"
                >
                  <Input
                    placeholder="请输入小红书账号"
                    maxLength={50}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item
                  name={['socialMedia', 'douyin', 'value']}
                  label="抖音"
                >
                  <Input
                    placeholder="请输入抖音账号"
                    maxLength={50}
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        )}

        <Form.Item style={{ marginBottom: 0, marginTop: 32 }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading || uploading}
            >
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </FormContainer>
  );
};

export default ProfileEditForm;