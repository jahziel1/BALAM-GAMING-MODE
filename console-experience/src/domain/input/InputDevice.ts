/**
 * Domain: Input Device Types
 *
 * Defines the types of input devices supported by the application.
 * Following Clean Architecture principles - domain entities are independent
 * of frameworks and external dependencies.
 */

export enum InputDeviceType {
    GAMEPAD = 'GAMEPAD',
    KEYBOARD = 'KEYBOARD',
    MOUSE = 'MOUSE',
    UNKNOWN = 'UNKNOWN'
}

export interface InputDevice {
    type: InputDeviceType;
    lastActivity: number;
}

export const createInputDevice = (type: InputDeviceType): InputDevice => ({
    type,
    lastActivity: Date.now()
});
