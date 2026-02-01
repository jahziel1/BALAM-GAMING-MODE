/**
 * @module hooks/useInputDevice
 *
 * Hook for detecting and tracking the active input device (gamepad, keyboard, mouse).
 */

import { useEffect, useState } from 'react';

import { inputAdapter } from '../adapters/input/InputAdapter';
import { InputDeviceType } from '../domain/input/InputDevice';

/**
 * Custom hook for input device detection
 *
 * Provides real-time input device type and helper flags.
 * Automatically subscribes to device changes and updates state.
 *
 * ## Device Detection
 * - **Gamepad**: Xbox, PlayStation, Switch controllers
 * - **Keyboard**: Physical keyboard input
 * - **Mouse**: Treated as keyboard mode for UI purposes
 *
 * @returns Input device state with helper flags
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { deviceType, isGamepad, isKeyboard } = useInputDevice();
 *
 *   return (
 *     <div>
 *       {isGamepad ? <GamepadUI /> : <KeyboardUI />}
 *     </div>
 *   );
 * }
 * ```
 */
export const useInputDevice = () => {
  const [deviceType, setDeviceType] = useState<InputDeviceType>(inputAdapter.getCurrentDevice());

  useEffect(() => {
    const unsubscribe = inputAdapter.onDeviceChange((device) => {
      setDeviceType(device);
    });

    return unsubscribe;
  }, []);

  return {
    deviceType,
    isGamepad: deviceType === InputDeviceType.GAMEPAD,
    isKeyboard: deviceType === InputDeviceType.KEYBOARD,
    isMouse: deviceType === InputDeviceType.KEYBOARD, // Mouse is treated as keyboard mode
  };
};
