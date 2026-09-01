"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from '@/components/auth/SessionProvider';
import { replaceQueryParams } from '@/lib/urlParams';

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
 * Jeda antara kata kunci dikomit dan `?q=` ikut diperbarui. Menyalin kata kunci
 * ke URL cuma melayani satu hal: tautannya bisa dibagikan. Itu tidak perlu
 * terjadi secepat penyaringannya, dan menaruhnya di jalur ketikan berarti tiap
 * pencarian menunggu satu putaran router. Jadi hasil pencarian muncul dari state
 * seketika, dan URL menyusul setelah pengguna benar-benar berhenti.
 */
const URL_SYNC_DELAY = 500;

/**
 * Syncs the "filter utama" (Eselon I / Satker / PPK / pencarian) to the URL
 * as independent, optional query params (e1/s/p/q) — cascading (memilih
 * Eselon I mempersempit Satker/PPK) tapi tidak wajib berurutan diisi.
 *
 * URL ditulis lewat `replaceQueryParams` (history.replaceState), bukan
 * router.replace: semua filter di sini disaring di klien, tidak ada satu pun
 * Server Component yang membaca searchParams, jadi navigasi Next hanya menambah
 * satu Transition (dan berpotensi satu permintaan RSC) tanpa mengubah apa pun
 * yang dirender server.
 *
 * Soal pencarian: `search` di sini adalah nilai yang SUDAH dikomit, bukan
 * ketikan mentah. Peredaman ketikan dilakukan `DebouncedSearchInput` di ujung
 * pohon, supaya huruf yang sedang diketik tidak pernah sampai ke sini dan tidak
 * memicu render ulang seluruh view.
 */
export function useOrgFilters(): OrgFilters {
  const searchParams = useSearchParams();
  const { role, satker: profileSatker } = useSession();

  // Role PPK: scope dikunci ke satkernya, tapi masih bisa memfilter PPK di satkernya.
  const isPpkScoped = role === 'ppk';

  const eselon1 = isPpkScoped ? null : searchParams.get('e1');
  const satker = isPpkScoped ? profileSatker : searchParams.get('s');
  const ppk = searchParams.get('p');
  const urlSearch = searchParams.get('q') || '';

  // Sumber kebenaran penyaringan adalah state ini, bukan URL.
  const [search, setSearchState] = useState(urlSearch);

  /** Penulisan `?q=` yang masih dijadwalkan; selama ada, state lebih baru dari URL. */
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Nilai `q` yang sudah kita tulis sendiri tapi belum terlihat kembali lewat
   * useSearchParams. Antrean, bukan satu nilai: router menyalurkan perubahan URL
   * lewat sebuah Transition, jadi gema bisa datang terlambat, terkoalesi, atau
   * lewat render antara. Mencocokkannya dengan "tulisan terakhir" saja membuat
   * gema lama ("a") lolos sebagai navigasi sungguhan lalu menimpa kata kunci
   * yang lebih baru ("ab") — persis gejala huruf yang terhapus sendiri.
   */
  const pendingEchoesRef = useRef<string[]>([]);

  useEffect(() => {
    const i = pendingEchoesRef.current.indexOf(urlSearch);
    if (i !== -1) {
      // Gema dari tulisan sendiri. Buang antrean sampai gema ini, termasuk
      // gema-gema lebih lama yang terlewat karena terkoalesi.
      pendingEchoesRef.current = pendingEchoesRef.current.slice(i + 1);
      return;
    }
    // Masih ada tulisan sendiri yang menggantung — di timer atau di router.
    // Apa pun yang datang sekarang lebih tua dari state kita.
    if (pendingEchoesRef.current.length > 0 || urlSyncTimerRef.current) return;
    // Navigasi sungguhan — tombol back/forward, atau tautan yang membawa ?q=.
    setSearchState(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    return () => {
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, []);

  const writeSearchToUrl = useCallback((value: string) => {
    pendingEchoesRef.current.push(value);
    replaceQueryParams((params) => {
      if (value) params.set('q', value);
      else params.delete('q');
    });
  }, []);

  const cancelPendingUrlSync = () => {
    if (!urlSyncTimerRef.current) return;
    clearTimeout(urlSyncTimerRef.current);
    urlSyncTimerRef.current = null;
  };

  const setEselon1 = useCallback(
    (value: string | null) => {
      if (isPpkScoped) return; // scope terkunci
      replaceQueryParams((params) => {
        if (value) params.set('e1', value);
        else params.delete('e1');
        params.delete('s');
        params.delete('p');
      });
    },
    [isPpkScoped]
  );

  const setSatker = useCallback(
    (value: string | null) => {
      if (isPpkScoped) return;
      replaceQueryParams((params) => {
        if (value) params.set('s', value);
        else params.delete('s');
        params.delete('p');
      });
    },
    [isPpkScoped]
  );

  const setPpk = useCallback((value: string | null) => {
    replaceQueryParams((params) => {
      if (value) params.set('p', value);
      else params.delete('p');
    });
  }, []);

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      cancelPendingUrlSync();
      urlSyncTimerRef.current = setTimeout(() => {
        urlSyncTimerRef.current = null;
        writeSearchToUrl(value);
      }, URL_SYNC_DELAY);
    },
    [writeSearchToUrl]
  );

  const resetAll = useCallback(() => {
    setSearchState('');
    // Penulisan `q` yang terjadwal memegang kata kunci lama; membiarkannya
    // menyala setelah reset akan menghidupkan kembali filter yang baru dibuang.
    cancelPendingUrlSync();
    pendingEchoesRef.current.push('');
    replaceQueryParams((params) => {
      params.delete('e1');
      params.delete('s');
      params.delete('p');
      params.delete('q');
    });
  }, []);

  return { eselon1, satker, ppk, search, setEselon1, setSatker, setPpk, setSearch, resetAll };
}
