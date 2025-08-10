import React from 'react';
import { Space, Tag } from 'antd';
import styled from 'styled-components';


interface ProfileData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  nickname?: string;
  bio?: string;
  specialties?: string[];
  yearsOfExperience?: number;
  location?: string;
  website?: string;
  socialMedia?: {
    wechat?: string;
    weibo?: string;
    instagram?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileSectionProps {
  profile: ProfileData;
  onEdit: () => void;
  loading?: boolean;
}

const ProfileContainer = styled.div`
  .profile-header {
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px 12px 0 0;
    
    .avatar {
      margin-bottom: 16px;
      border: 4px solid rgba(255, 255, 255, 0.2);
    }
    
    .username {
      color: white;
      margin-bottom: 8px;
    }
    
    .bio {
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 0;
    }
  }
  
  .profile-content {
    padding: 24px;
  }
  
  .info-section {
    margin-bottom: 24px;
    
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--admin-text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
      
      .anticon {
        color: var(--admin-primary-color);
      }
    }
    
    .info-item {
      margin-bottom: 12px;
      
      .label {
        color: var(--admin-text-secondary);
        margin-right: 12px;
        min-width: 100px;
        display: inline-block;
      }
      
      .value {
        color: var(--admin-text-primary);
      }
    }
  }
  
  .specialties-container {
    .specialty-tag {
      margin-bottom: 8px;
    }
  }
  
  .social-links {
    .social-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      
      .platform {
        min-width: 80px;
        color: var(--admin-text-secondary);
      }
      
      .handle {
        color: var(--admin-text-primary);
      }
    }
  }
`;

const ProfileSection: React.FC<ProfileSectionProps> = ({
  profile,
}) => {
  return (
    <ProfileContainer>
  
        
        
        <div className="profile-content">
       
          
          {profile.specialties && profile.specialties.length > 0 && (
            <div className="info-section">
              <div className="section-title">
                专业技能
              </div>
              
              <div className="specialties-container">
                <Space wrap>
                  {profile.specialties.map((specialty, index) => (
                    <Tag
                      key={index}
                      color="blue"
                      className="specialty-tag"
                    >
                      {specialty}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          )}
          
          {profile.socialMedia && (
            <div className="info-section">
              <div className="section-title">
                社交媒体
              </div>
              
              <div className="social-links">
                {profile.socialMedia.wechat && (
                  <div className="social-item">
                    <span className="platform">微信:</span>
                    <span className="handle">{profile.socialMedia.wechat}</span>
                  </div>
                )}
                
                {profile.socialMedia.weibo && (
                  <div className="social-item">
                    <span className="platform">微博:</span>
                    <span className="handle">{profile.socialMedia.weibo}</span>
                  </div>
                )}
                
                {profile.socialMedia.instagram && (
                  <div className="social-item">
                    <span className="platform">Instagram:</span>
                    <span className="handle">{profile.socialMedia.instagram}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
    </ProfileContainer>
  );
};

export default ProfileSection;
export type { ProfileData };