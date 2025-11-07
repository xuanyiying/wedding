import { Select } from "antd";
import type { Team } from "../../../types";
import React from "react";
const { Option } = Select;

export const TeamSelector: React.FC<{
  teams: Team[];
  onTeamChange: (team?: Team) => void;
}> = ({
  teams,
  onTeamChange,
}) => {
  return (
    <div className="query-item">
      <Select
        placeholder="选择团队"
        onChange={(value) => onTeamChange( value === 'all' ? undefined : teams.find(team => team.id === value))}
        allowClear
        defaultValue={'all'}
      >
        <Option value="all">全部</Option>
        {teams.map(team => (
          <Option key={team.id} value={team.id}>
            {team.name}
          </Option>
        ))}
      </Select>
    </div>

  );
};
