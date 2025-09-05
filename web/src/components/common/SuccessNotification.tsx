import React from 'react';
import { message } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';

interface SuccessNotificationProps {
  title: string;
  description?: string;
  duration?: number;
}

export const showSuccessNotification = ({ 
  title, 
  description, 
  duration = 3 
}: SuccessNotificationProps) => {
  message.success({
    content: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
        <div>
          <div style={{ fontWeight: 600, marginBottom: description ? '4px' : 0 }}>
            {title}
          </div>
          {description && (
            <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.4 }}>
              {description}
            </div>
          )}
        </div>
      </div>
    ),
    duration,
    style: {
      marginTop: '20vh',
    }
  });
};

export default showSuccessNotification;