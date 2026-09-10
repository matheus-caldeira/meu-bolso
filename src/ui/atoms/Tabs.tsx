import type { KeyboardEvent } from 'react';
import { cn } from '../lib/cn';

export interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  label: string;
  onChange: (value: string) => void;
}

export function Tabs({ items, value, label, onChange }: TabsProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const current = items.findIndex((item) => item.value === value);
    const next = (current + step + items.length) % items.length;
    onChange(items[next].value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="flex gap-1 overflow-x-auto border-b border-border"
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px shrink-0 cursor-pointer border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
              selected
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-tertiary hover:text-ink-secondary',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
