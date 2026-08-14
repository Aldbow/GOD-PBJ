"use client";

import React from 'react';
import { Wallet, CircleCheckBig, Hourglass, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RingkasanKpi } from '../lib/ringkasanData';
import { fmtInt, fmtPct } from '@/lib/format';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './KpiCards.module.css';

// Format nilai anggaran gaya KPI: "Rp125,8 Miliar".
function fmtRupiahKpi(m: number): string {
  const n = Number(m) || 0;
  const d = (x: number, dec = 1) => x.toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (Math.abs(n) >= 1e12) return `Rp${d(n / 1e12)} Triliun`;
  if (Math.abs(n) >= 1e9) return `Rp${d(n / 1e9)} Miliar`;
  if (Math.abs(n) >= 1e6) return `Rp${d(n / 1e6)} Juta`;
  if (Math.abs(n) >= 1e3) return `Rp${d(n / 1e3, 0)} Ribu`;
  return `Rp${fmtInt(n)}`;
}

// Target realisasi kumulatif per triwulan (persen dari pagu). Dinilai dari
// pctRealisasi dan ditandai pada kolom Sudah Realisasi — kolom yang angkanya
// memang dinilai. Indeks 0 = TW1.
const TARGET_TRIWULAN = [20, 50, 80, 100] as const;

