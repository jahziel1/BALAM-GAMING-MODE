import { render, screen, waitFor } from '@testing-library/react';
/* eslint-disable @typescript-eslint/no-empty-function */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FileExplorer from './FileExplorer';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === 'get_system_drives') return Promise.resolve(['C:\\', 'D:\\']);
    if (cmd === 'list_directory') return Promise.resolve([]);
    return Promise.resolve(null);
  }),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

describe('FileExplorer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file explorer', async () => {
    render(<FileExplorer onClose={() => {}} onSelectGame={() => {}} controllerType="KEYBOARD" />);
    await waitFor(() => {
      expect(screen.getByText('Select Drive')).toBeInTheDocument();
    });
  });

  it('loads system drives on mount', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    render(<FileExplorer onClose={() => {}} onSelectGame={() => {}} controllerType="KEYBOARD" />);
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('get_system_drives');
    });
  });

  it('sets up gamepad event listener', async () => {
    const { listen } = await import('@tauri-apps/api/event');
    render(<FileExplorer onClose={() => {}} onSelectGame={() => {}} controllerType="XBOX" />);
    await waitFor(() => {
      expect(listen).toHaveBeenCalledWith('nav', expect.any(Function));
    });
  });
});
