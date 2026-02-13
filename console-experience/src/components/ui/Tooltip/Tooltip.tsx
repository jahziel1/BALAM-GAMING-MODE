/**
 * @module components/ui/Tooltip
 *
 * Tooltip component with glassmorphism design.
 * Supports multiple placements and automatic positioning.
 */

import './Tooltip.css';

import React, { useEffect, useRef, useState } from 'react';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TooltipProps {
  /** Content to display in tooltip */
  content: string;
  /** Whether tooltip is visible */
  isVisible: boolean;
  /** Preferred placement (auto will choose best position) */
  placement?: TooltipPlacement;
  /** Target element reference */
  targetRef: React.RefObject<HTMLElement>;
  /** Additional CSS class */
  className?: string;
  /** Children (optional - for portal-less usage) */
  children?: React.ReactNode;
}

/**
 * Calculate optimal tooltip position
 */
const calculatePosition = (
  targetRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement
): { top: number; left: number; actualPlacement: TooltipPlacement } => {
  const spacing = 8; // Space between tooltip and target
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  let top = 0;
  let left = 0;
  let actualPlacement = placement;

  // Auto placement - choose best position
  if (placement === 'auto') {
    const spaceTop = targetRect.top;
    const spaceBottom = viewport.height - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = viewport.width - targetRect.right;

    if (spaceTop > tooltipRect.height + spacing) {
      actualPlacement = 'top';
    } else if (spaceBottom > tooltipRect.height + spacing) {
      actualPlacement = 'bottom';
    } else if (spaceRight > tooltipRect.width + spacing) {
      actualPlacement = 'right';
    } else if (spaceLeft > tooltipRect.width + spacing) {
      actualPlacement = 'left';
    } else {
      // Default to top if no space
      actualPlacement = 'top';
    }
  }

  // Calculate position based on placement
  switch (actualPlacement) {
    case 'top':
      top = targetRect.top - tooltipRect.height - spacing;
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      break;
    case 'bottom':
      top = targetRect.bottom + spacing;
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      left = targetRect.left - tooltipRect.width - spacing;
      break;
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      left = targetRect.right + spacing;
      break;
  }

  // Clamp to viewport
  top = Math.max(spacing, Math.min(top, viewport.height - tooltipRect.height - spacing));
  left = Math.max(spacing, Math.min(left, viewport.width - tooltipRect.width - spacing));

  return { top, left, actualPlacement };
};

/**
 * Tooltip Component
 *
 * Glassmorphism tooltip that positions itself relative to target element.
 *
 * @param props - Component props
 * @returns Tooltip element
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  isVisible,
  placement = 'auto',
  targetRef,
  className = '',
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState<TooltipPlacement>(placement);

  // Update position when visible or target changes
  useEffect(() => {
    if (!isVisible || !targetRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      if (!targetRef.current || !tooltipRef.current) return;

      const targetRect = targetRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const {
        top,
        left,
        actualPlacement: newPlacement,
      } = calculatePosition(targetRect, tooltipRect, placement);

      setPosition({ top, left });
      setActualPlacement(newPlacement);
    };

    // Initial position
    updatePosition();

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, targetRef, placement]);

  if (!isVisible) return null;

  return (
    <div
      ref={tooltipRef}
      className={`tooltip tooltip-${actualPlacement} ${className}`}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      role="tooltip"
    >
      {content}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';

export default Tooltip;