// Triwulan berjalan menurut tanggal saat ini. Halaman Ringkasan tidak punya
// pemilih periode, jadi acuannya kalender.
function triwulanBerjalan(now: Date = new Date()): 1 | 2 | 3 | 4 {
  return (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

type Tone = 'base' | 'good' | 'warn' | 'danger';

/** Satu ukuran di dalam kartu: nilai + persentase pembandingnya. */
interface UkuranData {
  nilai: string;
  /**
   * Kartu acuan memakai 100: barnya penuh dan netral. Bukan sekadar penyelaras
   * tinggi — bar penuh itulah tolok ukur yang membuat dua bar di kartu sebelahnya
   * terbaca sebagai bagian dari keseluruhan, bukan angka yang berdiri sendiri.
   */
  pct: number;
  keterangan: React.ReactNode;
  /** Penanda status target, ditempel di bawah keterangan sebagai badge. */
  badge?: { teks: string; aman: boolean };
}

interface Kolom {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  tooltip: string;
  rupiah: UkuranData;
  paket: UkuranData;
}

/**
 * Bar-nya aria-hidden: ia hanya menggambar ulang persentase yang sudah tertulis
 * sebagai teks tepat di bawahnya, jadi mengumumkannya lagi hanya menggandakan
 * informasi yang sama bagi pengguna pembaca layar.
 */
function Ukuran({ data, size }: { data: UkuranData; size: 'utama' | 'pendamping' }) {
  const utama = size === 'utama';
  return (
    <div className={utama ? styles.blokUtama : styles.blokPendamping}>
      <div className={utama ? styles.nilaiUtama : styles.nilaiPendamping}>{data.nilai}</div>
      <div className={styles.track} aria-hidden="true">
        <div
          className={styles.fill}
          style={{ '--fill': Math.max(0, Math.min(data.pct, 100)) / 100 } as React.CSSProperties}
        />
      </div>
      <div className={styles.keterangan}>{data.keterangan}</div>
      {data.badge && (
        <div>
          <span className={`${styles.badge} ${data.badge.aman ? styles.badgeAman : ''}`}>
            {data.badge.aman ? <CircleCheckBig size={11} /> : <AlertTriangle size={11} />}
            {data.badge.teks}
          </span>
        </div>
      )}
    </div>
  );
}

export function KpiCards({ kpi, loading }: { kpi: RingkasanKpi; loading?: boolean }) {
  if (loading) {
    return (
      <div className={styles.papan}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.kolom}>
            <Skeleton width="52%" height={12} />
            {/* Rangka mengikuti bentuk akhir termasuk barnya, supaya tinggi papan
                tidak melonjak saat data masuk. */}
            <div className={styles.blokUtama}>
              <Skeleton width="78%" height={28} />
              <Skeleton width="100%" height={4} style={{ marginTop: 10 }} />
              <Skeleton width="45%" height={11} style={{ marginTop: 8 }} />
            </div>
            <div className={styles.blokPendamping}>
              <Skeleton width="46%" height={19} />
              <Skeleton width="100%" height={4} style={{ marginTop: 10 }} />
              <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const belumPct = kpi.totalPagu > 0 ? (kpi.belumRealisasi / kpi.totalPagu) * 100 : 0;
  const sudahPaketPct = kpi.totalPaket > 0 ? (kpi.paketSudah / kpi.totalPaket) * 100 : 0;
  const belumPaketPct = kpi.totalPaket > 0 ? (kpi.paketBelum / kpi.totalPaket) * 100 : 0;

  // Triwulan berjalan belum selesai, jadi yang dinilai adalah triwulan terakhir
  // yang sudah tuntas: di TW3 yang dilihat capaian target TW2. Selama TW1 belum
  // ada satu pun triwulan yang selesai pada tahun anggaran berjalan, sehingga
  // belum ada target yang jatuh tempo.
  const triwulan = triwulanBerjalan();
  const triwulanDinilai = triwulan > 1 ? triwulan - 1 : null;
  const targetDinilai = triwulanDinilai !== null ? TARGET_TRIWULAN[triwulanDinilai - 1] : null;
  // Tanpa pagu tidak ada yang bisa dinilai, jadi jangan tandai merah hanya
  // karena filter aktif tidak mengembalikan paket.
  const adaPagu = kpi.totalPagu > 0;
  const dibawahTarget = adaPagu && targetDinilai !== null && kpi.pctRealisasi < targetDinilai;

  const kolom: Kolom[] = [
    {
      key: 'total',
      label: 'Total Anggaran',
      icon: Wallet,
      tone: 'base',
      tooltip:
        'Acuan pembanding: seluruh nilai pagu dan seluruh jumlah paket pengadaan pada cakupan filter aktif.',
      rupiah: { nilai: fmtRupiahKpi(kpi.totalPagu), pct: 100, keterangan: 'Pagu keseluruhan — acuan pembanding' },
      paket: { nilai: `${fmtInt(kpi.totalPaket)} paket`, pct: 100, keterangan: 'Seluruh paket — acuan pembanding' },
    },
    {
      key: 'sudah',
      label: 'Sudah Realisasi',
      icon: dibawahTarget ? AlertTriangle : CircleCheckBig,
      tone: dibawahTarget ? 'danger' : 'good',
      tooltip:
        `Nilai realisasi/kontrak yang sudah terserap dan jumlah paket yang realisasinya lebih dari nol. ` +
        `Target realisasi kumulatif: TW1 20%, TW2 50%, TW3 80%, TW4 100%. ` +
        (targetDinilai === null
          ? `Yang dinilai selalu triwulan terakhir yang sudah selesai; TW1 masih berjalan sehingga belum ada target yang jatuh tempo.`
          : `Yang dinilai triwulan terakhir yang sudah selesai. Kini TW${triwulan} berjalan, jadi acuannya target TW${triwulanDinilai} (${targetDinilai}%). Realisasi saat ini ${fmtPct(kpi.pctRealisasi)}.`),
      rupiah: {
        nilai: fmtRupiahKpi(kpi.totalRealisasi),
        pct: kpi.pctRealisasi,
        keterangan:
          targetDinilai === null
            ? `${fmtPct(kpi.pctRealisasi)} dari pagu · penilaian target mulai TW2`
            : `${fmtPct(kpi.pctRealisasi)} dari pagu`,
        badge:
          targetDinilai !== null && adaPagu
            ? {
                teks: dibawahTarget
                  ? `Di bawah target TW${triwulanDinilai} (${targetDinilai}%)`
                  : `Target TW${triwulanDinilai} (${targetDinilai}%) tercapai`,
                aman: !dibawahTarget,
              }
            : undefined,
      },
      paket: {
        nilai: `${fmtInt(kpi.paketSudah)} paket`,
        pct: sudahPaketPct,
        keterangan: `${fmtPct(sudahPaketPct)} dari total paket`,
      },
    },
    {
      key: 'belum',
      label: 'Belum Realisasi',
      icon: Hourglass,
      tone: 'warn',
      tooltip: 'Sisa pagu yang belum terserap dan jumlah paket yang belum memiliki realisasi.',
      rupiah: {
        nilai: fmtRupiahKpi(kpi.belumRealisasi),
        pct: belumPct,
        keterangan: `${fmtPct(belumPct)} dari pagu`,
      },
      paket: {
        nilai: `${fmtInt(kpi.paketBelum)} paket`,
        pct: belumPaketPct,
        keterangan: `${fmtPct(belumPaketPct)} dari total paket`,
      },
    },
  ];

  return (
    <div className={styles.papan}>
      {kolom.map((k) => {
        const Icon = k.icon;
        return (
          <section key={k.key} className={`${styles.kolom} ${styles[k.tone]}`} aria-label={k.label} title={k.tooltip}>
            <h3 className={styles.label}>
              <Icon size={14} aria-hidden="true" />
              {k.label}
            </h3>
            <Ukuran data={k.rupiah} size="utama" />
            <Ukuran data={k.paket} size="pendamping" />
          </section>
        );
      })}
    </div>
  );
}
