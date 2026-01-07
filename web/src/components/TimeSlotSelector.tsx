import React from 'react';
import { Radio, type RadioChangeEvent } from "antd";

export interface TimeSlotSelectorProps {
  timeSlot: string;
  setTimeSlot: (time: string) => void;
}

export const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({ timeSlot, setTimeSlot }) => {
  const handleChange = (e: RadioChangeEvent) => {
    setTimeSlot(e.target.value);
  };

  return (
    <Radio.Group 
      block 
      options={options} 
      value={timeSlot} 
      onChange={handleChange} 
      optionType="button"
      buttonStyle="solid"
    /> 
  );
};

const options = [
  { label: '午宴', value: 'lunch' },
  { label: '晚宴', value: 'dinner' },
];
