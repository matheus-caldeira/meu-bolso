import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const iconButton = cva(
  'inline-flex items-center justify-center rounded-md border border-border-emphasis bg-surface-2 transition-colors hover:bg-surface-inset cursor-pointer',
  {
    variants: {
      tone: {
        default: 'text-ink-secondary',
        danger: 'text-danger',
      },
      size: {
        sm: 'h-8 w-8',
        md: 'h-9 w-9',
        lg: 'h-11 w-11',
      },
    },
    defaultVariants: {
      tone: 'default',
      size: 'sm',
    },
  },
);

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButton>;

const LONG_PRESS_MS = 500;

export function IconButton({
  tone,
  size,
  className,
  type = 'button',
  onClick,
  ...props
}: IconButtonProps) {
  const label = props['aria-label'];
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown() {
    if (!label) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      setTooltipOpen(true);
    }, LONG_PRESS_MS);
  }

  function dismiss() {
    clearTimer();
    setTooltipOpen(false);
  }

  return (
    <span className="relative inline-flex">
      <button
        type={type}
        className={cn(iconButton({ tone, size }), className)}
        title={label}
        onPointerDown={handlePointerDown}
        onPointerUp={dismiss}
        onPointerLeave={dismiss}
        onPointerCancel={dismiss}
        onClick={onClick}
        {...props}
      />
      {tooltipOpen && label && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink-primary px-2 py-1 text-xs font-semibold text-surface-2"
        >
          {label}
        </span>
      )}
    </span>
  );
}
