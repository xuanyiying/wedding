import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Space, Row, Col, InputNumber, Select } from 'antd';
import AvatarUploader from '../../AvatarUploader';
import styled from 'styled-components';
import type { ProfileData } from './ProfileSection';
import { PRICE_RANGE_OPTIONS } from '../../../constants';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface ProfileEditFormProps {
  initialValues?: Partial<ProfileData>;
  onSubmit: (values: Partial<ProfileData>) => void;
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
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .toggle-button {
      margin-left: 16px;
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
      if (initialValues.hideSocialLinks !== undefined) {
        setHideSocialLinks(initialValues.hideSocialLinks as boolean);
      }
    }
  }, [initialValues, form]);



  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        ...values,
        avatarUrl,
        specialties,
        hideSocialLinks, // 确保hideSocialLinks被正确提交
      };
      console.log('提交数据:', { hideSocialLinks, submitData }); // 调试日志
      onSubmit(submitData);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const toggleSocialLinksVisibility = () => {
    const newHideState = !hideSocialLinks;
    setHideSocialLinks(newHideState);
    form.setFieldsValue({ hideSocialLinks: newHideState });
    console.log('切换社交媒体显示状态 - 新状态:', newHideState);
  };

  return (
    <FormContainer>
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        autoComplete="off"
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

        {/* 社交媒体部分 - 始终显示按钮，根据hideSocialLinks状态显示/隐藏内容 */}
        <div className="social-section">
          <div className="section-title">
            社交媒体
            <Button
              type="text"
              size="small"
              icon={hideSocialLinks ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={toggleSocialLinksVisibility}
              className="toggle-button"
              title={hideSocialLinks ? '显示社交媒体' : '隐藏社交媒体'}
            />
          </div>

          {/* 隐藏的表单字段，用于存储hideSocialLinks状态 */}
          <Form.Item name="hideSocialLinks" style={{ display: 'none' }}>
            <Input type="hidden" />
          </Form.Item>

          {!hideSocialLinks && (
              <Row gutter={16}>
                <Col xs={24} sm={6}>
                  <Form.Item
                    name={['socialLinks', 'wechat', 'value']}
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
                    name={['socialLinks', 'weibo', 'value']}
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
                    name={['socialLinks', 'xiaohongshu', 'value']}
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
                    name={['socialLinks', 'douyin', 'value']}
                    label="抖音"
                  >
                    <Input
                      placeholder="请输入抖音账号"
                      maxLength={50}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}
        </div>

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