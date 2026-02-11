import React from 'react';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children, style }) => (
  <div className="settings-section" style={style}>
    <h3 className="settings-section-title">{title}</h3>
    {children}
  </div>
);
