import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InputDeviceType } from '../domain/input/InputDevice';
import { useVirtualKeyboard } from './useVirtualKeyboard';

// Mock useInputDevice
vi.mock('./useInputDevice', () => ({
  useInputDevice: vi.fn(() => ({
    deviceType: InputDeviceType.KEYBOARD,
  })),
}));

describe('useVirtualKeyboard Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with keyboard closed', () => {
    const { result } = renderHook(() => useVirtualKeyboard());
    expect(result.current.isOpen).toBe(false);
  });

  it('provides keyboard control functions', () => {
    const { result } = renderHook(() => useVirtualKeyboard());
    expect(typeof result.current.close).toBe('function');
    expect(typeof result.current.handleSubmit).toBe('function');
    expect(typeof result.current.getInitialValue).toBe('function');
    expect(typeof result.current.getInputType).toBe('function');
  });

  it('getInitialValue returns empty string when no input focused', () => {
    const { result } = renderHook(() => useVirtualKeyboard());
    expect(result.current.getInitialValue()).toBe('');
  });

  it('getInputType returns text when no input focused', () => {
    const { result } = renderHook(() => useVirtualKeyboard());
    expect(result.current.getInputType()).toBe('text');
  });

  it('closes keyboard when device switches to physical keyboard', async () => {
    const { useInputDevice } = await import('./useInputDevice');

    // Start with gamepad (keyboard should be open for gamepad)
    vi.mocked(useInputDevice).mockReturnValue({
      deviceType: InputDeviceType.GAMEPAD,
      isGamepad: true,
      isKeyboard: false,
      isMouse: false,
    });

    const { result, rerender } = renderHook(() => useVirtualKeyboard());

    // Switch to keyboard device
    vi.mocked(useInputDevice).mockReturnValue({
      deviceType: InputDeviceType.KEYBOARD,
      isGamepad: false,
      isKeyboard: true,
      isMouse: false,
    });

    rerender();

    // Keyboard should close automatically
    expect(result.current.isOpen).toBe(false);
  });
});
