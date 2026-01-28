import { useEffect, useRef, useState } from 'react';

type GamepadButton = 'A' | 'B' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT' | 'Back' | 'Start' | 'LS' | 'RS' | 'Up' | 'Down' | 'Left' | 'Right';


interface UseGamepadOptions {
  onButtonDown?: (button: GamepadButton) => void;
  onAxisMove?: (axis: number, value: number) => void;
  enabled?: boolean;
  deadzone?: number;
}

// Standard Gamepad Mapping
const BUTTON_MAP: Record<number, GamepadButton> = {
  0: 'A', 1: 'B', 2: 'X', 3: 'Y',
  4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
  8: 'Back', 9: 'Start', 10: 'LS', 11: 'RS',
  12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right'
};

export function useGamepad({ onButtonDown, onAxisMove, enabled = true, deadzone = 0.5 }: UseGamepadOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const lastButtonState = useRef<Record<string, boolean>>({});
  const lastAxisTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[0]; // Focus on player 1

      if (gp) {
        if (!isConnected) setIsConnected(true);

        // Check Buttons
        gp.buttons.forEach((btn, index) => {
          const btnName = BUTTON_MAP[index];
          if (btnName) {
            const isPressed = btn.pressed;
            if (isPressed && !lastButtonState.current[btnName]) {
              // Button Down Event
              onButtonDown?.(btnName);
            }
            lastButtonState.current[btnName] = isPressed;
          }
        });

        // Check Axes (Stick) with Throttling
        const now = Date.now();
        if (now - lastAxisTime.current > 150) { // Max 1 move per 150ms
          // Left Stick X
          if (Math.abs(gp.axes[0]) > deadzone) {
            onAxisMove?.(0, gp.axes[0]);
            lastAxisTime.current = now;
          }
          // Left Stick Y
          if (Math.abs(gp.axes[1]) > deadzone) {
            onAxisMove?.(1, gp.axes[1]);
            lastAxisTime.current = now;
          }
        }

      } else {
        if (isConnected) setIsConnected(false);
      }

      animationFrameId = requestAnimationFrame(pollGamepad);
    };

    window.addEventListener('gamepadconnected', () => console.log("Gamepad connected!"));
    window.addEventListener('gamepaddisconnected', () => console.log("Gamepad disconnected!"));

    pollGamepad();

    return () => cancelAnimationFrame(animationFrameId);
  }, [enabled, isConnected, onButtonDown, onAxisMove, deadzone]);

  return { isConnected };
}