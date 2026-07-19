"use client";

import { useEffect, useRef, useState } from "react";
import {
  displayToIso,
  formatPartialDisplay,
  isoToDisplay,
} from "@/lib/date-input";

interface DateInputProps {
  /** ISO date `YYYY-MM-DD` (or empty). */
  value: string;
  /** Emits ISO `YYYY-MM-DD` (or empty string). */
  onChange: (iso: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

/**
 * Date field that shows día/mes/año (DD/MM/YYYY) and emits ISO for the API.
 * Includes a native calendar picker as a secondary affordance.
 */
export function DateInput({
  value,
  onChange,
  className,
  id,
  disabled,
  "aria-invalid": ariaInvalid,
}: DateInputProps) {
  const [text, setText] = useState(() => isoToDisplay(value));
  const pickerRef = useRef<HTMLInputElement>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return;
    setText(isoToDisplay(value));
  }, [value]);

  function emitIfComplete(display: string) {
    const iso = displayToIso(display);
    if (iso !== null && iso !== "") onChange(iso);
  }

  function commit() {
    const iso = displayToIso(text);
    if (iso === null) {
      setText(isoToDisplay(value));
      return;
    }
    onChange(iso);
    setText(iso === "" ? "" : isoToDisplay(iso));
  }

  function openPicker() {
    const el = pickerRef.current;
    if (!el || disabled) return;
    try {
      el.showPicker();
    } catch {
      el.click();
    }
  }

  return (
    <div className="relative flex min-w-0 items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        value={text}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => {
          const next = formatPartialDisplay(e.target.value);
          setText(next);
          emitIfComplete(next);
        }}
        onBlur={() => {
          focusedRef.current = false;
          commit();
        }}
        className={`min-w-0 flex-1 ${className ?? ""}`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        aria-label="Abrir calendario"
        onClick={openPicker}
        className="shrink-0 rounded-md border border-border bg-card px-1.5 py-1.5 text-muted hover:text-foreground focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
      >
        <CalendarIcon />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
        onChange={(e) => {
          const iso = e.target.value;
          onChange(iso);
          setText(isoToDisplay(iso));
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
