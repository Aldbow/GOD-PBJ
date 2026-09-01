"use client";

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { replaceQueryParams } from '@/lib/urlParams';

/** Identitas stabil untuk keadaan "tidak ada filter". */
const KOSONG: string[] = [];

/**
 * Filter pill yang nilainya hidup di URL, bukan di useState lokal.
 *
 * Ini yang membuat sebuah halaman bisa DITUJU dengan filternya sudah menyala —
 * mis. klik "Dikecualikan" di Ringkasan membuka /pengadaan-langsung?m=Dikecualikan
 * dengan pill Metode sudah aktif. Dengan useState biasa, nilai awalnya selalu
 * kosong dan pengguna harus memfilter ulang sendiri di halaman tujuan.
 *
 * Menulis lewat `replaceQueryParams` (history.replaceState), sama seperti
 * useOrgFilters: mengubah filter bukan perpindahan halaman, jadi jangan
 * memenuhi riwayat browser dan jangan memicu permintaan RSC untuk segmen yang
 * sama. Kontrak param dijaga terpisah dari useOrgFilters (e1/s/p/q) supaya
 * keduanya bisa aktif bersamaan di satu URL tanpa saling menimpa.
 */
export function useUrlPillFilter(param: string): [string[], (next: string[]) => void] {
  const searchParams = useSearchParams();

  const raw = searchParams.get(param) ?? '';

  // Identitas array dijaga stabil selama teksnya di URL tidak berubah. Nilai ini
  // dipakai sebagai dependensi useMemo penyaringan di halaman pemakainya; array
  // baru tiap render akan memaksa ribuan baris disaring ulang tanpa alasan.
  const selected = useMemo(() => (raw ? raw.split(',').filter(Boolean) : KOSONG), [raw]);

  const setSelected = useCallback(
    (next: string[]) => {
      replaceQueryParams((params) => {
        if (next.length > 0) params.set(param, next.join(','));
        else params.delete(param);
      });
    },
    [param]
  );

  return [selected, setSelected];
}
