import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
import './index.css';
import App from './App';

// 设置dayjs为中文
dayjs.locale('zh-cn');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
