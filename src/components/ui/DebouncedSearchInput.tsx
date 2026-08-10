"use client";

import React, { useEffect, useRef, useState } from 'react';
import { SearchInput } from './SearchInput';

type DebouncedSearchInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> & {
  /** Nilai yang sudah dikomit — datang dari URL atau state induk, bukan per ketikan. */
  value: string;
  /** Dipanggil sekali setelah ketikan mengendap selama `delay`. */
  onValueChange: (value: string) => void;
  /** Jeda sebelum nilai diangkat ke induk. */
  delay?: number;
};

/**
 * Kotak pencarian yang memegang ketikan mentahnya sendiri dan baru mengangkat
 * nilainya ke induk setelah pengguna berhenti mengetik.
 *
 * Ini bukan sekadar optimasi. Sebelumnya nilai mentah tinggal di `useOrgFilters`
 * di puncak view, jadi satu huruf me-render ulang seluruh dasbor — kartu metrik,
 * panel anomali, tiga dropdown, dan tabel — lalu menyaring ulang ribuan baris.
 * Dengan draft terkurung di daun ini, mengetik cuma menyentuh satu <input>.
 */
export function DebouncedSearchInput({
  value,
  onValueChange,
  delay = 250,
  ...rest
}: DebouncedSearchInputProps) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Nilai terakhir yang diangkat komponen ini sendiri, untuk mengenali gema induk. */
  const committedRef = useRef(value);

  // Induk boleh menyetir ulang kotak ini: tombol back, "Reset Semua Filter",
  // atau tautan yang sudah membawa ?q=. Tapi gema dari komit kita sendiri wajib
  // diabaikan — menyalinnya kembali ke draft akan menimpa huruf yang terlanjur
  // diketik selama navigasi berjalan, dan itulah yang dulu terasa seperti
  // karakter hilang dan kursor melompat.
  useEffect(() => {
    if (value === committedRef.current) return;
    // Komit yang masih menggantung sudah tidak relevan begitu induk memaksakan
    // nilai lain; tanpa ini reset filter bisa dianulir timer lama.
    if (timerRef.current) clearTimeout(timerRef.current);
    committedRef.current = value;
    setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (next: string) => {
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      committedRef.current = next;
      onValueChange(next);
    }, delay);
  };

  return (
    <SearchInput
      {...rest}
      value={draft}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
}
