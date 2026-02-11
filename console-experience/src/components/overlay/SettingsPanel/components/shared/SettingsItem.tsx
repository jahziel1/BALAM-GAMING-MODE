import React from 'react';

interface SettingsItemProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({ label, description, children }) => (
  <div className="settings-item">
    <div className="settings-item-info">
      <span className="settings-item-label">{label}</span>
      <span className="settings-item-description">{description}</span>
    </div>
    {children}
  </div>
);
