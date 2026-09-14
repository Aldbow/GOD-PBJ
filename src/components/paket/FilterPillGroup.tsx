"use client";

import React from 'react';
import styles from './Filters.module.css';

export interface PillOption {
  value: string;
  label: string;
}

interface FilterPillGroupProps {
  options: PillOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  multi?: boolean;
}

export function FilterPillGroup({ options, selected, onChange, multi = true }: FilterPillGroupProps) {
  const toggle = (value: string) => {
    if (multi) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange(selected.includes(value) ? [] : [value]);
    }
  };

  return (
    <div className={styles.group}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`${styles.pill} ${selected.includes(opt.value) ? styles.active : ''}`}
          onClick={() => toggle(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
