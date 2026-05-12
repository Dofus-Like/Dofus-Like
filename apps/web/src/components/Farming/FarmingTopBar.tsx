import React from 'react';
import { getResourceIconPath } from '../../utils/resourceIcons';
import './FarmingTopBar.css';

interface FarmingTopBarProps {
  pips: number;
  resources: Record<string, number>;
}

export const FarmingTopBar = ({ pips, resources }: FarmingTopBarProps) => {
  const pipArray = Array.from({ length: 4 }, (_, i) => i < pips);

  return (
    <div className="farming-top-bar">
      <div className="pips-container">
        {pipArray.map((filled, i) => (
          <div key={i} className={`pip-diamond ${filled ? 'filled' : ''}`} />
        ))}
      </div>
      
      <div className="resource-counters">
        {Object.entries(resources).map(([name, count]) => (
          <div key={name} className="res-counter">
            <img src={getResourceIconPath(name)} alt={name} className="res-icon-img" />
            <span className="res-count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

