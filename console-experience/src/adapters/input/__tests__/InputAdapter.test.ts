/**
 * Unit tests for InputAdapter
 * Tests dispatchKeyEvent, device detection, and cleanup behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InputDeviceType } from '../../../domain/input/InputDevice';
import { InputAdapter } from '../InputAdapter';

// Mock Tauri event API to prevent unhandled rejections from NavigationEventAdapter
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(vi.fn())),
  emit: vi.fn(),
}));

describe('InputAdapter', () => {
  let adapter: InputAdapter;

  beforeEach(() => {
    adapter = new InputAdapter();
    adapter.initialize();
  });

  afterEach(() => {
    adapter.cleanup();
  });

  it('initializes without errors', () => {
    expect(adapter).toBeTruthy();
  });

  it('cleanup() does not throw', () => {
    expect(() => adapter.cleanup()).not.toThrow();
  });

  it('getCurrentDevice() returns a valid InputDeviceType', () => {
    const device = adapter.getCurrentDevice();
    const validTypes = Object.values(InputDeviceType);
    expect(validTypes).toContain(device);
  });

  it('onDeviceChange() returns an unsubscribe function', () => {
    const unsub = adapter.onDeviceChange(vi.fn());
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('onNavigationEvent() returns an unsubscribe function', () => {
    const unsub = adapter.onNavigationEvent(vi.fn());
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('dispatchKeyEvent dispatches a DOM keyboard event', () => {
    const events: string[] = [];
    const handler = (e: Event) => events.push((e as KeyboardEvent).key);
    document.addEventListener('keydown', handler);

    adapter.dispatchKeyEvent('ArrowDown');

    document.removeEventListener('keydown', handler);
    expect(events).toContain('ArrowDown');
  });

  it('dispatchKeyEvent with shift modifier sets shiftKey on the event', () => {
    const events: KeyboardEvent[] = [];
    const handler = (e: Event) => events.push(e as KeyboardEvent);
    document.addEventListener('keydown', handler);

    adapter.dispatchKeyEvent('a', { shift: true });

    document.removeEventListener('keydown', handler);
    const shiftEvents = events.filter((e) => e.shiftKey);
    expect(shiftEvents.length).toBeGreaterThan(0);
  });
});
