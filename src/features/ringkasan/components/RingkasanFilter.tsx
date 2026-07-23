"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Filter, RotateCcw, Check } from 'lucide-react';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import type { RingkasanFilterValue } from '../lib/ringkasanData';
import styles from './RingkasanFilter.module.css';

interface Props {
  satkerOptions: string[];
  getPpkOptions: (satker: string) => string[];
  applied: RingkasanFilterValue;
  onApply: (value: RingkasanFilterValue) => void;
  disabled?: boolean;
}

export function RingkasanFilter({ satkerOptions, getPpkOptions, applied, onApply, disabled }: Props) {
  const [pendingSatker, setPendingSatker] = useState(applied.satker);
  const [pendingPpk, setPendingPpk] = useState(applied.ppk);

  // Sinkronkan pending bila applied berubah dari luar (mis. setelah refresh data).
  useEffect(() => {
    setPendingSatker(applied.satker);
    setPendingPpk(applied.ppk);
  }, [applied.satker, applied.ppk]);

  const ppkOptions = useMemo(() => getPpkOptions(pendingSatker), [getPpkOptions, pendingSatker]);

  const handleSatker = (v: string) => {
    setPendingSatker(v);
    // PPK bersifat dependent: reset bila tak lagi valid untuk satker baru.
    setPendingPpk((prev) => (prev && !getPpkOptions(v).includes(prev) ? '' : prev));
  };

  const dirty = pendingSatker !== applied.satker || pendingPpk !== applied.ppk;

  const apply = () => onApply({ satker: pendingSatker, ppk: pendingPpk });
  const reset = () => {
    setPendingSatker('');
    setPendingPpk('');
    onApply({ satker: '', ppk: '' });
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span className={styles.iconLabel}>
          <Filter size={15} /> Filter
        </span>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Satuan Kerja</label>
          <SearchableSelect
            value={pendingSatker}
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
            value={pendingPpk}
            onChange={setPendingPpk}
            options={ppkOptions}
            placeholder="Semua PPK"
            ariaLabel="Pilih PPK"
            className={styles.select}
          />
        </div>

        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.apply}`} onClick={apply} disabled={disabled || !dirty}>
            <Check size={15} /> Terapkan Filter
          </button>
          <button className={`${styles.btn} ${styles.reset}`} onClick={reset} disabled={disabled || (!applied.satker && !applied.ppk && !dirty)}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      <p className={styles.activeInfo}>
        Menampilkan data: <b>{applied.satker || 'Semua Satker'}</b> — <b>{applied.ppk || 'Semua PPK'}</b>
      </p>
    </div>
  );
}
