import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsPanel } from '../SettingsPanel';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === 'is_using_overlay') return Promise.resolve(false);
    return Promise.resolve(null);
  }),
}));

// Mock StoreProvider to provide settings state
vi.mock('@/application/providers/StoreProvider', () => ({
  useAppStore: vi.fn(() => ({
    settings: {
      language: 'en',
      startWithWindows: false,
      startMinimized: false,
      animationsEnabled: true,
      blurEffects: true,
      cardSize: 'medium',
      hardwareAcceleration: true,
      defaultTDP: 15,
      defaultRefreshRate: 60,
      autoScan: true,
      vibration: true,
    },
    updateSetting: vi.fn(),
    resetSettings: vi.fn(),
    performance: {
      config: {
        level: 1,
        opacity: 0.9,
        enabled: false,
        mode: 'compact',
        position: 'top-right',
        autoStartFPS: true,
        updateInterval: 1000,
      },
    },
    setPerformanceLevel: vi.fn(),
  })),
}));

describe('SettingsPanel Baseline', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    controllerType: 'KEYBOARD' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all main categories in the sidebar', () => {
    render(<SettingsPanel {...defaultProps} />);

    // Use getByRole to be more specific about sidebar buttons
    expect(screen.getByRole('button', { name: /general/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /appearance/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /library/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /input/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /performance/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /system/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /about/i })).toBeDefined();
  });

  it('switches between categories correctly', () => {
    render(<SettingsPanel {...defaultProps} />);

    // Initial category should be General
    expect(screen.getByText('General Settings')).toBeDefined();

    // Switch to Appearance
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /appearance/i }));
    });
    expect(screen.getByText('Animations')).toBeDefined();

    // Switch to Performance
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /performance/i }));
    });
    // Should find "Hardware Acceleration" which is unique to Performance tab
    expect(screen.getByText('Hardware Acceleration')).toBeDefined();
    // Verify FPS monitoring section is present
    expect(screen.getByText(/FPS Monitoring Service/i)).toBeDefined();
  });

  it('renders specific system settings like TDP slider', () => {
    render(<SettingsPanel {...defaultProps} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /system/i }));
    });
    expect(screen.getByText('Default TDP')).toBeDefined();
    // Should find multiple range inputs (TDP and Refresh Rate)
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThanOrEqual(1);
  });

  it('renders About section with correct version', () => {
    render(<SettingsPanel {...defaultProps} />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /about/i }));
    });
    // Use regex for flexible match
    expect(screen.getByText(/Balam Console Experience/i)).toBeDefined();
    expect(screen.getByText(/0\.1\.0/)).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<SettingsPanel {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });
});
