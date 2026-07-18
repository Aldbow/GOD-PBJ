import React from 'react';
import styles from './SearchInput.module.css';

type SearchInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function SearchInput({ className, type = 'text', ...props }: SearchInputProps) {
  return <input type={type} className={`${styles.search} ${className || ''}`} {...props} />;
}
