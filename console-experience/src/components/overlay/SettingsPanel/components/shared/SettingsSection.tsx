import React, { useId } from 'react';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children, style }) => {
  const titleId = useId();
  return (
    <section className="settings-section" aria-labelledby={titleId} style={style}>
      <h3 id={titleId} className="settings-section-title">
        {title}
      </h3>
      {children}
    </section>
  );
};
