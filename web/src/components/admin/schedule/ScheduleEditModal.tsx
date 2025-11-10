import React, { useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  DatePicker,
  Radio,
  Switch,
  InputNumber,
  type RadioChangeEvent
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { ScheduleStatus, type Schedule, type TeamMember, type User } from '../../../types';
import type { Dayjs } from 'dayjs';
import { ValidationDisplayHelper, type ValidationError } from '../../../utils/validation';


const { Option } = Select;
const { TextArea } = Input;

interface ScheduleEditModalProps {
  visible: boolean;
  editingSchedule: Schedule | null;
  form: any;
  user: User | null;
  isAdmin: boolean;
  weddingDate: Dayjs | null;
  selectedWeddingTime: string;
  availableHosts: TeamMember[];
  searchLoading: boolean;
  searchModalVisible: boolean;
  conflictSchedules?: Schedule[];
  validationErrors?: ValidationError[]; // 服务端验证错误
  onCancel: () => void;
  onSave: (values: any) => void;
  onDelete: (scheduleId: string) => void;
  onWeddingDateChange: (date: Dayjs | null) => void;
  onWeddingTimeChange: (e: RadioChangeEvent) => void;
  onSearchAvailableHosts: () => void;
  onCheckScheduleConflict?: (date: Dayjs | null, time: string) => void;
  onHostChange?: (hostId: string) => void; // 添加主持人变化处理
  setSearchModalVisible: (visible: boolean) => void;
}

const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({
  visible,
  editingSchedule,
  form,
  user,
  isAdmin,
  weddingDate,
  selectedWeddingTime,
  availableHosts,
  conflictSchedules = [],
  validationErrors = [], // 服务端验证错误
  onCancel,
  onSave,
  onDelete,
  onWeddingDateChange,
  onWeddingTimeChange,
  onSearchAvailableHosts,
  onCheckScheduleConflict,
  onHostChange // 添加主持人变化处理
}) => {
  const options = [
    { label: '午宴', value: 'lunch' },
    { label: '晚宴', value: 'dinner' },
  ];

  // 获取字段验证状态
  const getFieldValidateStatus = (fieldName: string) => {
    return ValidationDisplayHelper.hasFieldError(validationErrors, fieldName) ? 'error' : '';
  };

  // 获取字段错误信息
  const getFieldHelp = (fieldName: string) => {
    return ValidationDisplayHelper.getFieldError(validationErrors, fieldName) || '';
  };

  // 简化的保存函数 - 直接调用父组件的保存方法
  const handleSave = useCallback((values: any) => {
    // 确保weddingTime有默认值
    if (!values.weddingTime) {
      values.weddingTime = 'lunch';
    }
    // 调用父组件的保存方法，由父组件处理服务端验证
    onSave(values);
  }, [onSave]);

  // 当非管理员用户添加新档期时，自动设置hostId为当前用户ID
  useEffect(() => {
    if (!isAdmin && !editingSchedule && user?.id) {
      form.setFieldsValue({ hostId: user.id });
    }
  }, [isAdmin, editingSchedule, user?.id, form]);

  // 管理员模式：当婚礼日期或时间变化时自动查询可用主持人
  useEffect(() => {
    if (isAdmin && weddingDate && selectedWeddingTime && !editingSchedule) {
      onSearchAvailableHosts();
    }
  }, [isAdmin, weddingDate, selectedWeddingTime, editingSchedule, onSearchAvailableHosts]);

  // 非管理员模式：当婚礼日期或时间变化时检查档期冲突
  useEffect(() => {
    if (!isAdmin && weddingDate && selectedWeddingTime && onCheckScheduleConflict) {
      onCheckScheduleConflict(weddingDate, selectedWeddingTime);
    }
  }, [isAdmin, weddingDate, selectedWeddingTime, onCheckScheduleConflict]);

  return (
    <>
      {/* 主编辑模态框 */}
      <Modal
        title={editingSchedule ? '编辑档期' : '添加档期'}
        open={visible}
        onCancel={onCancel}
        width={800}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            取消
          </Button>,
          editingSchedule && (
            <Button
              key="delete"
              danger
              onClick={() => onDelete(editingSchedule.id)}
            >
              删除
            </Button>
          ),
          <Button
            key="submit"
            type="primary"
            onClick={() => {
              form
                .validateFields()
                .then((values: any) => {
                  handleSave(values);
                })
                .catch((info: any) => {
                  console.log("验证失败:", info);
                });
            }}
          >
            {editingSchedule ? '更新' : '添加'}
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="weddingDate"
                label="婚礼日期"
                validateStatus={
                  (!isAdmin && conflictSchedules.length > 0) ? 'error' : 
                  getFieldValidateStatus('weddingDate')
                }
                help={
                  (!isAdmin && conflictSchedules.length > 0) ? 
                  <span style={{ color: '#ff4d4f' }}>档期冲突</span> : 
                  getFieldHelp('weddingDate')
                }
                rules={[{ required: true, message: '请选择婚礼日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择婚礼日期"
                  onChange={(date) => {
                    onWeddingDateChange(date);
                    if (!isAdmin && onCheckScheduleConflict) {
                      onCheckScheduleConflict(date, selectedWeddingTime);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="weddingTime"
                label="婚礼时间"
                rules={[{ required: false, message: '请选择婚礼时间' }]}
                validateStatus={
                  (!isAdmin && conflictSchedules.length > 0) ? 'error' : 
                  getFieldValidateStatus('weddingTime')
                }
                help={
                  (!isAdmin && conflictSchedules.length > 0) ? 
                  <span style={{ color: '#ff4d4f' }}>档期冲突</span> :
                  getFieldHelp('weddingTime')
                }
              >
                <Radio.Group
                  options={options}
                  onChange={(e) => {
                    onWeddingTimeChange(e);
                    if (!isAdmin && onCheckScheduleConflict) {
                      onCheckScheduleConflict(weddingDate, e.target.value);
                    }
                  }}
                  value={selectedWeddingTime}
                  defaultValue={'lunch'}
                  optionType="button"
                  buttonStyle="solid"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 主持人和档期状态放在一行 */}
          {isAdmin ? (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="hostId"
                  label="主持人"
                  validateStatus={
                    (isAdmin && conflictSchedules.length > 0) ? 'error' : 
                    getFieldValidateStatus('hostId')
                  }
                  help={
                    (isAdmin && conflictSchedules.length > 0) ? 
                    <span style={{ color: '#ff4d4f' }}>档期冲突：{conflictSchedules.map(s => s.user?.realName || s.user?.nickname || s.title).join('、')}</span> :
                    getFieldHelp('hostId')
                  }
                  rules={[{ required: true, message: '请选择主持人' }]}
                >
                  <Select
                    placeholder="请选择主持人"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)
                        ?.toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    onChange={(value) => {
                      // 管理员选择主持人后触发冲突检查
                      if (onHostChange) {
                        onHostChange(value);
                      }
                    }}
                  >
                    {(availableHosts || []).map(host => (
                      <Option key={host.userId} value={host.userId}>
                        {host.user?.realName || host.user?.nickname}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="档期状态"
                  validateStatus={getFieldValidateStatus('status')}
                  help={getFieldHelp('status')}
                  rules={[{ required: true, message: '请选择档期状态' }]}
                >
                  <Select 
                    placeholder="请选择档期状态"
                  >
                    <Option value={ScheduleStatus.RESERVE}>预留</Option>
                    <Option value={ScheduleStatus.BOOKED}>已预订</Option>
                    <Option value={ScheduleStatus.CANCELLED}>已取消</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Row gutter={16}>
              {/* 非管理员用户的隐藏hostId字段 */}
              <Form.Item
                name="hostId"
                label="主持人"
                rules={[{ required: true, message: '主持人ID不能为空' }]}
                style={{ display: 'none' }}
              >
                <Input value={user?.id} name='hostId' />
              </Form.Item>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="档期状态"
                  validateStatus={getFieldValidateStatus('status')}
                  help={getFieldHelp('status')}
                  rules={[{ required: true, message: '请选择档期状态' }]}
                >
                  <Select 
                    placeholder="请选择档期状态"
                  >
                    <Option value={ScheduleStatus.RESERVE}>预留</Option>
                    <Option value={ScheduleStatus.BOOKED}>已预订</Option>
                    <Option value={ScheduleStatus.CANCELLED}>已取消</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}
          <Form.Item
            name="location"
            label="婚礼酒店"
            validateStatus={getFieldValidateStatus('location')}
            help={getFieldHelp('location')}
          >
            <Input 
              placeholder="请输入婚礼酒店" 
              prefix={<EnvironmentOutlined />}
            />
          </Form.Item>


          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customerName"
                label="客户姓名"
                validateStatus={getFieldValidateStatus('customerName')}
                help={getFieldHelp('customerName')}
                rules={[{ required: false, message: '请输入客户姓名' }]}
              >
                <Input 
                  placeholder="请输入客户姓名" 
                  prefix={<UserOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customerPhone"
                label="客户电话"
                validateStatus={getFieldValidateStatus('customerPhone')}
                help={getFieldHelp('customerPhone')}
                rules={[
                  { required: false, message: '请输入客户电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                ]}
              >
                <Input 
                  placeholder="请输入客户电话" 
                  prefix={<PhoneOutlined />}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="notes"
            label="备注"
            validateStatus={getFieldValidateStatus('notes')}
            help={getFieldHelp('notes')}
          >
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
            />
          </Form.Item>



          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="price"
                label="服务费用"
                validateStatus={getFieldValidateStatus('price')}
                help={getFieldHelp('price')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入服务费用"
                  min={0}
                  precision={2}
                  formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="deposit"
                label="定金"
                validateStatus={getFieldValidateStatus('deposit')}
                help={getFieldHelp('deposit')}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入定金"
                  min={0}
                  precision={2}
                  formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="isPaid"
                label="已结清"
                valuePropName="checked"
                validateStatus={getFieldValidateStatus('isPaid')}
                help={getFieldHelp('isPaid')}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

        </Form>
      </Modal>
    </>
  );
};

export default ScheduleEditModal;