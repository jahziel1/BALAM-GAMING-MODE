/**
 * Hook: useVirtualKeyboard
 *
 * Manages virtual keyboard visibility and behavior based on input device.
 * Encapsulates all logic for opening/closing virtual keyboard.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { InputDeviceType } from '../domain/input/InputDevice';
import { useInputDevice } from './useInputDevice';

interface UseVirtualKeyboardOptions {
    onOpen?: () => void;
    onClose?: () => void;
    onTextChange?: (text: string) => void;
}

export const useVirtualKeyboard = (options?: UseVirtualKeyboardOptions) => {
    const [isOpen, setIsOpen] = useState(false);
    const { deviceType } = useInputDevice();

    // Use refs to avoid recreating effects on every callback change
    const callbacksRef = useRef(options);
    useEffect(() => {
        callbacksRef.current = options;
    }, [options]);

    // Handle input focus events
    useEffect(() => {
        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'file') {
                // Open keyboard if using gamepad or mouse (NOT physical keyboard)
                if (deviceType === InputDeviceType.GAMEPAD || deviceType === InputDeviceType.MOUSE) {
                    setIsOpen(true);
                    callbacksRef.current?.onOpen?.();
                }
            }
        };

        window.addEventListener('focus', handleFocus, true);
        return () => window.removeEventListener('focus', handleFocus, true);
    }, [deviceType]);

    // Auto-close keyboard when switching to physical keyboard
    useEffect(() => {
        if (isOpen && deviceType === InputDeviceType.KEYBOARD) {
            setIsOpen(false);
            callbacksRef.current?.onClose?.();
        }
    }, [deviceType, isOpen]);

    // Auto-reopen keyboard when switching to gamepad/mouse if input is focused
    useEffect(() => {
        if (!isOpen && (deviceType === InputDeviceType.GAMEPAD || deviceType === InputDeviceType.MOUSE)) {
            const activeElement = document.activeElement;
            if (activeElement instanceof HTMLInputElement && activeElement.type !== 'file') {
                setIsOpen(true);
                callbacksRef.current?.onOpen?.();
            }
        }
    }, [deviceType, isOpen]);

    const close = useCallback(() => {
        setIsOpen(false);
        callbacksRef.current?.onClose?.();
        // Blur active element
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, []);

    const handleSubmit = useCallback((text: string) => {
        // Update the active input field
        if (document.activeElement instanceof HTMLInputElement) {
            const input = document.activeElement;
            input.value = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        close();
    }, [close]);

    return {
        isOpen,
        close,
        handleSubmit,
        getInitialValue: () => {
            const activeElement = document.activeElement;
            return activeElement instanceof HTMLInputElement ? activeElement.value : '';
        },
        getInputType: () => {
            const activeElement = document.activeElement;
            return activeElement instanceof HTMLInputElement ? activeElement.type as any : 'text';
        }
    };
};
