/* eslint-disable @typescript-eslint/no-empty-function */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickSettings } from './QuickSettings';

// Mock Tauri invoke with proper async handling
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === 'get_system_status') return Promise.resolve({ volume: 50 });
    if (cmd === 'supports_brightness_control') return Promise.resolve(false);
    if (cmd === 'get_refresh_rate') return Promise.resolve(60);
    if (cmd === 'get_supported_refresh_rates') return Promise.resolve([60]);
    if (cmd === 'supports_tdp_control') return Promise.resolve(false);
    return Promise.resolve(null);
  }),
}));

describe('QuickSettings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<QuickSettings isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
