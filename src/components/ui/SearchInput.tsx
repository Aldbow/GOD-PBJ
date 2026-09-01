import React from 'react';
import styles from './SearchInput.module.css';

type SearchInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function SearchInput({ className, type = 'text', ...props }: SearchInputProps) {
  return (
    <input
      type={type}
      // Saran autofill dan garis merah pemeriksa ejaan melayang di atas kotak
      // pencarian dan menutupi hasilnya; keduanya tidak berguna untuk nama paket.
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      className={`${styles.search} ${className || ''}`}
      {...props}
    />
  );
}
