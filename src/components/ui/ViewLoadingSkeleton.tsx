import React from 'react';
import { Card } from '@/components/ui/Card';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import styles from './ViewLoadingSkeleton.module.css';

interface ViewLoadingSkeletonProps {
  /** 0 untuk halaman tanpa kartu ringkasan di atas tabel. */
  metricCards?: number;
  tableRows?: number;
  tableColumns?: number;
  className?: string;
}

/** Pengganti standar untuk teks "Memuat data dari Supabase..." di seluruh
 * halaman realisasi (Tender, E-Purchasing, Pengadaan Langsung, dst) — kartu
 * ringkasan + tabel placeholder, bukan teks polos, supaya struktur halaman
 * yang akan muncul sudah terlihat sebelum datanya sendiri sampai. */
export function ViewLoadingSkeleton({
  metricCards = 3,
  tableRows = 6,
  tableColumns = 5,
  className,
}: ViewLoadingSkeletonProps) {
  return (
    <div className={`${styles.stack} ${className || ''}`}>
      <span className={styles.srOnly} role="status">Memuat data...</span>
      {metricCards > 0 && (
        <div className={styles.metricGrid} aria-hidden="true">
          {Array.from({ length: metricCards }).map((_, i) => (
            <Card.Skeleton key={i} lines={2} />
          ))}
        </div>
      )}
      <TableSkeleton rows={tableRows} columns={tableColumns} />
    </div>
  );
}
