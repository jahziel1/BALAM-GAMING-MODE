import React, { useId } from 'react';

interface SettingsItemProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({ label, description, children }) => {
  const labelId = useId();
  const descId = useId();
  return (
    <div className="settings-item" role="group" aria-labelledby={labelId} aria-describedby={descId}>
      <div className="settings-item-info">
        <span id={labelId} className="settings-item-label">
          {label}
        </span>
        <span id={descId} className="settings-item-description">
          {description}
        </span>
      </div>
      {children}
    </div>
  );
};
