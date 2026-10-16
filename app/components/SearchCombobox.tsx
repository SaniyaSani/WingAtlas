"use client";

import { KeyboardEvent, ReactNode, useId, useMemo, useRef, useState } from "react";

/**
 * Small accessible combobox (WAI-ARIA 1.2 list autocomplete pattern).
 * Used for picking families in Atlas and reference plates in Compare.
 */
export default function SearchCombobox<T>({
  label,
  items,
  getKey,
  renderOption,
  search,
  onSelect,
  selectedKey,
  selectedLabel,
  placeholder = "Search…",
  emptyMessage,
  className = "",
  maxResults = 60,
}: {
  label: ReactNode;
  items: T[];
  getKey: (item: T) => string;
  renderOption: (item: T) => ReactNode;
  search: (items: T[], query: string) => T[];
  onSelect: (item: T) => void;
  selectedKey?: string | null;
  selectedLabel?: string;
  placeholder?: string;
  emptyMessage?: (query: string) => ReactNode;
  className?: string;
  maxResults?: number;
}) {
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<number | null>(null);
  const results = useMemo(() => search(items, query).slice(0, maxResults), [items, query, search, maxResults]);
  const total = useMemo(() => search(items, query).length, [items, query, search]);
  const safeIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

  function choose(item: T) {
    onSelect(item);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      if (open && results[safeIndex]) {
        event.preventDefault();
        choose(results[safeIndex]);
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setQuery("");
      }
    }
  }

  return (
    <div className={`ew-combobox ${open ? "is-open" : ""} ${className}`}>
      <label htmlFor={inputId} className="ew-combobox-label">{label}</label>
      <div className="ew-combobox-field">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[safeIndex] ? `${id}-opt-${safeIndex}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={open ? query : selectedLabel ?? ""}
          placeholder={placeholder}
          onFocus={(event) => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            setOpen(true);
            setQuery("");
            setActiveIndex(0);
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => {
              setOpen(false);
              setQuery("");
            }, 120);
          }}
          onKeyDown={onKeyDown}
        />
        <span className="ew-combobox-count" aria-hidden="true">{open ? `${total}` : "⌕"}</span>
      </div>
      {open && (
        <ul id={listId} role="listbox" className="ew-combobox-list" aria-label={typeof label === "string" ? label : undefined}>
          {results.map((item, index) => {
            const key = getKey(item);
            return (
              <li
                key={key}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={index === safeIndex}
                className={`${index === safeIndex ? "is-active" : ""} ${key === selectedKey ? "is-current" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(item)}
              >
                {renderOption(item)}
              </li>
            );
          })}
          {!results.length && <li className="ew-combobox-empty" role="presentation">{emptyMessage ? emptyMessage(query) : `Nothing matches “${query}”.`}</li>}
          {total > results.length && <li className="ew-combobox-more" role="presentation">{total - results.length} more · keep typing to narrow</li>}
        </ul>
      )}
    </div>
  );
}
