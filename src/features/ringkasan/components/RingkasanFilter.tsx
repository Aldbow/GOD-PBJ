"use client";

import React, { useMemo } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { SearchableSelect } from '@/components/paket/SearchableSelect';
import { Select } from '@/components/ui/Select';
import type { RingkasanFilterValue } from '../lib/ringkasanData';
import { Card } from '@/components/ui/Card';
import styles from './RingkasanFilter.module.css';

interface Props {
  satkerOptions: string[];
  getPpkOptions: (satker: string) => string[];
  getSatkerByPpk?: (ppk: string) => string | undefined;
  tahunOptions: string[];
  defaultTahun: string;
  applied: RingkasanFilterValue;
  onApply: (value: RingkasanFilterValue) => void;
  disabled?: boolean;
}

export function RingkasanFilter({
  satkerOptions,
  getPpkOptions,
  getSatkerByPpk,
  tahunOptions,
  defaultTahun,
  applied,
  onApply,
  disabled,
}: Props) {
  const ppkOptions = useMemo(() => getPpkOptions(applied.satker), [getPpkOptions, applied.satker]);

  const tahunSelectOptions = useMemo(
    () => [{ value: '', label: 'Seluruh Tahun' }, ...tahunOptions.map((t) => ({ value: t, label: t }))],
    [tahunOptions]
  );

  const handleSatker = (v: string) => {
    // PPK bersifat dependent: reset bila tak lagi valid untuk satker baru.
    const ppk = applied.ppk && !getPpkOptions(v).includes(applied.ppk) ? '' : applied.ppk;
    onApply({ ...applied, satker: v, ppk });
  };

  const handlePpk = (v: string) => {
    if (v && !applied.satker && getSatkerByPpk) {
      const satker = getSatkerByPpk(v);
      if (satker) {
        onApply({ ...applied, satker, ppk: v });
        return;
      }
    }
    onApply({ ...applied, ppk: v });
  };

  const handleTahun = (v: string) => onApply({ ...applied, tahun: v });

  const reset = () => onApply({ satker: '', ppk: '', tahun: defaultTahun });
  const bisaReset = Boolean(applied.satker) || Boolean(applied.ppk) || applied.tahun !== defaultTahun;

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

        <div className={`${styles.field} ${styles.fieldTahun}`}>
          <label className={styles.fieldLabel} htmlFor="filter-tahun-anggaran">
            Tahun Anggaran Dana
          </label>
          <Select
            id="filter-tahun-anggaran"
            value={applied.tahun}
            onChange={(e) => handleTahun(e.target.value)}
            options={tahunSelectOptions}
            aria-label="Pilih tahun anggaran dana"
            disabled={disabled || tahunOptions.length === 0}
            className={styles.select}
          />
        </div>

        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.reset}`} onClick={reset} disabled={disabled || !bisaReset}>
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </Card.Body>

      <Card.Footer className={styles.activeInfo}>
        <div>
          Menampilkan data: <b>{applied.satker || 'Semua Satker'}</b>, <b>{applied.ppk || 'Semua PPK'}</b>, pagu{' '}
          <b>{applied.tahun ? `tahun ${applied.tahun}` : 'seluruh tahun'}</b>
        </div>
        <p className={styles.catatanTahun}>
          Paket multi-tahun memecah pagunya per tahun anggaran dana. Realisasi tercatat pada tahun belanjanya
          {defaultTahun ? ` (${defaultTahun})` : ''}, jadi pada tahun berikutnya pagu tampil penuh dengan realisasi nol.
        </p>
      </Card.Footer>
    </Card>
  );
}
