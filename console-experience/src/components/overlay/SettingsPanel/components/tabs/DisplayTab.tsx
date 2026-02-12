import React, { useEffect, useState } from 'react';

import { useHdrManager } from '../../../../../hooks/useHdrManager';
import { SettingsItem, SettingsSection, SettingsToggle } from '../shared';

export const DisplayTab: React.FC = () => {
  const { displays, loading, error, getPrimaryDisplay, toggleHdr } = useHdrManager();
  const [toggling, setToggling] = useState(false);

  const primary = getPrimaryDisplay();
  const hdr = primary?.hdr;

  const handleHdrToggle = async (enabled: boolean) => {
    if (!primary) return;

    setToggling(true);
    try {
      await toggleHdr(primary.id, enabled);
    } catch (err) {
      console.error('HDR toggle failed:', err);
      // Error is already set in the hook
    } finally {
      setToggling(false);
    }
  };

  // Log display info for debugging (dev only)
  useEffect(() => {
    if (displays.length > 0) {
      console.warn('Displays detected:', displays);
    }
  }, [displays]);

  if (loading && displays.length === 0) {
    return (
      <SettingsSection title="Display">
        <SettingsItem label="Loading..." description="Detecting displays...">
          <div style={{ color: '#888' }}>Please wait...</div>
        </SettingsItem>
      </SettingsSection>
    );
  }

  if (error && displays.length === 0) {
    return (
      <SettingsSection title="Display">
        <SettingsItem label="Error" description={error}>
          <div style={{ color: '#ff6b6b' }}>Failed to detect displays</div>
        </SettingsItem>
      </SettingsSection>
    );
  }

  if (!primary) {
    return (
      <SettingsSection title="Display">
        <SettingsItem label="No Display" description="Could not detect any displays">
          <div style={{ color: '#ff6b6b' }}>No displays found</div>
        </SettingsItem>
      </SettingsSection>
    );
  }

  return (
    <>
      <SettingsSection title="Display Information">
        <SettingsItem label="Primary Display" description={primary.name}>
          <div style={{ color: '#7FFF7F' }}>Active</div>
        </SettingsItem>

        {Boolean(hdr) && hdr ? (
          <SettingsItem
            label="Color Depth"
            description={`${hdr.bits_per_channel}-bit color per channel`}
          >
            <div style={{ color: '#888' }}>{hdr.bits_per_channel} bpc</div>
          </SettingsItem>
        ) : null}
      </SettingsSection>

      <SettingsSection title="HDR (High Dynamic Range)">
        {hdr?.supported ? (
          <>
            <SettingsItem
              label="Enable HDR"
              description={`Max brightness: ${Math.round(hdr.max_luminance_nits)} nits`}
            >
              <SettingsToggle
                checked={hdr.enabled}
                onChange={(e) => void handleHdrToggle(e.target.checked)}
                disabled={toggling || hdr.force_disabled}
              />
            </SettingsItem>

            {hdr.force_disabled === true && (
              <SettingsItem
                label="⚠️ HDR Disabled"
                description="HDR is disabled by the system or driver"
              >
                <div style={{ color: '#ff6b6b' }}>Force Disabled</div>
              </SettingsItem>
            )}

            {hdr.wide_color_enforced === true && (
              <SettingsItem label="Wide Color Gamut" description="Enhanced color range is enforced">
                <div style={{ color: '#7FFF7F' }}>Enabled</div>
              </SettingsItem>
            )}

            <SettingsItem
              label="ℹ️ HDR Information"
              description="HDR provides enhanced brightness and color accuracy. Toggle applies immediately without restart. Some games may need to be restarted to detect HDR."
            >
              <div style={{ color: hdr.enabled ? '#7FFF7F' : '#888' }}>
                {hdr.enabled ? 'Active' : 'Inactive'}
              </div>
            </SettingsItem>
          </>
        ) : (
          <SettingsItem
            label="HDR Not Supported"
            description="Your display does not support HDR, or HDR is not available"
          >
            <div style={{ color: '#888' }}>Not Available</div>
          </SettingsItem>
        )}
      </SettingsSection>

      {displays.length > 1 ? (
        <SettingsSection title="Multiple Displays">
          <SettingsItem label="Displays Detected" description={`${displays.length} displays found`}>
            <div style={{ color: '#7FFF7F' }}>{displays.length}</div>
          </SettingsItem>
          <SettingsItem
            label="ℹ️ Multi-Monitor"
            description="Multi-monitor HDR control is coming in a future update"
          >
            <div style={{ color: '#888' }}>Coming Soon</div>
          </SettingsItem>
        </SettingsSection>
      ) : null}

      {Boolean(error) && error ? (
        <SettingsSection title="Error">
          <SettingsItem label="Last Error" description={error}>
            <div style={{ color: '#ff6b6b' }}>See description</div>
          </SettingsItem>
        </SettingsSection>
      ) : null}
    </>
  );
};
