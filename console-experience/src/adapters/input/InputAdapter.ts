/**
 * Adapter: Main Input Adapter
 *
 * Combines all input adapters into a single implementation of InputPort.
 * This is the main adapter that the application will use.
 */

import { InputDeviceType } from '../../domain/input/InputDevice';
import { NavigationEvent } from '../../domain/input/NavigationEvent';
import { InputPort } from '../../ports/InputPort';
import { InputDeviceDetector } from './InputDeviceDetector';
import { KeyboardEventDispatcher } from './KeyboardEventDispatcher';
import { NavigationEventAdapter } from './NavigationEventAdapter';

export class InputAdapter implements InputPort {
  private deviceDetector: InputDeviceDetector;
  private eventDispatcher: KeyboardEventDispatcher;
  private navigationAdapter: NavigationEventAdapter;

  constructor() {
    this.deviceDetector = new InputDeviceDetector();
    this.eventDispatcher = new KeyboardEventDispatcher();
    this.navigationAdapter = new NavigationEventAdapter();
  }

  initialize(): void {
    // Adapters auto-initialize
  }

  cleanup(): void {
    this.deviceDetector.cleanup();
  }

  getCurrentDevice(): InputDeviceType {
    return this.deviceDetector.getCurrentDevice();
  }

  onDeviceChange(callback: (device: InputDeviceType) => void): () => void {
    return this.deviceDetector.onDeviceChange(callback);
  }

  onNavigationEvent(callback: (event: NavigationEvent) => void): () => void {
    return this.navigationAdapter.onNavigationEvent(callback);
  }

  dispatchKeyEvent(key: string): void {
    this.eventDispatcher.dispatchKeyEvent(key);
  }
}

// Singleton instance
export const inputAdapter = new InputAdapter();
