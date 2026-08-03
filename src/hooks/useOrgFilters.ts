"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useSession } from '@/components/auth/SessionProvider';

export interface OrgFilters {
  eselon1: string | null;
  satker: string | null;
  ppk: string | null;
  /** Kata kunci yang sudah dikomit. Aman dipakai sebagai dependensi penyaringan. */
  search: string;
  setEselon1: (value: string | null) => void;
  setSatker: (value: string | null) => void;
  setPpk: (value: string | null) => void;
  setSearch: (value: string) => void;
  resetAll: () => void;
}

/**
 * Syncs the "filter utama" (Eselon I / Satker / PPK / pencarian) to the URL
 * as independent, optional query params (e1/s/p/q) — cascading (memilih
 * Eselon I mempersempit Satker/PPK) tapi tidak wajib berurutan diisi.
 * Uses router.replace (not push) so filter tweaks don't spam browser history.
 *
 * Soal pencarian: `search` di sini adalah nilai yang SUDAH dikomit, bukan
 * ketikan mentah. Peredaman ketikan dilakukan `DebouncedSearchInput` di ujung
 * pohon, supaya huruf yang sedang diketik tidak pernah sampai ke sini dan tidak
 * memicu render ulang seluruh view.
 */
export function useOrgFilters(): OrgFilters {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { role, ppk_name } = useSession();

  // Role PPK: scope dikunci ke PPK ybs (abaikan filter Eselon/Satker/PPK dari URL).
  const isPpkScoped = role === 'ppk';

  const eselon1 = isPpkScoped ? null : searchParams.get('e1');
  const satker = isPpkScoped ? null : searchParams.get('s');
  const ppk = isPpkScoped ? ppk_name : searchParams.get('p');
  const urlSearch = searchParams.get('q') || '';

  // Sumber kebenaran penyaringan adalah state ini, bukan URL. router.replace
  // menjalankan navigasi client-side di dalam sebuah Transition; kalau hasil
  // pencarian menunggu `q` kembali dari router, setiap pencarian tertahan satu
  // putaran render penuh. Di sini nilainya dikomit seketika dan URL menyusul
  // belakangan, semata supaya tautannya tetap bisa dibagikan.
  const [search, setSearchState] = useState(urlSearch);

  /** Nilai `q` terakhir yang ditulis hook ini sendiri, untuk mengenali gema router. */
  const selfWriteRef = useRef(urlSearch);

  useEffect(() => {
    // Gema dari tulisan sendiri: state sudah memegang nilai itu, jangan disalin
    // ulang. Salinan balik inilah yang dulu menimpa ketikan pengguna.
    if (urlSearch === selfWriteRef.current) return;
    // Navigasi sungguhan — tombol back/forward, atau tautan yang membawa ?q=.
    selfWriteRef.current = urlSearch;
    setSearchState(urlSearch);
  }, [urlSearch]);

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const setEselon1 = (value: string | null) => {
    if (isPpkScoped) return; // scope terkunci
    replaceParams((params) => {
      if (value) params.set('e1', value);
      else params.delete('e1');
      params.delete('s');
      params.delete('p');
    });
  };

  const setSatker = (value: string | null) => {
    if (isPpkScoped) return;
    replaceParams((params) => {
      if (value) params.set('s', value);
      else params.delete('s');
      params.delete('p');
    });
  };

  const setPpk = (value: string | null) => {
    if (isPpkScoped) return;
    replaceParams((params) => {
      if (value) params.set('p', value);
      else params.delete('p');
    });
  };

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      selfWriteRef.current = value;
      replaceParams((params) => {
        if (value) params.set('q', value);
        else params.delete('q');
      });
    },
    [replaceParams]
  );

  const resetAll = () => {
    setSearchState('');
    selfWriteRef.current = '';
    replaceParams((params) => {
      params.delete('e1');
      params.delete('s');
      params.delete('p');
      params.delete('q');
    });
  };

  return { eselon1, satker, ppk, search, setEselon1, setSatker, setPpk, setSearch, resetAll };
}
