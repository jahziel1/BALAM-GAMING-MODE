import { useCallback, useEffect, useState } from 'react';

interface UseKeyboardNavigationProps {
  itemCount: number;
  columns?: number;
  enabled?: boolean;
}

export const useKeyboardNavigation = ({
  itemCount,
  columns = 1,
  enabled = true,
}: UseKeyboardNavigationProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      switch (event.key) {
        case 'ArrowRight':
          setActiveIndex((prev) => Math.min(prev + 1, itemCount - 1));
          break;
        case 'ArrowLeft':
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'ArrowDown':
          setActiveIndex((prev) => Math.min(prev + columns, itemCount - 1));
          break;
        case 'ArrowUp':
          setActiveIndex((prev) => Math.max(prev - columns, 0));
          break;
        default:
          break;
      }
    },
    [itemCount, columns, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { activeIndex, setActiveIndex };
};
