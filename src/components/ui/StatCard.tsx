import React from 'react';
import styles from './StatCard.module.css';
import { Card } from './Card';

export type StatTone = 'default' | 'good' | 'warn' | 'danger';

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  hint?: React.ReactNode;
  tone?: StatTone;
  className?: string;
}

const hintClass: Record<StatTone, string> = {
  default: '',
  good: styles.hintGood,
  warn: styles.hintWarn,
  danger: styles.hintDanger,
};

export function StatCard({ label, value, unit, hint, tone = 'default', className }: StatCardProps) {
  return (
    <Card
      variant={tone === 'danger' ? 'danger' : 'default'}
      className={`${styles.card} ${styles[tone]} ${className || ''}`}
    >
      <p className={styles.label}>{label}</p>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {hint && <p className={`${styles.hint} ${hintClass[tone]}`}>{hint}</p>}
    </Card>
  );
}
