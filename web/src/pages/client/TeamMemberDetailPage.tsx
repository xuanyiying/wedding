import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useTeamData } from '../../hooks/useTeamData';
import TeamMemberDetailModal from '../../components/client/TeamMemberDetailModal';

const TeamMemberDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { teamMembers, loading: teamLoading } = useTeamData({
    includeMembers: true,
    activeOnly: true,
  });
  const [member, setMember] = useState<any>(null);

  useEffect(() => {
    if (userId && teamMembers.length > 0) {
      const foundMember = teamMembers.find(m => m.userId === userId);
      if (foundMember) {
        setMember(foundMember);
      }
    }
  }, [userId, teamMembers]);

  const handleBack = () => {
    navigate(-1);
  };

  if (teamLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!member) {
    return (
      <Result
        status="404"
        title="未找到团队成员"
        subTitle="抱歉，未找到您访问的团队成员信息。"
        extra={
          <Button type="primary" onClick={handleBack} icon={<ArrowLeftOutlined />}>
            返回上一页
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <TeamMemberDetailModal
        member={member}
        visible={true}
        onClose={handleBack}
        isStandalonePage={true}
      />
    </div>
  );
};

export default TeamMemberDetailPage;