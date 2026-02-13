/**
 * @module components/ui/Tooltip/TooltipWrapper
 *
 * Convenience wrapper that combines Tooltip + useTooltip hook.
 * Simplifies usage for common scenarios.
 */

import React, { useRef } from 'react';

import { useTooltip, type UseTooltipOptions } from '../../../hooks/useTooltip';
import { Tooltip, type TooltipPlacement } from './Tooltip';

export interface TooltipWrapperProps {
  /** Tooltip content to display */
  content: string;
  /** Tooltip placement */
  placement?: TooltipPlacement;
  /** Tooltip options (delays, gamepad mode) */
  options?: UseTooltipOptions;
  /** Child element to wrap */
  children: React.ReactElement;
  /** Additional CSS class */
  className?: string;
}

/**
 * TooltipWrapper Component
 *
 * Wraps a child element with tooltip functionality.
 * Automatically manages visibility state and positioning.
 *
 * Note: Wraps child in a span to capture hover/focus events.
 * The span is inline and shouldn't affect layout.
 *
 * @example
 * ```tsx
 * <TooltipWrapper content="Open Settings" placement="bottom">
 *   <button><Settings /></button>
 * </TooltipWrapper>
 * ```
 *
 * @param props - Component props
 * @returns Wrapped element with tooltip
 */
export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({
  content,
  placement = 'auto',
  options,
  children,
  className,
}) => {
  const targetRef = useRef<HTMLSpanElement>(null);
  const { isVisible, tooltipProps } = useTooltip(options);

  return (
    <>
      <span
        ref={targetRef}
        {...tooltipProps}
        style={{ display: 'inline-block' }} // Inline-block to preserve layout
      >
        {children}
      </span>
      <Tooltip
        content={content}
        isVisible={isVisible}
        placement={placement}
        targetRef={targetRef as React.RefObject<HTMLElement>}
        className={className}
      />
    </>
  );
};

TooltipWrapper.displayName = 'TooltipWrapper';

export default TooltipWrapper;
