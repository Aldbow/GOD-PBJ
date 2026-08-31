"use client";

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import styles from './FilterAdvancedCard.module.css';

/**
 * Panel "Filter Lanjutan" yang dipakai seluruh halaman metode realisasi,
 * daftar paket, risiko, dan program prioritas. Sebelumnya tiap halaman
 * menggambar kotaknya sendiri lewat `.advancedPanel` di paketView.module.css.
 */
export function FilterAdvancedCard({
  title = 'Filter Lanjutan',
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="tight" className={styles.card}>
      <Card.Header>
        <Card.Icon tone="neutral"><SlidersHorizontal /></Card.Icon>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Body className={styles.body}>{children}</Card.Body>
    </Card>
  );
}
