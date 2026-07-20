"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import styles from './AuthInput.module.css';

type AuthInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: LucideIcon;
  /** Aktifkan tombol show/hide untuk field password. */
  revealable?: boolean;
};

export function AuthInput({ label, icon: Icon, revealable, id, type = 'text', ...rest }: AuthInputProps) {
  const [reveal, setReveal] = useState(false);
  const inputType = revealable ? (reveal ? 'text' : 'password') : type;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.inputWrap}>
        <Icon size={16} className={styles.leadIcon} aria-hidden />
        <input id={id} type={inputType} className={styles.input} {...rest} />
        {revealable && (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            tabIndex={-1}
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
