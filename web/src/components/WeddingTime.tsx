import { Radio, type RadioChangeEvent } from "antd";

export const WeddingTime: React.FC<{
  weddingTime: string;
  setWeddingTime: (time: RadioChangeEvent) => void;
}> = ({weddingTime, setWeddingTime}) => {
  return (
    <Radio.Group block options={options} value={weddingTime} onChange={setWeddingTime} defaultValue={'lunch'} /> 
  )
}
const options = [
  { label: '午宴', value: 'lunch' },
  { label: '晚宴', value: 'dinner' },
];