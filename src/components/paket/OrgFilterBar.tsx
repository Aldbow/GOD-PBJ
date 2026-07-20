"use client";

import React, { useMemo } from 'react';
import { SearchInput } from '@/components/ui/SearchInput';
import { SearchableSelect } from './SearchableSelect';
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
      <SearchableSelect
        ariaLabel="Filter Eselon I"
        className={styles.select}
        value={eselon1 ?? ''}
        onChange={(v) => onEselon1Change(v || null)}
        options={eselon1Options}
        placeholder="Semua Eselon I"
      />
      <SearchableSelect
        ariaLabel="Filter Satuan Kerja"
        className={styles.select}
        value={satker ?? ''}
        onChange={(v) => onSatkerChange(v || null)}
        options={satkerOptions}
        placeholder="Semua Satker"
      />
      <SearchableSelect
        ariaLabel="Filter PPK"
        className={styles.select}
        value={ppk ?? ''}
        onChange={(v) => onPpkChange(v || null)}
        options={ppkOptions}
        placeholder="Semua PPK"
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
