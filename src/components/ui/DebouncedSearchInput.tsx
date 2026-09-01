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
  delay = 180,
  ...rest
}: DebouncedSearchInputProps) {
  const [draft, setDraft] = useState(value);
  /**
   * Cermin `draft` yang selalu mutakhir. React membatch onChange dan onBlur yang
   * terjadi dalam satu interaksi (ketik lalu klik ke luar), jadi `draft` yang
   * tertangkap closure onBlur bisa tertinggal satu huruf; flush harus membaca
   * huruf terakhir, bukan huruf sebelum terakhir.
   */
  const draftRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Nilai-nilai yang sudah dikomit komponen ini tapi belum terlihat kembali
   * lewat prop `value`. Antrean, bukan satu nilai: induk menyalurkan komit lewat
   * state React dan URL, dan gema bisa datang terlambat atau terkoalesi.
   * Mencocokkan hanya dengan komit terakhir membuat gema lama ("a") lolos
   * sebagai perintah induk lalu menimpa draft yang lebih baru ("ab") — itulah
   * yang dulu terlihat sebagai huruf yang terhapus sendiri.
   */
  const pendingRef = useRef<string[]>([]);

  // Induk boleh menyetir ulang kotak ini: tombol back, "Reset Semua Filter",
  // atau tautan yang sudah membawa ?q=. Tapi hanya kalau tidak ada komit kita
  // sendiri yang masih menggantung.
  useEffect(() => {
    const i = pendingRef.current.indexOf(value);
    if (i !== -1) {
      pendingRef.current = pendingRef.current.slice(i + 1);
      return;
    }
    if (pendingRef.current.length > 0) return;
    // Perintah induk yang sungguhan. Komit yang masih menunggu timer sudah tidak
    // relevan; tanpa ini reset filter bisa dianulir timer lama.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    draftRef.current = value;
    setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const commit = (next: string) => {
    timerRef.current = null;
    pendingRef.current.push(next);
    onValueChange(next);
  };

  const handleChange = (next: string) => {
    draftRef.current = next;
    setDraft(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commit(next), delay);
  };

  // Enter dan blur mengangkat nilainya seketika: menunggu jeda setelah pengguna
  // jelas-jelas sudah selesai mengetik hanya terasa seperti aplikasi yang lambat.
  const flush = (next: string = draftRef.current) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // Tanpa timer yang menggantung, nilai ini sudah pernah dikomit — kecuali
    // pemanggilnya memaksakan nilai lain (Escape).
    else if (next === draftRef.current) return;
    commit(next);
  };

  return (
    <SearchInput
      {...rest}
      value={draft}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={(e) => {
        flush();
        rest.onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') flush();
        else if (e.key === 'Escape' && draft) {
          setDraft('');
          flush('');
          draftRef.current = '';
        }
        rest.onKeyDown?.(e);
      }}
    />
  );
}
