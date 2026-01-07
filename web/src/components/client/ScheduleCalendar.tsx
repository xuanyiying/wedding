import React from 'react';
import { Calendar, Badge } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import styled from 'styled-components';
import type { Schedule } from '../../types';

interface ScheduleCalendarProps {
  events: Schedule[];
  onSelectDate: (date: Dayjs) => void;
  onPanelChange: (date: Dayjs) => void;
  onEventClick: (event: Schedule) => void;
}

const CalendarWrapper = styled.div`
  .ant-picker-calendar-full .ant-picker-panel .ant-picker-body {
    padding: 8px 0;
  }
`;

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ events, onSelectDate, onPanelChange, onEventClick }) => {
  const dateCellRender = (value: Dayjs) => {
    const listData = events.filter(event => dayjs(event.date).isSame(value, 'day'));
    return (
      <ul className="events">
        {listData.map(item => (
          <li key={item.id} onClick={() => onEventClick(item)} style={{ cursor: 'pointer' }}>
            <Badge color="blue" text={item.title} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <CalendarWrapper>
      <Calendar
        onSelect={onSelectDate}
        onPanelChange={onPanelChange}
        cellRender={dateCellRender}
      />
    </CalendarWrapper>
  );
};

export default ScheduleCalendar;