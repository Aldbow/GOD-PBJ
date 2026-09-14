import React from 'react';
import styles from './ErrorBox.module.css';

export function ErrorBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`${styles.errorBox} ${className || ''}`}>{children}</div>;
}
