"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent";

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  emptyLabel?: string;
  placeholder?: string;
  className?: string;
}

function matchesLike(option: string, query: string): boolean {
  return option.toLowerCase().includes(query.trim().toLowerCase());
}

export function SearchableSelect({
  value,
  onChange,
  options,
  emptyLabel = "— sin categoría —",
  placeholder = "Buscar categoría…",
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    return options.filter((option) => matchesLike(option, q));
  }, [options, query]);

  const showEmptyOption = useMemo(() => {
    const q = query.trim();
    return !q || matchesLike(emptyLabel, q);
  }, [emptyLabel, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery(value);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, value]);

  function openList() {
    setOpen(true);
    setQuery(value);
  }

  function selectOption(option: string) {
    onChange(option);
    setQuery(option);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleBlur() {
    setOpen(false);
    setQuery(value);
  }

  const inputValue = open ? query : value;
  const inputPlaceholder = open ? placeholder : value ? undefined : emptyLabel;

  return (
    <div ref={containerRef} className={className ? `relative ${className}` : "relative"}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        value={inputValue}
        placeholder={inputPlaceholder}
        onFocus={openList}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery(value);
            inputRef.current?.blur();
          }
          if (event.key === "Enter" && open && filtered.length === 1) {
            event.preventDefault();
            selectOption(filtered[0]);
          }
        }}
        onBlur={handleBlur}
        className={INPUT_CLASS}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-card py-1 shadow-lg"
        >
          {showEmptyOption && (
            <li role="option" aria-selected={value === ""}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption("")}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted/40 ${
                  value === "" ? "bg-muted/30 text-muted" : ""
                }`}
              >
                {emptyLabel}
              </button>
            </li>
          )}
          {filtered.map((option) => (
            <li key={option} role="option" aria-selected={value === option}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted/40 ${
                  value === option ? "bg-muted/30 font-medium" : ""
                }`}
              >
                {option}
              </button>
            </li>
          ))}
          {!showEmptyOption && filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">Sin coincidencias</li>
          )}
        </ul>
      )}
    </div>
  );
}
