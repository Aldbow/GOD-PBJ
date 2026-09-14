"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './SearchableSelect.module.css';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * A dropdown that is also a search field: click to browse the full list,
 * type to filter it. Used for Eselon I / Satker / PPK filters, where the
 * option list can be long enough that a plain <select> is hard to scan.
 */
export function SearchableSelect({ value, onChange, options, placeholder, ariaLabel, className }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(null);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const displayValue = query !== null ? query : value;
  const totalRows = filtered.length + 1; // +1 accounts for the "Semua ..." row

  const commit = (v: string) => {
    onChange(v);
    setQuery(null);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, totalRows - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight === 0) commit('');
      else commit(filtered[highlight - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(null);
    }
  };

  return (
    <div className={`${styles.root} ${className || ''}`} ref={rootRef}>
      <div className={styles.control}>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={styles.input}
          placeholder={placeholder}
          value={displayValue}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onClick={(e) => {
            setOpen(true);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
      </div>
      {open && (
        <ul className={styles.menu} role="listbox">
          <li
            role="option"
            aria-selected={!value}
            className={`${styles.option} ${highlight === 0 ? styles.optionActive : ''} ${!value ? styles.optionSelected : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              commit('');
            }}
            onMouseEnter={() => setHighlight(0)}
          >
            {placeholder}
          </li>
          {filtered.length === 0 ? (
            <li className={styles.empty}>Tidak ditemukan</li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt}
                role="option"
                aria-selected={value === opt}
                className={`${styles.option} ${highlight === i + 1 ? styles.optionActive : ''} ${value === opt ? styles.optionSelected : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(opt);
                }}
                onMouseEnter={() => setHighlight(i + 1)}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
