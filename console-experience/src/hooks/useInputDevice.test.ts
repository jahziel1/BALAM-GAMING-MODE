/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/unbound-method */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InputDeviceType } from '../domain/input/InputDevice';
import { useInputDevice } from './useInputDevice';

// Mock the inputAdapter
vi.mock('../adapters/input/InputAdapter', () => ({
  inputAdapter: {
    getCurrentDevice: vi.fn(() => InputDeviceType.KEYBOARD),
    onDeviceChange: vi.fn(() => () => {}),
  },
}));

describe('useInputDevice Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns current device type', () => {
    const { result } = renderHook(() => useInputDevice());
    expect(result.current.deviceType).toBe(InputDeviceType.KEYBOARD);
  });

  it('provides helper flags for device type', () => {
    const { result } = renderHook(() => useInputDevice());
    expect(result.current.isKeyboard).toBe(true);
    expect(result.current.isGamepad).toBe(false);
  });

  it('subscribes to device changes', async () => {
    const { inputAdapter } = await import('../adapters/input/InputAdapter');
    renderHook(() => useInputDevice());
    expect(inputAdapter.onDeviceChange).toHaveBeenCalled();
  });

  it('handles gamepad device type', async () => {
    const { inputAdapter } = await import('../adapters/input/InputAdapter');
    vi.mocked(inputAdapter.getCurrentDevice).mockReturnValue(InputDeviceType.GAMEPAD);

    const { result } = renderHook(() => useInputDevice());
    expect(result.current.isGamepad).toBe(true);
    expect(result.current.isKeyboard).toBe(false);
  });
});
