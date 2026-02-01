/**
 * Adapter: Input Device Detector
 *
 * Detects which input device is currently active by monitoring
 * keyboard, mouse, and gamepad events.
 */

import { InputDeviceType } from '../../domain/input/InputDevice';
import { InputDeviceDetector as IInputDeviceDetector } from '../../ports/InputPort';

export class InputDeviceDetector implements IInputDeviceDetector {
  private currentDevice: InputDeviceType = InputDeviceType.KEYBOARD;
  private callbacks = new Set<(device: InputDeviceType) => void>();
  private keyboardListener?: (e: KeyboardEvent) => void;
  private mouseListener?: () => void;
  private gamepadCheckInterval?: number;

  constructor() {
    this.initialize();
  }

  getCurrentDevice(): InputDeviceType {
    return this.currentDevice;
  }

  onDeviceChange(callback: (device: InputDeviceType) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private setDevice(device: InputDeviceType): void {
    if (this.currentDevice !== device) {
      this.currentDevice = device;
      this.callbacks.forEach((cb) => cb(device));
    }
  }

  private initialize(): void {
    // Keyboard detection
    this.keyboardListener = (e: KeyboardEvent) => {
      // Only detect real keyboard events, not synthetic ones
      if (e.isTrusted) {
        this.setDevice(InputDeviceType.KEYBOARD);
      }
    };
    window.addEventListener('keydown', this.keyboardListener);

    // Mouse detection (separate from keyboard)
    this.mouseListener = () => {
      this.setDevice(InputDeviceType.MOUSE);
    };
    window.addEventListener('mousemove', this.mouseListener);

    // Gamepad detection (polling-based)
    this.gamepadCheckInterval = window.setInterval(() => {
      const gamepads = navigator.getGamepads();
      const activeGamepad = gamepads[0] ?? gamepads[1] ?? gamepads[2] ?? gamepads[3];

      if (activeGamepad) {
        // Check if any button is pressed or axis moved significantly
        const buttonPressed = activeGamepad.buttons.some((b) => b.pressed);
        const axisMovement = activeGamepad.axes.some((axis) => Math.abs(axis) > 0.5);

        if (buttonPressed || axisMovement) {
          this.setDevice(InputDeviceType.GAMEPAD);
        }
      }
    }, 100);
  }

  cleanup(): void {
    if (this.keyboardListener) {
      window.removeEventListener('keydown', this.keyboardListener);
    }
    if (this.mouseListener) {
      window.removeEventListener('mousemove', this.mouseListener);
    }
    if (this.gamepadCheckInterval) {
      clearInterval(this.gamepadCheckInterval);
    }
    this.callbacks.clear();
  }
}
