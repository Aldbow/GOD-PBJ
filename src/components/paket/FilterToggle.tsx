"use client";

import React from 'react';
import styles from './Filters.module.css';

interface FilterToggleProps {
  label: string;
  activeLabel?: string;
  active: boolean;
  onChange: (value: boolean) => void;
}

export function FilterToggle({ label, activeLabel, active, onChange }: FilterToggleProps) {
  return (
    <button
      type="button"
      className={`${styles.pill} ${active ? styles.active : ''}`}
      onClick={() => onChange(!active)}
    >
      {active && activeLabel ? activeLabel : label}
    </button>
  );
}
