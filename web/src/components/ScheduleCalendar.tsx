import React, { useState } from 'react';
import { Calendar, Spin } from 'antd';
import type { CalendarProps } from 'antd';
import { createStyles } from 'antd-style';
import classNames from 'classnames';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { HolidayUtil, Lunar } from 'lunar-typescript';
import type { Schedule } from '../types';
import { ScheduleStatus } from '../types';

// 档期事件接口
interface ScheduleEvent extends Schedule {
  hostName: string;
}

// 组件属性接口
interface ScheduleCalendarProps {
  schedules: ScheduleEvent[];
  loading?: boolean;
  selectedDate?: Dayjs;
  onDateSelect?: (date: Dayjs) => void;
  onEventClick?: (event: ScheduleEvent) => void;
  showLegend?: boolean;
  theme?: 'admin' | 'client';
  fullscreen?: boolean;
}

// 样式定义
const useStyle = createStyles(({ token, css, cx }) => {
  const lunar = css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `;
  const weekend = css`
    color: ${token.colorError};
    &.gray {
      opacity: 0.4;
    }
  `;
  return {
    wrapper: css`
      width: 100%;
      border: 1px solid ${token.colorBorderSecondary};
      border-radius: ${token.borderRadiusOuter};
      padding: 5px;
      background: var(--bg-container, ${token.colorBgContainer});
    `,
    dateCell: css`
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      &:before {
        content: '';
        position: absolute;
        inset-inline-start: 0;
        inset-inline-end: 0;
        top: 0;
        bottom: 0;
        margin: auto;
        max-width: 40px;
        max-height: 40px;
        transition: background-color 300ms;
        border-radius: ${token.borderRadiusOuter}px;
        border: 1px solid transparent;
        box-sizing: border-box;
      }
     
    `,
    text: css`
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 4px 0;
    `,
    lunar,
    current: css`
      color: ${token.colorTextLightSolid};
      &:before {
        background: ${token.colorPrimary};
        width: 40px;
        height: 40px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        margin: 0;
        position: absolute;
      }
      &:hover:before {
        background: ${token.colorPrimary};
        opacity: 0.8;
      }
      .${cx(lunar)} {
        color: ${token.colorTextLightSolid};
        opacity: 0.9;
      }
      .${cx(weekend)} {
        color: ${token.colorTextLightSolid};
      }
    `,
    weekend,
    scheduleEvent: css`
      padding: 2px 6px;
      margin: 1px 0;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(255, 254, 254, 0.1);
      transition: all 0.2s ease;
      
      &:hover {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
      }
    `,
    moreEvents: css`
      padding: 2px 6px;
      margin: 1px 0;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      text-align: center;
      background-color: ${token.colorFillTertiary};
      color: ${token.colorText};
      
      &:hover {
        background-color: ${token.colorFillSecondary};
      }
    `,
    legendSection: css`
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 16px;
      flex-wrap: wrap;
      padding: 16px;
      background: var(--bg-layout, ${token.colorBgLayout});
      border-radius: ${token.borderRadiusOuter}px;
      border-top: 1px solid ${token.colorBorderSecondary};
    `,
    legendItem: css`
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary, ${token.colorTextSecondary});
      font-size: 13px;
      
      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.1);
      }
    `
  };
});

// 获取状态背景色
const getStatusBackground = (status: string) => {
  switch (status) {
    case ScheduleStatus.RESERVE:
      return 'rgba(144, 238, 144, 0.15)'; // 浅绿色背景
    case ScheduleStatus.BOOKED:
      return 'rgba(24, 144, 255, 0.15)'; // 蓝色背景
    case ScheduleStatus.CANCELLED:
      return 'rgba(255, 77, 79, 0.15)';
    default:
      return 'rgba(144, 238, 144, 0.15)';
  }
};

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case ScheduleStatus.RESERVE:
      return '预留';
    case ScheduleStatus.BOOKED:
      return '已预订';
    case ScheduleStatus.CANCELLED:
      return '已取消';
    default:
      return '未知';
  }
};

// 图例数据

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  schedules = [],
  loading = false,
  selectedDate,
  onDateSelect,
  onEventClick,
  fullscreen = false
}) => {
  const { styles } = useStyle();
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // 获取指定日期的档期事件
  const getDateEvents = (date: Dayjs) => {
    return schedules.filter(schedule => {
      const scheduleDate = dayjs(schedule.weddingDate);
      return scheduleDate.isSame(date, 'day');
    });
  };

  // 切换展开/折叠状态
  const toggleExpanded = (dateKey: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  // 日历单元格渲染
  const cellRender: CalendarProps<Dayjs>['fullCellRender'] = (date, info) => {
    const d = Lunar.fromDate(date.toDate());
    const lunar = d.getDayInChinese();
    const solarTerm = d.getJieQi();
    const isWeekend = date.day() === 6 || date.day() === 0;
    const h = HolidayUtil.getHoliday(date.get('year'), date.get('month') + 1, date.get('date'));
    const displayHoliday = h?.getTarget() === h?.getDay() ? h?.getName() : undefined;
    const events = getDateEvents(date);
    const isToday = date.isSame(dayjs(), 'day');
    const isSelected = selectedDate?.isSame(date, 'date');
    const dateKey = date.format('YYYY-MM-DD');

    if (info.type === 'date') {
      // 确定要显示的事件列表（展开时显示全部，折叠时最多显示3个）
      const isExpanded = expandedDates[dateKey];
      const displayEvents = isExpanded ? events : events.slice(0, 3);
      const hasMoreEvents = events.length > 3;

      return React.cloneElement(info.originNode, {
        ...(info.originNode as React.ReactElement<any>).props,
        className: classNames(styles.dateCell, {
          [styles.current]: isSelected,
        }),
        children: (
          <div className={styles.text}>
            {/* 阳历和农历日期居中显示 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
                minHeight: "40px",
                width: "100%",
                textAlign: "center",
                padding: "8px 0 2px 0",
                position: "relative",
                zIndex: 2,
              }}
            >
              {/* 阳历日期 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <span
                  className={classNames({
                    [styles.weekend]: isWeekend,
                    gray: !date.isSame(dayjs(), "month"),
                  })}
                  style={{
                    fontWeight: isToday ? "bold" : "normal",
                    color: isToday ? "#ffffff" : undefined,
                    fontSize: "16px",
                    lineHeight: "1.2",
                    textAlign: "center",
                  }}
                >
                  {date.get("date")}
                </span>
              </div>

              {/* 农历信息 */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "2px",
                  color: isToday ? "#ffffff" : undefined,
                  fontWeight: isToday ? "bold" : "normal",
                  width: "100%",
                }}
              >
                <div
                  className={styles.lunar}
                  style={{
                    fontSize: "11px",
                    lineHeight: "1.2",
                    textAlign: "center",
                    width: "100%",
                    wordBreak: "break-all",
                    color: isToday ? "#ffffff" : undefined,
                    fontWeight: isToday ? "bold" : "normal",
                  }}
                >
                  {displayHoliday || solarTerm || lunar}
                </div>
              </div>
            </div>

            {/* 档期事件 */}
            <div
              style={{ maxHeight: "80px", overflowY: "auto", width: "100%" }}
            >
              {displayEvents?.map((event, index) => (
                <div
                  key={`${event.id || "event"}-${index}`}
                  className={styles.scheduleEvent}
                  style={{
                    background: getStatusBackground(event.status),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  title={`${event.customerName} - ${getStatusText(event.status)}${event.hostName ? ` (${event.hostName})` : ""}`}
                >
                  {event.customerName || "未命名档期"}
                </div>
              ))}
              {hasMoreEvents && !isExpanded && (
                <div
                  className={styles.moreEvents}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(dateKey);
                  }}
                  title={`${events.length - 3} 更多档期`}
                >
                  +{events.length - 3} 更多
                </div>
              )}
              {isExpanded && (
                <div
                  className={styles.moreEvents}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(dateKey);
                  }}
                >
                  收起
                </div>
              )}
            </div>
          </div>
        ),
      });
    }

    return info.originNode;
  };

  const handleDateSelect = (date: Dayjs) => {
    onDateSelect?.(date);
  };

  return (
    <div className={styles.wrapper}>
      <Spin spinning={loading} tip="正在加载档期数据...">
        <Calendar
          fullCellRender={cellRender}
          fullscreen={fullscreen}
          value={selectedDate}
          onSelect={handleDateSelect}
        />
      </Spin>

    </div>

  );
};

export default ScheduleCalendar;
export type { ScheduleCalendarProps, ScheduleEvent };