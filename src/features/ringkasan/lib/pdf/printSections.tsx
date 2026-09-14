"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import type { PrintSections } from './types';

/**
 * Papan terbit untuk seksi yang memuat datanya sendiri.
 *
 * Sebagian besar isi Cetak Laporan berasal dari `RingkasanAggregate` yang sudah
 * dipegang RingkasanView. Dua seksi tidak: ITKP dan Risiko Pengadaan memuat &
 * menghitung datanya sendiri di dalam komponennya. Ada tiga jalan, dan yang
 * dipilih di sini yang ketiga:
 *
 *  a. Angkat kedua pemuatan itu ke RingkasanView — perombakan besar pada dua
 *     komponen yang tidak sedang bermasalah.
 *  b. Ambil ulang datanya saat mencetak — cetakan bisa berbeda dari layar bila
 *     datanya berubah di antara keduanya, dan menambah bulak-balik jaringan.
 *  c. Biarkan tiap seksi tetap memiliki datanya, tapi MENERBITKAN ringkasan
 *     cetaknya ke papan ini.
 *
 * Konsekuensi (c) yang penting: cetakan dijamin memuat angka yang sama persis
 * dengan yang sedang dibaca di layar, tanpa memindahkan kepemilikan data.
 *
 * Papan ini sengaja memakai ref, bukan state: penerbitan tidak boleh memicu
 * render ulang RingkasanView — pembaca satu-satunya adalah penangan tombol
 * Cetak, yang membaca nilainya saat ditekan.
 */

export interface PrintSectionsStore {
  read(): PrintSections;
  publish<K extends keyof PrintSections>(key: K, value: PrintSections[K]): void;
}

const EMPTY: PrintSections = { itkp: null, risiko: null };

const PrintSectionsContext = createContext<PrintSectionsStore | null>(null);

/** Dipakai RingkasanView: membuat papan sekaligus membaca isinya saat mencetak. */
export function usePrintSectionsStore(): PrintSectionsStore {
  const ref = useRef<PrintSections>(EMPTY);
  return useMemo<PrintSectionsStore>(
    () => ({
      read: () => ref.current,
      publish: (key, value) => {
        ref.current = { ...ref.current, [key]: value };
      },
    }),
    []
  );
}

export function PrintSectionsProvider({
  store,
  children,
}: {
  store: PrintSectionsStore;
  children: React.ReactNode;
}) {
  return <PrintSectionsContext.Provider value={store}>{children}</PrintSectionsContext.Provider>;
}

/**
 * Terbitkan ringkasan cetak satu seksi. Aman dipanggil di luar provider —
 * komponennya tetap bisa dipakai di halaman lain yang tidak punya tombol Cetak.
 *
 * `value` sebaiknya di-memo pemanggil; kalau tidak, efek ini jalan tiap render
 * (murah — hanya penugasan ref, tanpa render ulang).
 */
export function usePublishPrintSection<K extends keyof PrintSections>(key: K, value: PrintSections[K]): void {
  const store = useContext(PrintSectionsContext);
  useEffect(() => {
    if (!store) return;
    store.publish(key, value);
    // Seksi yang tidak lagi terpasang (mis. karena filter) tidak boleh
    // meninggalkan angka basi yang ikut tercetak.
    return () => store.publish(key, null as PrintSections[K]);
  }, [store, key, value]);
}
