import React, { useState, useEffect } from "react";
import { Button, message, Row, Col } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { ContentCard } from "../../components/admin/common";
import { type Schedule, UserRole } from "../../types";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import styled from "styled-components";
import { scheduleService } from "../../services";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store";
import QueryBar, { type QueryFilters } from "../../components/common/QueryBar";
import ScheduleStats from "../../components/admin/schedule/ScheduleStats";
import ScheduleDisplay from "../../components/admin/schedule/ScheduleDisplay";
import ScheduleEditModal from "../../components/admin/schedule/ScheduleEditModal";

const SchedulesContainer = styled.div`
  padding: 16px;

  @media (max-width: 768px) {
    padding: 8px;
  }
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

interface ScheduleWithHost extends Schedule {
  hostName: string;
}

const SchedulesPage: React.FC = () => {
  // 数据状态
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [filters, setFilters] = useState<QueryFilters>({
    search: "",
    teamId: "",
    userId: "",
    weddingDate: null,
    weddingTime: "lunch",
  });

  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // 用户信息
  const { initTheme } = useTheme();
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    initTheme("admin");
  }, [initTheme]);

  useEffect(() => {
    loadSchedules();
  }, []);

  // 加载档期数据
  const loadSchedules = async (queryFilters?: {
    teamId?: string;
    userId?: string;
    date?: string;
    status?: string;
    weddingTime?: "lunch" | "dinner";
  }) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: 1, limit: 100 };
      
      if (queryFilters?.userId) params.userId = queryFilters.userId;
      if (queryFilters?.date) params.date = queryFilters.date;
      if (queryFilters?.status) params.status = queryFilters.status;
      if (queryFilters?.weddingTime) params.weddingTime = queryFilters.weddingTime;
      if (queryFilters?.teamId) params.teamId = queryFilters.teamId;

      const response = await scheduleService.getSchedules(params);
      const scheduleData = response.data?.schedules || [];
      setSchedules(scheduleData);
    } catch (error) {
      console.error("加载档期数据失败:", error);
      message.error("加载档期数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 处理日期选择
  const handleDateSelect = (date: Dayjs) => {
    setSelectedDate(date);
  };

  // 打开模态框
  const handleOpenModal = (schedule?: Schedule) => {
    setEditingSchedule(schedule || null);
    setModalVisible(true);
  };

  // 关闭模态框
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingSchedule(null);
  };

  // 保存档期
  const handleSave = async (scheduleData: Record<string, unknown>) => {
    try {
      if (editingSchedule) {
        await scheduleService.updateSchedule(editingSchedule.id, scheduleData as Partial<Schedule>);
        message.success("档期更新成功");
      } else {
        await scheduleService.createSchedule(scheduleData as Omit<Schedule, "id" | "createdAt" | "updatedAt">);
        message.success("档期添加成功");
      }
      handleCloseModal();
      await loadSchedules();
    } catch (error: unknown) {
      console.error("保存档期失败:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        err?.response?.data?.message || err?.message || "操作失败，请重试";
      message.error(`操作失败: ${errorMessage}`);
      throw error;
    }
  };

  // 删除档期
  const handleDelete = async (scheduleId: string) => {
    try {
      await scheduleService.deleteSchedule(scheduleId);
      message.success("档期删除成功");
      await loadSchedules();
      handleCloseModal();
    } catch (error) {
      console.error("删除档期失败:", error);
      message.error("删除失败，请重试");
      throw error;
    }
  };

  // 处理查询
  const handleSearch = async (searchFilters: QueryFilters) => {
    setFilters(searchFilters);
    await loadSchedules(searchFilters);
  };

  // 处理重置
  const handleReset = async () => {
    setFilters({
      search: "",
      teamId: "",
      userId: "",
      weddingDate: null,
      weddingTime: "lunch",
    });
    await loadSchedules();
  };

  // 转换档期数据，添加主持人名称
  const schedulesWithHost: ScheduleWithHost[] = schedules.map((s) => ({
    ...s,
    hostName: s.user?.realName || "未知主持人",
  }));

  // 获取选中日期的档期
  const selectedDateSchedules = schedulesWithHost.filter((s) =>
    dayjs(s.weddingDate).isSame(selectedDate, "day")
  );

  return (
    <SchedulesContainer>
      <ScheduleStats />

      <QueryBar
        showMealFilter={true}
        onQuery={handleSearch}
        initialFilters={filters}
        onReset={handleReset}
      />

      <Row gutter={16}>
        <Col xs={24} lg={24}>
          <ContentCard>
            <HeaderContainer>
              <div></div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenModal()}
              >
                添加档期
              </Button>
            </HeaderContainer>

            <ScheduleDisplay
              schedules={schedulesWithHost}
              selectedDate={selectedDate}
              selectedDateSchedules={selectedDateSchedules}
              loading={loading}
              onDateSelect={handleDateSelect}
              onEventClick={handleOpenModal}
              onEditSchedule={handleOpenModal}
              onDeleteSchedule={handleDelete}
            />
          </ContentCard>
        </Col>
      </Row>

      <ScheduleEditModal
        visible={modalVisible}
        schedule={editingSchedule}
        user={user}
        isAdmin={isAdmin}
        onCancel={handleCloseModal}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </SchedulesContainer>
  );
};

export default SchedulesPage;
