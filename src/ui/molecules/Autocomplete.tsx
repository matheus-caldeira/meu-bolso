import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/cn';

export interface AutocompleteOption {
  value: string;
  label: string;
  hint?: string;
}

interface AutocompleteProps {
  label: string;
  value: string;
  options: AutocompleteOption[];
  placeholder?: string;
  searchLabel?: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  onSearch?: () => void;
}

export function Autocomplete({
  label,
  value,
  options,
  placeholder,
  searchLabel = `Buscar ${label}`,
  onChange,
  onSelect,
  onSearch,
}: AutocompleteProps) {
  const inputId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lastOptions, setLastOptions] = useState(options);

  if (lastOptions !== options) {
    setLastOptions(options);
    setActiveIndex(-1);
  }

  const expanded = focused && options.length > 0 && !dismissed;

  useEffect(() => {
    if (activeIndex < 0) return;
    const active = listRef.current?.children[activeIndex];
    active?.querySelector('button')?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setFocused(false);
    setActiveIndex(-1);
  }

  function handleChange(next: string) {
    setDismissed(false);
    onChange(next);
  }

  function choose(option: AutocompleteOption) {
    setDismissed(true);
    setActiveIndex(-1);
    onSelect(option);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setDismissed(true);
      return;
    }
    if (!expanded) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        current <= 0 ? options.length - 1 : current - 1,
      );
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(options[activeIndex]);
    }
  }

  return (
    <div
      className="relative flex flex-col gap-1"
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      <label
        htmlFor={inputId}
        className="text-xs font-semibold text-ink-secondary"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={expanded}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          className={cn(
            'min-h-[38px] w-full rounded-sm border border-border-emphasis bg-surface-inset px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent',
            onSearch && 'pr-12',
          )}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {onSearch && (
          <button
            type="button"
            aria-label={searchLabel}
            className="absolute inset-y-0 right-0 flex h-11 w-11 cursor-pointer items-center justify-center self-center text-ink-tertiary hover:text-accent"
            onClick={onSearch}
          >
            <Search size={18} />
          </button>
        )}
      </div>
      {expanded && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={`Opções para ${label}`}
          className="absolute left-0 right-0 top-full z-20 mt-0.5 max-h-56 overflow-y-auto rounded-md border border-border bg-surface-2 shadow-lg"
        >
          {options.map((option, index) => (
            <li key={option.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-inset',
                  index === activeIndex && 'bg-surface-inset',
                )}
                onClick={() => choose(option)}
              >
                <span className="text-ink-primary">{option.label}</span>
                {option.hint && (
                  <span className="text-sm text-ink-tertiary">
                    {option.hint}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
