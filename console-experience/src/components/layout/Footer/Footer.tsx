import React, { useState, useEffect } from 'react';
import './Footer.css';

interface FooterProps {
  isGamepad?: boolean; // Optional override for testing
}

type GamepadType = 'xbox' | 'playstation' | 'nintendo' | 'keyboard';

const Footer: React.FC<FooterProps> = ({ isGamepad: initialOverride }) => {
  const [inputType, setInputType] = useState<GamepadType>('keyboard');

  // Performance Note: We only poll when necessary or use event listeners.
  // The 'gamepadconnected' event is efficient.
  useEffect(() => {
    // If override is provided (e.g. testing), force it.
    if (initialOverride) {
      setInputType('xbox');
      return;
    }

    const handleKeyDown = () => setInputType('keyboard');
    
    const handleGamepadConnect = (e: GamepadEvent) => {
      const id = e.gamepad.id.toLowerCase();
      if (id.includes('sony') || id.includes('dual') || id.includes('ps')) {
        setInputType('playstation');
      } else if (id.includes('nintendo') || id.includes('switch')) {
        setInputType('nintendo');
      } else {
        setInputType('xbox'); // Default/PC Standard
      }
    };

    // Also listen for button presses to switch back to gamepad mode if user was on keyboard
    let animationFrameId: number;
    const pollGamepads = () => {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (gp && gp.buttons.some(b => b.pressed)) {
           // Detect type again based on connected gamepad
           const id = gp.id.toLowerCase();
           if (id.includes('sony')) setInputType('playstation');
           else if (id.includes('nintendo')) setInputType('nintendo');
           else setInputType('xbox');
           break;
        }
      }
      // Throttle polling: check every 100ms or so instead of every frame?
      // For now, let's rely on events + keydown to switch modes to avoid constant polling loop overhead
      // actually, just listening to 'gamepadconnected' sets the initial type.
      // We need a lightweight listener for "any button press" to switch context from Keyboard -> Gamepad
      // Efficient polling strategy: check every 200ms
    };
    
    const interval = setInterval(pollGamepads, 200);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('gamepadconnected', handleGamepadConnect);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('gamepadconnected', handleGamepadConnect);
      clearInterval(interval);
    };
  }, [initialOverride]);

  const renderPrompts = () => {
    switch (inputType) {
      case 'playstation':
        return (
          <>
            <div className="prompt-item"><span className="btn-icon ps-cross">✕</span><span className="label">SELECT</span></div>
            <div className="prompt-item"><span className="btn-icon ps-circle">○</span><span className="label">BACK</span></div>
            <div className="prompt-item"><span className="btn-icon ps-triangle">△</span><span className="label">SEARCH</span></div>
            <div className="prompt-item"><span className="btn-icon ps-options">OPTIONS</span><span className="label">MENU</span></div>
          </>
        );
      case 'nintendo':
        return (
          <>
            <div className="prompt-item"><span className="btn-icon ns-a">A</span><span className="label">SELECT</span></div>
            <div className="prompt-item"><span className="btn-icon ns-b">B</span><span className="label">BACK</span></div>
            <div className="prompt-item"><span className="btn-icon ns-x">X</span><span className="label">SEARCH</span></div>
            <div className="prompt-item"><span className="btn-icon ns-plus">+</span><span className="label">MENU</span></div>
          </>
        );
      case 'xbox':
        return (
          <>
            <div className="prompt-item"><span className="btn-icon xbox-a">A</span><span className="label">SELECT</span></div>
            <div className="prompt-item"><span className="btn-icon xbox-b">B</span><span className="label">BACK</span></div>
            <div className="prompt-item"><span className="btn-icon xbox-y">Y</span><span className="label">SEARCH</span></div>
            <div className="prompt-item"><span className="btn-icon xbox-menu">☰</span><span className="label">MENU</span></div>
          </>
        );
      default: // Keyboard
        return (
          <>
            <div className="prompt-item"><span className="key-icon">ENTER</span><span className="label">SELECT</span></div>
            <div className="prompt-item"><span className="key-icon">ESC</span><span className="label">BACK</span></div>
            <div className="prompt-item"><span className="key-icon">M</span><span className="label">MENU</span></div>
          </>
        );
    }
  };

  return (
    <div className="footer-bar" data-testid="footer-prompts">
      <div className="prompts-container">
        {renderPrompts()}
      </div>
    </div>
  );
};

export default Footer;