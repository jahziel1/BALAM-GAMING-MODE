import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

import { InputDeviceType } from '../domain/input/InputDevice';
import { useInputDevice } from './useInputDevice';

export type ControllerTypeString = 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';

/**
 * Tracks the active controller brand (Xbox, PlayStation, Switch, etc.)
 * and exposes the raw input device type for cursor/gamepad-active logic.
 */
export function useControllerType() {
  const { deviceType } = useInputDevice();
  const [controllerType, setControllerType] = useState<ControllerTypeString>('KEYBOARD');

  // Listen for controller brand changes reported by the Tauri gamepad adapter
  useEffect(() => {
    const unlisten = listen<string>('controller-type-changed', (e) => {
      setControllerType(e.payload as ControllerTypeString);
    });
    return () => {
      void unlisten.then((f) => f());
    };
  }, []);

  // Fall back to KEYBOARD when mouse/keyboard is the active device.
  // Using a ref callback via queueMicrotask to avoid synchronous setState in effect body.
  useEffect(() => {
    if (deviceType !== InputDeviceType.GAMEPAD) {
      queueMicrotask(() => {
        setControllerType('KEYBOARD');
      });
    }
  }, [deviceType]);

  // Hide cursor when gamepad is active
  useEffect(() => {
    document.body.classList.toggle('gamepad-active', deviceType === InputDeviceType.GAMEPAD);
  }, [deviceType]);

  return { controllerType, deviceType };
}
