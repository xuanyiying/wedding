import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Space, Tag, Row, Col, InputNumber, Select } from 'antd';
import AvatarUploader from '../../AvatarUploader';
import styled from 'styled-components';
import type { ProfileData } from './ProfileSection';
import { PRICE_RANGE_OPTIONS } from '../../../constants';

const { TextArea } = Input;

interface ProfileEditFormProps {
  initialValues?: Partial<ProfileData>;
  onSubmit: (values: any) => void;
  onCancel: () => void;
  loading?: boolean;
  onUpload?: (file: File) => Promise<string>;
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
`;

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initialValues?.avatarUrl);
  const [uploading] = useState(false);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);

      if (initialValues.avatarUrl) {
        setAvatarUrl(initialValues.avatarUrl);
      }

      if (initialValues.specialties) {
        setSpecialties(initialValues.specialties);
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
      };
      onSubmit(submitData);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };



  const addSpecialty = () => {
    if (specialtyInput && !specialties.includes(specialtyInput)) {
      setSpecialties([...specialties, specialtyInput]);
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (specialtyToRemove: string) => {
    setSpecialties(specialties.filter(specialty => specialty !== specialtyToRemove));
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
            onChange={(url) => setAvatarUrl(url)}
            size={120}
            shape="square"
            disabled={uploading}
          />
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="realName"
              label="真实姓名"
              rules={[
                { max: 50, message: '姓名不能超过50个字符' },
              ]}
            >
              <Input
                placeholder="请输入真实姓名"
                maxLength={50}
              />
            </Form.Item>
          </Col>
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
              name="nickname"
              label="昵称"
              rules={[
                { max: 50, message: '昵称不能超过50个字符' },
              ]}
            >
              <Input
                placeholder="请输入昵称"
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
              name="location"
              label="所在地区"
            >
              <Input
                placeholder="请输入所在地区"
                maxLength={100}
              />
            </Form.Item>
          </Col>

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

        <Form.Item
          name="website"
          label="个人网站"
          rules={[
            { type: 'url', message: '请输入正确的网址格式' },
          ]}
        >
          <Input
            placeholder="请输入个人网站地址"
            maxLength={200}
          />
        </Form.Item>
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

        <Form.Item
          label="个人标签"
        >
          <div className="specialty-tags">
            <Space wrap>
              {specialties.map((specialty) => (
                <Tag
                  key={specialty}
                  closable
                  onClose={() => removeSpecialty(specialty)}
                  className="specialty-tag"
                >
                  {specialty}
                </Tag>
              ))}
            </Space>
          </div>

          <Space.Compact style={{ width: '100%' }} className="specialty-input">
            <Input
              placeholder="输入个人特长"
              value={specialtyInput}
              onChange={(e) => setSpecialtyInput(e.target.value)}
              onPressEnter={addSpecialty}
              maxLength={30}
            />
            <Button
              type="primary"
              onClick={addSpecialty}
              disabled={!specialtyInput || specialties.includes(specialtyInput)}
            >
              添加
            </Button>
          </Space.Compact>
        </Form.Item>

        <div className="social-section">
          <div className="section-title">社交媒体</div>

          <Row gutter={16}>
            <Col xs={24} sm={6}>
              <Form.Item
                name={['socialMedia', 'wechat']}
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
                name={['socialMedia', 'weibo']}
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
                name={['socialMedia', 'xiaohongshu']}
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
                name={['socialMedia', 'douyin']}
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