import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Space, Row, Col, InputNumber } from 'antd';
import AvatarUploader from '../../AvatarUploader';
import styled from 'styled-components';
import type { User } from "../../../types";

const { TextArea } = Input;

interface ProfileEditFormProps {
  initialValues?: Partial<User>;
  onSubmit: (values: Partial<User>) => void;
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

    .avatar-upload {
      text-align: center;
      margin-bottom: 24px;

      .ant-upload {
        display: inline-block;
      }

    }
  `
;

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

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);

      if (initialValues.avatarUrl) {
        onAvatarChange(initialValues.avatarUrl);
      }

    }
  }, [initialValues, form]);



  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        ...values,
        avatarUrl,
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
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="minPrice"
              label="市场价格"
            >
              <InputNumber
                placeholder="请输入市场价格"
                min={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="maxPrice"
              label="服务价格"
            >
              <InputNumber
                placeholder="请输入服务价格"
                min={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

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