import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useKeyboardNavigation } from './useKeyboardNavigation';

describe('useKeyboardNavigation Hook', () => {
  it('initializes with index 0', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 5, columns: 3 }));
    expect(result.current.activeIndex).toBe(0);
  });

  it('moves right correctly', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 5, columns: 3 }));
    
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    
    expect(result.current.activeIndex).toBe(1);
  });

  it('stops at the last item when moving right', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 2, columns: 3 }));
    
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); // Should be ignored
    });
    
    expect(result.current.activeIndex).toBe(1);
  });

  it('moves down correctly (by column count)', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 5, columns: 3 }));
    
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    
    expect(result.current.activeIndex).toBe(3); // 0 + 3 = 3
  });
});