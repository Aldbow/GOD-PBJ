"use client";

import React from 'react';
import { Clock3 } from 'lucide-react';
import styles from './LastUpdatePill.module.css';
import { pecahBagianUpdate } from '@/lib/data-update/format';

/**
 * Pil di topbar berisi tanggal, bulan, tahun, dan jam saat data terakhir masuk
 * database — pasangan absolut dari teks relatif <DataFreshness /> di kirinya.
 *
 * Dua penunjuk untuk satu waktu memang disengaja dan bukan pengulangan sia-sia:
 * "3 jam lalu" menjawab "masih segar atau tidak" dalam sekali lirik, sedangkan
 * "8 Sep 2026, 14.00 WIB" yang bisa disalin ke nota dinas. Angka yang sama,
 * dua pertanyaan berbeda.
 *
 * Sumbernya `finished_at` dari data_update_log, diteruskan dari server lewat
 * AppLayout -> Shell -> Topbar. Nilainya WIB, sudah pasti, tidak bergantung
 * pada "sekarang" — jadi pil ini aman dirender di server dan langsung tampil
 * pada cat pertama, tanpa menunggu hydration seperti teks relatifnya.
 */
export function LastUpdatePill({ finishedAt }: { finishedAt: string | null }) {
  if (!finishedAt) return null;

  const w = pecahBagianUpdate(finishedAt);
  if (!w) return null;

  // Dipakai dua kali: untuk pembaca layar, dan sebagai tooltip. Di layar
  // sempit sebagian isi pil dilepas (tahun, label, "WIB"), jadi keterangan
  // utuhnya harus tetap ada di suatu tempat yang bisa dijangkau.
  const keterangan =
    'Data terakhir diperbarui ' +
    w.hari + ' ' + w.bulan + ' ' + w.tahun + ', pukul ' +
    w.jam + '.' + w.menit + ' WIB';

  return (
    <div
      className={styles.pil}
      role="group"
      aria-label={keterangan}
      title={keterangan}
    >
      <span className={styles.ikonWadah} aria-hidden="true">
        <Clock3 size={13} className={styles.ikon} />
      </span>

      <span className={styles.label} aria-hidden="true">Data per</span>

      <span className={styles.tanggal} aria-hidden="true">
        <span className={styles.hari}>{w.hari}</span>
        <span className={styles.bulan}>{w.bulan}</span>
        <span className={styles.tahun}>{w.tahun}</span>
      </span>

      <span className={styles.pemisah} aria-hidden="true" />

      <span className={styles.jam} aria-hidden="true">
        {w.jam}
        <span className={styles.titikDua}>.</span>
        {w.menit}
      </span>

      <span className={styles.zona} aria-hidden="true">WIB</span>
    </div>
  );
}
