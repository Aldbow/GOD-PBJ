import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
  const input = <input id={id} className={`${styles.input} ${className || ''}`} {...props} />;

  if (!label) return input;

  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      {input}
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}
