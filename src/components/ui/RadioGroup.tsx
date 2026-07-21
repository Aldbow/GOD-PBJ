import React from 'react';
import styles from './RadioGroup.module.css';

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
}

export function RadioGroup({ name, options, value, onChange }: RadioGroupProps) {
  return (
    <div className={styles.group} role="radiogroup">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <label key={opt.value} className={`${styles.option} ${active ? styles.active : ''}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              className={styles.input}
            />
            <span className={styles.dot} />
            <span className={styles.textWrap}>
              <span className={styles.optLabel}>{opt.label}</span>
              {opt.hint && <span className={styles.optHint}>{opt.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
