"use client";

import React, { useMemo } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import type { RingkasanFilterValue } from '../lib/ringkasanData';
import { Card } from '@/components/ui/Card';
import styles from './RingkasanFilter.module.css';

interface Props {
  satkerOptions: string[];
  getPpkOptions: (satker: string) => string[];
  getSatkerByPpk?: (ppk: string) => string | undefined;
  applied: RingkasanFilterValue;
  onApply: (value: RingkasanFilterValue) => void;
  disabled?: boolean;
}

export function RingkasanFilter({ satkerOptions, getPpkOptions, getSatkerByPpk, applied, onApply, disabled }: Props) {
  const ppkOptions = useMemo(() => getPpkOptions(applied.satker), [getPpkOptions, applied.satker]);

  const handleSatker = (v: string) => {
    // PPK bersifat dependent: reset bila tak lagi valid untuk satker baru.
    const ppk = applied.ppk && !getPpkOptions(v).includes(applied.ppk) ? '' : applied.ppk;
    onApply({ satker: v, ppk });
  };

  const handlePpk = (v: string) => {
    if (v && !applied.satker && getSatkerByPpk) {
      const satker = getSatkerByPpk(v);
      if (satker) {
        onApply({ satker, ppk: v });
        return;
      }
    }
    onApply({ satker: applied.satker, ppk: v });
  };

  const reset = () => onApply({ satker: '', ppk: '' });

  return (
    <Card padding="tight" className={styles.wrap}>
      <Card.Header className={styles.head}>
        <Card.Icon tone="neutral"><Filter /></Card.Icon>
        <Card.Title>Filter Data</Card.Title>
      </Card.Header>
      <Card.Body className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Satuan Kerja</label>
          <SearchableSelect
            value={applied.satker}
            onChange={handleSatker}
            options={satkerOptions}
            placeholder="Semua Satker"
            ariaLabel="Pilih Satuan Kerja"
            className={styles.select}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>PPK</label>
          <SearchableSelect
            value={applied.ppk}
            onChange={handlePpk}
            options={ppkOptions}
            placeholder="Semua PPK"
            ariaLabel="Pilih PPK"
            className={styles.select}
          />
        </div>

        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.reset}`} onClick={reset} disabled={disabled || (!applied.satker && !applied.ppk)}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </Card.Body>

      <Card.Footer className={styles.activeInfo}>
        Menampilkan data: <b>{applied.satker || 'Semua Satker'}</b> — <b>{applied.ppk || 'Semua PPK'}</b>
      </Card.Footer>
    </Card>
  );
}
