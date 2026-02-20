import './SystemOSD.css';

import { Sun, Volume1, Volume2, VolumeX } from 'lucide-react';
import React, { memo, useEffect, useState } from 'react';

interface SystemOSDProps {
  type: 'volume' | 'brightness';
  value: number;
  isVisible: boolean;
}

const SystemOSD: React.FC<SystemOSDProps> = memo(({ type, value, isVisible }) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldRender(true);

      setIsExiting(false);
    } else {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match CSS animation duration
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  const renderIcon = () => {
    if (type === 'brightness') return <Sun className="osd-icon" size={24} />;

    if (value === 0) return <VolumeX className="osd-icon" size={24} />;
    if (value < 50) return <Volume1 className="osd-icon" size={24} />;
    return <Volume2 className="osd-icon" size={24} />;
  };

  return (
    <div className={`osd-container ${isExiting ? 'osd-exit' : ''}`} data-testid="system-osd">
      <span className="osd-label">{type === 'volume' ? 'Volume' : 'Brightness'}</span>
      <div className="osd-pill">
        {renderIcon()}
        <div className="osd-track">
          <div className="osd-fill" style={{ width: `${value}%` }} />
        </div>
        <span className="osd-value">{value}%</span>
      </div>
    </div>
  );
});

SystemOSD.displayName = 'SystemOSD';

export default SystemOSD;
