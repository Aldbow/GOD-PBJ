import React from 'react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  title: React.ReactNode;
  caption?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, caption, action, className }: SectionHeaderProps) {
  return (
    <div className={`${styles.header} ${className || ''}`}>
      <div className={styles.titleWrap}>
        <span className={styles.tick} />
        <p className={styles.title}>{title}</p>
      </div>
      {(caption || action) && (
        <div className={styles.titleWrap}>
          {caption && <span className={styles.caption}>{caption}</span>}
          {action}
        </div>
      )}
    </div>
  );
}
