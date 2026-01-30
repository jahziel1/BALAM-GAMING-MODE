/**
 * Port: Input Detection and Handling
 *
 * Defines interfaces for input device detection and event handling.
 * Implementations (adapters) will provide concrete behavior.
 */

import { InputDeviceType } from '../domain/input/InputDevice';
import { NavigationEvent } from '../domain/input/NavigationEvent';

/**
 * Port for detecting which input device is currently active
 */
export interface InputDeviceDetector {
    getCurrentDevice(): InputDeviceType;
    onDeviceChange(callback: (device: InputDeviceType) => void): () => void;
}

/**
 * Port for listening to navigation events from any input device
 */
export interface NavigationEventListener {
    onNavigationEvent(callback: (event: NavigationEvent) => void): () => void;
}

/**
 * Port for dispatching synthetic keyboard events
 * Used to convert gamepad inputs to keyboard events for virtual keyboard
 */
export interface KeyboardEventDispatcher {
    dispatchKeyEvent(key: string): void;
}

/**
 * Combined port for all input-related operations
 */
export interface InputPort extends InputDeviceDetector, NavigationEventListener, KeyboardEventDispatcher {
    initialize(): void;
    cleanup(): void;
}
