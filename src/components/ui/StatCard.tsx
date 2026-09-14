import React from 'react';
import styles from './StatCard.module.css';
import { Card, type CardTone } from './Card';

export type StatTone = 'default' | 'good' | 'warn' | 'danger';

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  hint?: React.ReactNode;
  /** Ikon lucide untuk Card.Icon — satu-satunya tempat rona kartu muncul. */
  icon?: React.ReactNode;
  tone?: StatTone;
  className?: string;
  /** Kartu bisa diklik: aktifkan hover-lift. */
  interactive?: boolean;
}

const hintClass: Record<StatTone, string> = {
  default: '',
  good: styles.hintGood,
  warn: styles.hintWarn,
  danger: styles.hintDanger,
};

const TINT: Record<StatTone, CardTone> = {
  default: 'neutral',
  good: 'positive',
  warn: 'warning',
  danger: 'risk',
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = 'default',
  className,
  interactive = false,
}: StatCardProps) {
  return (
    <Card
      padding="tight"
      interactive={interactive}
      className={`${styles.card} ${styles[tone]} ${className || ''}`}
    >
      <Card.Header>
        {icon && <Card.Icon tone={TINT[tone]}>{icon}</Card.Icon>}
        <Card.Label>{label}</Card.Label>
      </Card.Header>
      <Card.Body className={styles.body}>
        <div className={styles.valueRow}>
          <span className={styles.value}>{value}</span>
          {unit && <span className={styles.unit}>{unit}</span>}
        </div>
        {hint && <p className={`${styles.hint} ${hintClass[tone]}`}>{hint}</p>}
      </Card.Body>
    </Card>
  );
}
