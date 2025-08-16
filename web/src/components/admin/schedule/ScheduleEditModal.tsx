import React, { useEffect } from 'react';
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
  onCancel: () => void;
  onSave: (values: any) => void;
  onDelete: (scheduleId: string) => void;
  onWeddingDateChange: (date: Dayjs | null) => void;
  onWeddingTimeChange: (e: RadioChangeEvent) => void;
  onSearchAvailableHosts: () => void;
  onCheckScheduleConflict?: (date: Dayjs | null, time: string) => void;
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
  onCancel,
  onSave,
  onDelete,
  onWeddingDateChange,
  onWeddingTimeChange,
  onSearchAvailableHosts,
  onCheckScheduleConflict}) => {
  const options = [
    { label: '午宴', value: 'lunch' },
    { label: '晚宴', value: 'dinner' },
  ];

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
            onClick={() => form.submit()}
          >
            {editingSchedule ? '更新' : '添加'}
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSave}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="档期标题"
                rules={[{ required: true, message: '请输入档期标题' }]}
              >
                <Input placeholder="请输入档期标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="eventType"
                label="活动类型"
                rules={[{ required: false, message: '请选择活动类型' }]}
              >
                <Select placeholder="请选择活动类型" defaultValue={'wedding'}>
                  <Option value="wedding">婚礼</Option>
                  <Option value="engagement">订婚</Option>
                  <Option value="anniversary">纪念日</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customerName"
                label="客户姓名"
                rules={[{ required: false, message: '请输入客户姓名' }]}
              >
                <Input placeholder="请输入客户姓名" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="customerPhone"
                label="客户电话"
                rules={[
                  { required: false, message: '请输入客户电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                ]}
              >
                <Input placeholder="请输入客户电话" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="weddingDate"
                label="婚礼日期"
                rules={[{ required: true, message: '请选择婚礼日期' }]}
                validateStatus={!isAdmin && conflictSchedules.length > 0 ? 'error' : ''}
                help={!isAdmin && conflictSchedules.length > 0 ? '该日期时间段已有档期安排，存在冲突' : ''}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择婚礼日期"
                  onChange={onWeddingDateChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="weddingTime"
                label="婚礼时间"
                rules={[{ required: true, message: '请选择婚礼时间' }]}
                validateStatus={!isAdmin && conflictSchedules.length > 0 ? 'error' : ''}
                help={!isAdmin && conflictSchedules.length > 0 ? `冲突档期：${conflictSchedules.map(s => s.title).join('、')}` : ''}
              >
                <Radio.Group
                  options={options}
                  onChange={onWeddingTimeChange}
                  value={selectedWeddingTime}
                  defaultValue={'lunch'}
                  optionType="button"
                  buttonStyle="solid"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 主持人字段 - 管理员可选择，非管理员自动设置为当前用户 */}
          {isAdmin ? (
            <Row gutter={16}>
              <Col span={18}>
                <Form.Item
                  name="hostId"
                  label="主持人"
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
                  >
                    {(availableHosts || []).map(host => (
                      <Option key={host.userId} value={host.userId}>
                        {host.user?.realName || host.user?.nickname}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          ) : (
            // 非管理员用户的隐藏hostId字段
            <Form.Item
              name="hostId"
              label="主持人"
              rules={[{ required: true, message: '主持人ID不能为空' }]}
            >
              <Input value={user?.id} name='hostId' />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="location"
                label="婚礼地点"
              >
                <Input placeholder="请输入婚礼地点" prefix={<EnvironmentOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="档期状态"
                rules={[{ required: true, message: '请选择档期状态' }]}
              >
                <Select placeholder="请选择档期状态">
                  <Option value={ScheduleStatus.AVAILABLE}>可预约</Option>
                  <Option value={ScheduleStatus.BOOKED}>已预订</Option>
                  <Option value={ScheduleStatus.CONFIRMED}>已确认</Option>
                  <Option value={ScheduleStatus.COMPLETED}>已完成</Option>
                  <Option value={ScheduleStatus.CANCELLED}>已取消</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="price"
                label="服务费用"
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
                label="是否已结清"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="venueName"
                label="场地名称"
              >
                <Input placeholder="请输入场地名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="venueAddress"
                label="场地地址"
              >
                <Input placeholder="请输入场地地址" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="备注"
          >
            <TextArea
              rows={3}
              placeholder="请输入备注信息"
            />
          </Form.Item>

          <Form.Item
            name="requirements"
            label="特殊要求"
          >
            <TextArea
              rows={2}
              placeholder="请输入特殊要求"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ScheduleEditModal;