import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Gamepad2, Bell } from 'lucide-react';
import './TopBar.css';

const TopBar: React.FC = () => {
  const [time, setTime] = useState(new Date());

  // Clock Ticker (Optimized: runs outside React render cycle effectively via minimal state update)
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="top-bar">
      {/* Left: User Profile (Compact) */}
      <div className="user-section">
        <div className="avatar-small"></div>
        <span className="username">DIABLO</span>
        <span className="level-badge">LVL 42</span>
      </div>

      {/* Right: System Status & Clock */}
      <div className="system-status">
        <div className="status-icons">
          <Gamepad2 size={20} className="icon active" />
          <Wifi size={20} className="icon active" />
          <Battery size={20} className="icon active" />
          <Bell size={20} className="icon" />
        </div>
        <div className="clock" data-testid="clock">
          {formatTime(time)}
        </div>
      </div>
    </div>
  );
};

export default TopBar;