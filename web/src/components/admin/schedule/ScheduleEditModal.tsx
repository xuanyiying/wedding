import React, { useState, useEffect, useCallback } from "react";
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
  message,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import {
  ScheduleStatus,
  type Schedule,
  type TeamMember,
  type User,
} from "../../../types";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { scheduleService } from "../../../services";

const { Option } = Select;
const { TextArea } = Input;

interface ScheduleEditModalProps {
  visible: boolean;
  schedule: Schedule | null;
  user: User | null;
  isAdmin: boolean;
  onCancel: () => void;
  onSave: (scheduleData: Record<string, unknown>) => Promise<void>;
  onDelete: (scheduleId: string) => Promise<void>;
}

const WEDDING_TIME_OPTIONS = [
  { label: "午宴", value: "lunch" },
  { label: "晚宴", value: "dinner" },
];

const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({
  visible,
  schedule,
  user,
  isAdmin,
  onCancel,
  onSave,
  onDelete,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 表单状态
  const [weddingDate, setWeddingDate] = useState<Dayjs | null>(null);
  const [weddingTime, setWeddingTime] = useState<"lunch" | "dinner">("lunch");
  const [selectedHostId, setSelectedHostId] = useState<string>("");

  // 冲突检查状态
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");

  // 可用主持人列表
  const [availableHosts, setAvailableHosts] = useState<TeamMember[]>([]);
  const [hostsLoading, setHostsLoading] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (visible) {
      if (schedule) {
        // 编辑模式
        const date = schedule.weddingDate ? dayjs(schedule.weddingDate) : null;
        setWeddingDate(date);
        setWeddingTime(schedule.weddingTime || "lunch");
        setSelectedHostId(schedule.userId || "");

        form.setFieldsValue({
          ...schedule,
          weddingDate: date,
          hostId: schedule.userId,
        });

        // 编辑模式下，如果有用户信息，将其添加到可用主持人列表
        if (schedule.user && isAdmin) {
          setAvailableHosts([
            {
              userId: schedule.userId,
              user: schedule.user,
            } as TeamMember,
          ]);
        }
      } else {
        // 新增模式
        setWeddingDate(null);
        setWeddingTime("lunch");
        setHasConflict(false);
        setConflictMessage("");

        const defaultHostId = isAdmin ? "" : user?.id || "";
        setSelectedHostId(defaultHostId);

        form.resetFields();
        form.setFieldsValue({
          weddingTime: "lunch",
          status: ScheduleStatus.RESERVE,
          hostId: defaultHostId,
        });
        setAvailableHosts([]);
      }
    }
  }, [visible, schedule, form, isAdmin, user?.id]);

  // 加载可用主持人
  const loadAvailableHosts = useCallback(async () => {
    if (!isAdmin || !weddingDate || !weddingTime) {
      return;
    }

    setHostsLoading(true);
    try {
      const response = await scheduleService.getAvailableHosts({
        teamId: "all",
        weddingDate: weddingDate.format("YYYY-MM-DD"),
        weddingTime: weddingTime,
      });
      const hosts = response.data?.hosts || [];

      // 如果是编辑模式且当前主持人不在列表中，添加进去
      if (schedule?.user && schedule.userId) {
        const hasCurrentHost = hosts.some((h) => h.userId === schedule.userId);
        if (!hasCurrentHost) {
          hosts.unshift({
            userId: schedule.userId,
            user: schedule.user,
          } as TeamMember);
        }
      }

      setAvailableHosts(hosts);
    } catch (error) {
      console.error("加载可用主持人失败:", error);
      // 如果加载失败但是编辑模式，至少保留当前主持人
      if (schedule?.user) {
        setAvailableHosts([
          {
            userId: schedule.userId,
            user: schedule.user,
          } as TeamMember,
        ]);
      } else {
        setAvailableHosts([]);
      }
    } finally {
      setHostsLoading(false);
    }
  }, [isAdmin, weddingDate, weddingTime, schedule]);

  // 检查档期冲突
  const checkConflict = useCallback(async () => {
    const hostId = selectedHostId || (isAdmin ? "" : user?.id || "");

    if (!weddingDate || !weddingTime || !hostId) {
      setHasConflict(false);
      setConflictMessage("");
      return;
    }

    try {
      const response = await scheduleService.checkScheduleConflict({
        userId: hostId,
        weddingDate: weddingDate.format("YYYY-MM-DD"),
        weddingTime: weddingTime,
        excludeId: schedule?.id, // 编辑时排除当前档期
      });

      if (response.data?.hasConflict) {
        setHasConflict(true);
        if (isAdmin) {
          const msg = response.data?.hostName
            ? `【${response.data?.hostName}】档期冲突`
            : `档期冲突`;
          setConflictMessage(msg);
        } else {
          const msg = response.data?.customerName
            ? `档期冲突，该时间已被【${response.data?.customerName}】预约`
            : `档期冲突`;
          setConflictMessage(msg);
        }
      } else {
        setHasConflict(false);
        setConflictMessage("");
      }
    } catch (error: unknown) {
      console.error("检查档期冲突失败:", error);
      const err = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (err?.response?.status === 409) {
        setHasConflict(true);
        setConflictMessage(err?.response?.data?.message || "档期冲突");
      } else {
        setHasConflict(false);
        setConflictMessage("");
      }
    }
  }, [selectedHostId, isAdmin, weddingDate, weddingTime, user?.id, schedule]);

  // 当日期或时间变化时，加载可用主持人
  useEffect(() => {
    if (visible && isAdmin) {
      loadAvailableHosts();
    }
  }, [visible, isAdmin, loadAvailableHosts]);

  // 当主持人、日期或时间变化时，检查冲突
  useEffect(() => {
    if (visible) {
      checkConflict();
    }
  }, [visible, checkConflict]);

  // 处理日期变化
  const handleDateChange = (date: Dayjs | null) => {
    setWeddingDate(date);
    form.setFieldsValue({ weddingDate: date });
  };

  // 处理时间变化
  const handleTimeChange = (value: "lunch" | "dinner") => {
    setWeddingTime(value);
    form.setFieldsValue({ weddingTime: value });
  };

  // 处理主持人变化
  const handleHostChange = (hostId: string) => {
    setSelectedHostId(hostId);
    form.setFieldsValue({ hostId });
  };

  // 处理提交
  const handleSubmit = async () => {
    if (hasConflict) {
      message.error("存在档期冲突，请修改后再保存");
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);

      // 如果isPaid为true，自动将状态设置为完成
      if (values.isPaid === true) {
        values.status = ScheduleStatus.COMPLETED;
      }

      const scheduleData = {
        ...values,
        userId: values.hostId,
        weddingDate: values.weddingDate
          ? values.weddingDate.format("YYYY-MM-DD")
          : null,
      };

      await onSave(scheduleData);
      form.resetFields();
    } catch (error: unknown) {
      console.error("表单验证失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 处理删除
  const handleDeleteClick = async () => {
    if (!schedule) return;

    try {
      setLoading(true);
      await onDelete(schedule.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={schedule ? "编辑档期" : "添加档期"}
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        schedule && (
          <Button
            key="delete"
            danger
            onClick={handleDeleteClick}
            loading={loading}
          >
            删除
          </Button>
        ),
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
        >
          {schedule ? "更新" : "添加"}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="weddingDate"
              label="婚礼日期"
              rules={[{ required: true, message: "请选择婚礼日期" }]}
              validateStatus={hasConflict ? "error" : ""}
              help={hasConflict ? conflictMessage : ""}
            >
              <DatePicker
                style={{ width: "100%" }}
                placeholder="请选择婚礼日期"
                onChange={handleDateChange}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="weddingTime"
              label="婚礼时间"
              rules={[{ required: true, message: "请选择婚礼时间" }]}
              validateStatus={hasConflict ? "error" : ""}
            >
              <Radio.Group
                options={WEDDING_TIME_OPTIONS}
                onChange={(e) => handleTimeChange(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              />
            </Form.Item>
          </Col>
        </Row>

        {isAdmin ? (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="hostId"
                label="主持人"
                rules={[{ required: true, message: "请选择主持人" }]}
                validateStatus={hasConflict ? "error" : ""}
              >
                <Select
                  placeholder="请选择主持人"
                  showSearch
                  loading={hostsLoading}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)
                      ?.toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  onChange={handleHostChange}
                >
                  {availableHosts.map((host) => (
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
                rules={[{ required: true, message: "请选择档期状态" }]}
              >
                <Select placeholder="请选择档期状态">
                  <Option value={ScheduleStatus.RESERVE}>预留</Option>
                  <Option value={ScheduleStatus.BOOKED}>已预订</Option>
                  <Option value={ScheduleStatus.CANCELLED}>已取消</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        ) : (
          <Row gutter={16}>
            <Form.Item
              name="hostId"
              hidden
              rules={[{ required: true, message: "主持人ID不能为空" }]}
            >
              <Input />
            </Form.Item>
            <Col span={12}>
              <Form.Item
                name="status"
                label="档期状态"
                rules={[{ required: true, message: "请选择档期状态" }]}
              >
                <Select placeholder="请选择档期状态">
                  <Option value={ScheduleStatus.RESERVE}>预留</Option>
                  <Option value={ScheduleStatus.BOOKED}>已预订</Option>
                  <Option value={ScheduleStatus.COMPLETED}>已完成</Option>
                  <Option value={ScheduleStatus.CANCELLED}>已取消</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        )}

        <Form.Item name="location" label="婚礼酒店">
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
              rules={[{ required: true, message: "请输入客户姓名" }]}
            >
              <Input placeholder="请输入客户姓名" prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="customerPhone"
              label="客户电话"
              rules={[
                { required: false, message: "请输入客户电话" },
                { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号码" },
              ]}
            >
              <Input placeholder="请输入客户电话" prefix={<PhoneOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="备注">
          <TextArea rows={3} placeholder="请输入备注信息" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="price" label="服务费用">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="请输入服务费用"
                min={0}
                precision={2}
                formatter={(value) =>
                  `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="deposit" label="定金">
              <InputNumber
                style={{ width: "100%" }}
                placeholder="请输入定金"
                min={0}
                precision={2}
                formatter={(value) =>
                  `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isPaid" label="已结清" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default ScheduleEditModal;
