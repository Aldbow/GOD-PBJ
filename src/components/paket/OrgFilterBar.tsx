"use client";

import React, { useMemo } from 'react';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import styles from './OrgFilterBar.module.css';

const UNKNOWN = 'Tidak Diketahui';

interface OrgFilterBarProps {
  data: any[];
  eselon1Field?: string;
  satkerField?: string;
  ppkField?: string;
  eselon1: string | null;
  satker: string | null;
  ppk: string | null;
  search: string;
  onEselon1Change: (value: string | null) => void;
  onSatkerChange: (value: string | null) => void;
  onPpkChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

function uniqueSorted(data: any[], field: string, filterFn: (row: any) => boolean): string[] {
  const set = new Set<string>();
  data.forEach((row) => {
    if (!filterFn(row)) return;
    set.add(row[field] || UNKNOWN);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
}

export function OrgFilterBar({
  data,
  eselon1Field = 'eselon1',
  satkerField = 'satker',
  ppkField = 'nama_ppk',
  eselon1,
  satker,
  ppk,
  search,
  onEselon1Change,
  onSatkerChange,
  onPpkChange,
  onSearchChange,
  searchPlaceholder = 'Cari nama paket, kode RUP, penyedia...',
}: OrgFilterBarProps) {
  const eselon1Options = useMemo(
    () => uniqueSorted(data, eselon1Field, () => true),
    [data, eselon1Field]
  );

  const satkerOptions = useMemo(
    () => uniqueSorted(data, satkerField, (row) => !eselon1 || (row[eselon1Field] || UNKNOWN) === eselon1),
    [data, satkerField, eselon1Field, eselon1]
  );

  const ppkOptions = useMemo(
    () =>
      uniqueSorted(
        data,
        ppkField,
        (row) =>
          (!eselon1 || (row[eselon1Field] || UNKNOWN) === eselon1) &&
          (!satker || (row[satkerField] || UNKNOWN) === satker)
      ),
    [data, ppkField, eselon1Field, satkerField, eselon1, satker]
  );

  return (
    <div className={styles.bar}>
      <Select
        aria-label="Filter Eselon I"
        className={styles.select}
        value={eselon1 ?? ''}
        onChange={(e) => onEselon1Change(e.target.value || null)}
        options={[{ value: '', label: 'Semua Eselon I' }, ...eselon1Options.map((o) => ({ value: o, label: o }))]}
      />
      <Select
        aria-label="Filter Satuan Kerja"
        className={styles.select}
        value={satker ?? ''}
        onChange={(e) => onSatkerChange(e.target.value || null)}
        options={[{ value: '', label: 'Semua Satker' }, ...satkerOptions.map((o) => ({ value: o, label: o }))]}
      />
      <Select
        aria-label="Filter PPK"
        className={styles.select}
        value={ppk ?? ''}
        onChange={(e) => onPpkChange(e.target.value || null)}
        options={[{ value: '', label: 'Semua PPK' }, ...ppkOptions.map((o) => ({ value: o, label: o }))]}
      />
      <SearchInput
        className={styles.search}
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
