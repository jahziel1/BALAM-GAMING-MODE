/**
 * Adapter: Navigation Event Adapter
 *
 * Listens to various input sources (keyboard, gamepad, native events)
 * and converts them to unified NavigationEvents.
 */

import { listen } from '@tauri-apps/api/event';
import { NavigationEvent, NavigationAction, createNavigationEvent } from '../../domain/input/NavigationEvent';
import { NavigationEventListener } from '../../ports/InputPort';

export class NavigationEventAdapter implements NavigationEventListener {
    private callbacks: Set<(event: NavigationEvent) => void> = new Set();
    private keyboardListener?: (e: KeyboardEvent) => void;
    private gamepadRAF?: number;
    private lastAxisTime = 0;
    private buttonStates = new Array(20).fill(false);
    private triggerStates = { LT: false, RT: false }; // Track trigger states
    private unlistenNative?: () => void;
    private unlistenController?: () => void;

    onNavigationEvent(callback: (event: NavigationEvent) => void): () => void {
        this.callbacks.add(callback);

        // Auto-initialize on first callback
        if (this.callbacks.size === 1) {
            this.initialize();
        }

        return () => {
            this.callbacks.delete(callback);
            if (this.callbacks.size === 0) {
                this.cleanup();
            }
        };
    }

    private emit(event: NavigationEvent): void {
        this.callbacks.forEach(cb => cb(event));
    }

    private initialize(): void {
        // Keyboard navigation (only real keyboard events, not synthetic)
        this.keyboardListener = (e: KeyboardEvent) => {
            // Ignore synthetic events to prevent loops
            if (!e.isTrusted) return;

            const keyMap: Record<string, NavigationAction> = {
                'ArrowUp': NavigationAction.UP,
                'ArrowDown': NavigationAction.DOWN,
                'ArrowLeft': NavigationAction.LEFT,
                'ArrowRight': NavigationAction.RIGHT,
                'Enter': NavigationAction.CONFIRM,
                'Escape': NavigationAction.MENU,
                'Backspace': NavigationAction.BACK,
                'q': NavigationAction.QUICK_SETTINGS,
                'Q': NavigationAction.QUICK_SETTINGS
            };

            const action = keyMap[e.key];
            if (action) {
                this.emit(createNavigationEvent(action, 'KEYBOARD'));
            }
        };
        window.addEventListener('keydown', this.keyboardListener);

        // Gamepad navigation (polling)
        const checkGamepad = (time: number) => {
            const gamepads = navigator.getGamepads();
            const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

            if (gp) {
                // Button mapping
                gp.buttons.forEach((button, index) => {
                    if (button.pressed && !this.buttonStates[index]) {
                        this.buttonStates[index] = true;
                        const buttonMap: Record<number, NavigationAction> = {
                            0: NavigationAction.CONFIRM,      // A button
                            1: NavigationAction.BACK,         // B button
                            9: NavigationAction.MENU,         // START
                            8: NavigationAction.QUICK_SETTINGS, // SELECT
                            16: NavigationAction.MENU,        // Xbox guide
                            12: NavigationAction.UP,          // D-pad up
                            13: NavigationAction.DOWN,        // D-pad down
                            14: NavigationAction.LEFT,        // D-pad left
                            15: NavigationAction.RIGHT,       // D-pad right
                            4: NavigationAction.VK_BACKSPACE, // LB (Left Bumper)
                            5: NavigationAction.VK_SHIFT      // RB (Right Bumper)
                            // Note: LT/RT are axes, not buttons (handled separately)
                        };

                        const action = buttonMap[index];
                        if (action) {
                            this.emit(createNavigationEvent(action, 'GAMEPAD'));
                        }
                    } else if (!button.pressed) {
                        this.buttonStates[index] = false;
                    }
                });

                // Axis mapping (D-pad / analog stick)
                if (time - this.lastAxisTime > 100) {
                    if (gp.axes[1] < -0.5) {
                        this.emit(createNavigationEvent(NavigationAction.UP, 'GAMEPAD'));
                        this.lastAxisTime = time;
                    } else if (gp.axes[1] > 0.5) {
                        this.emit(createNavigationEvent(NavigationAction.DOWN, 'GAMEPAD'));
                        this.lastAxisTime = time;
                    } else if (gp.axes[0] > 0.5) {
                        this.emit(createNavigationEvent(NavigationAction.RIGHT, 'GAMEPAD'));
                        this.lastAxisTime = time;
                    } else if (gp.axes[0] < -0.5) {
                        this.emit(createNavigationEvent(NavigationAction.LEFT, 'GAMEPAD'));
                        this.lastAxisTime = time;
                    }
                }

                // Trigger mapping (LT/RT as axes)
                // LT: axes[2], RT: axes[5] (standard mapping)
                const ltValue = gp.axes[2] !== undefined ? gp.axes[2] : -1;
                const rtValue = gp.axes[5] !== undefined ? gp.axes[5] : -1;

                // LT (Left Trigger) - Space
                if (ltValue > 0.5 && !this.triggerStates.LT) {
                    this.triggerStates.LT = true;
                    this.emit(createNavigationEvent(NavigationAction.VK_SPACE, 'GAMEPAD'));
                } else if (ltValue <= 0.5) {
                    this.triggerStates.LT = false;
                }

                // RT (Right Trigger) - Symbols
                if (rtValue > 0.5 && !this.triggerStates.RT) {
                    this.triggerStates.RT = true;
                    this.emit(createNavigationEvent(NavigationAction.VK_SYMBOLS, 'GAMEPAD'));
                } else if (rtValue <= 0.5) {
                    this.triggerStates.RT = false;
                }
            }

            this.gamepadRAF = requestAnimationFrame(checkGamepad);
        };
        this.gamepadRAF = requestAnimationFrame(checkGamepad);

        // Native Tauri events
        listen<string>('nav', (e) => {
            const action = e.payload as NavigationAction;
            this.emit(createNavigationEvent(action, 'NATIVE'));
        }).then(unlisten => {
            this.unlistenNative = unlisten;
        });
    }

    private cleanup(): void {
        if (this.keyboardListener) {
            window.removeEventListener('keydown', this.keyboardListener);
        }
        if (this.gamepadRAF) {
            cancelAnimationFrame(this.gamepadRAF);
        }
        if (this.unlistenNative) {
            this.unlistenNative();
        }
        if (this.unlistenController) {
            this.unlistenController();
        }
    }
}
