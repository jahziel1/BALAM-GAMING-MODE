import React from 'react';
import './Badge.css';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'outline' | 'ghost';
}

const Badge: React.FC<BadgeProps> = ({ label, variant = 'default' }) => {
  return (
    <span className={`badge badge-${variant}`}>
      {label}
    </span>
  );
};

export default Badge;