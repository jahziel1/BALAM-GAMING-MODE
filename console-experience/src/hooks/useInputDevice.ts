/**
 * Hook: useInputDevice
 *
 * Provides current input device type and change notifications.
 * Clean interface for React components to access input device state.
 */

import { useState, useEffect } from 'react';
import { InputDeviceType } from '../domain/input/InputDevice';
import { inputAdapter } from '../adapters/input/InputAdapter';

export const useInputDevice = () => {
    const [deviceType, setDeviceType] = useState<InputDeviceType>(
        inputAdapter.getCurrentDevice()
    );

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
        isMouse: deviceType === InputDeviceType.KEYBOARD // Mouse is treated as keyboard mode
    };
};
