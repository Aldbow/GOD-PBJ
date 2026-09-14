import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './TableSkeleton.module.css';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/** Placeholder tabel data (header + baris), bentuknya meniru Card variant="flush"
 * + PaketTable supaya tidak ada pergeseran layout saat data asli masuk. */
export function TableSkeleton({ rows = 6, columns = 5, className }: TableSkeletonProps) {
  const gridTemplateColumns = `repeat(${columns}, 1fr)`;
  return (
    <Card variant="flush" className={className} aria-hidden="true">
      <div className={styles.header} style={{ gridTemplateColumns }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={10} width={i === 0 ? '70%' : '55%'} />
        ))}
      </div>
      <div className={styles.body}>
        {Array.from({ length: rows }).map((_, r) => (
          <div className={styles.row} key={r} style={{ gridTemplateColumns }}>
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} height={13} width={c === 0 ? '85%' : `${60 - c * 6}%`} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
