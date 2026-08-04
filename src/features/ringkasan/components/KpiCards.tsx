"use client";

import React from 'react';
import { Wallet, TrendingUp, Hourglass, Package, CircleCheckBig, Clock, AlertTriangle } from 'lucide-react';
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
// pctRealisasi dan ditandai pada kartu Total Realisasi — kartu yang angkanya
// memang dinilai. Indeks 0 = TW1.
const TARGET_TRIWULAN = [20, 50, 80, 100] as const;

// Triwulan berjalan menurut tanggal saat ini. Halaman Ringkasan tidak punya
// pemilih periode, jadi acuannya kalender.
function triwulanBerjalan(now: Date = new Date()): 1 | 2 | 3 | 4 {
  return (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

type Variant = 'brand' | 'good' | 'warn' | 'neutral' | 'danger';

interface KpiItem {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  hint: React.ReactNode;
  progress?: number;
  variant: Variant;
  tooltip: string;
}

export function KpiCards({ kpi, loading }: { kpi: RingkasanKpi; loading?: boolean }) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.card}>
            <Skeleton width="55%" height={12} />
            <Skeleton width="75%" height={26} style={{ marginTop: 12 }} />
            <Skeleton width="40%" height={11} style={{ marginTop: 10 }} />
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

  const items: KpiItem[] = [
    {
      key: 'pagu',
      label: 'Total Pagu',
      value: fmtRupiahKpi(kpi.totalPagu),
      icon: Wallet,
      hint: 'Total anggaran pengadaan',
      variant: 'brand',
      tooltip: 'Jumlah seluruh nilai pagu anggaran paket pengadaan pada cakupan filter aktif.',
    },
    {
      key: 'realisasi',
      label: 'Total Realisasi',
      value: fmtRupiahKpi(kpi.totalRealisasi),
      icon: dibawahTarget ? AlertTriangle : TrendingUp,
      hint: (
        <>
          {fmtPct(kpi.pctRealisasi)} dari pagu
          {targetDinilai === null ? (
            <> · penilaian target mulai TW2</>
          ) : (
            adaPagu && (
              <>
                {' · '}
                <span className={styles.flag}>
                  {dibawahTarget
                    ? `di bawah target TW${triwulanDinilai} (${targetDinilai}%)`
                    : `target TW${triwulanDinilai} (${targetDinilai}%) tercapai`}
                </span>
              </>
            )
          )}
        </>
      ),
      progress: kpi.pctRealisasi,
      variant: dibawahTarget ? 'danger' : 'good',
      tooltip:
        `Total nilai realisasi/kontrak yang sudah terserap dibanding pagu. ` +
        `Target realisasi kumulatif: TW1 20%, TW2 50%, TW3 80%, TW4 100%. ` +
        (targetDinilai === null
          ? `Yang dinilai selalu triwulan terakhir yang sudah selesai; TW1 masih berjalan sehingga belum ada target yang jatuh tempo.`
          : `Yang dinilai triwulan terakhir yang sudah selesai. Kini TW${triwulan} berjalan, jadi acuannya target TW${triwulanDinilai} (${targetDinilai}%). Realisasi saat ini ${fmtPct(kpi.pctRealisasi)}.`),
    },
    {
      key: 'belum',
      label: 'Belum Realisasi',
      value: fmtRupiahKpi(kpi.belumRealisasi),
      icon: Hourglass,
      hint: `${fmtPct(belumPct)} dari pagu`,
      progress: belumPct,
      variant: 'warn',
      tooltip: 'Selisih pagu dikurangi realisasi, yaitu anggaran yang belum terserap.',
    },
    {
      key: 'totalPaket',
      label: 'Total Paket',
      value: `${fmtInt(kpi.totalPaket)} Paket`,
      icon: Package,
      hint: 'Seluruh paket pengadaan',
      variant: 'neutral',
      tooltip: 'Jumlah seluruh paket pengadaan pada cakupan filter aktif.',
    },
    {
      key: 'paketSudah',
      label: 'Paket Sudah Realisasi',
      value: `${fmtInt(kpi.paketSudah)} Paket`,
      icon: CircleCheckBig,
      hint: `${fmtPct(sudahPaketPct)} dari total`,
      progress: sudahPaketPct,
      variant: 'good',
      tooltip: 'Paket dengan nilai realisasi lebih dari nol.',
    },
    {
      key: 'paketBelum',
      label: 'Paket Belum Realisasi',
      value: `${fmtInt(kpi.paketBelum)} Paket`,
      icon: Clock,
      hint: `${fmtPct(belumPaketPct)} dari total`,
      progress: belumPaketPct,
      variant: 'warn',
      tooltip: 'Paket yang belum memiliki realisasi.',
    },
  ];

  return (
    <div className={styles.grid}>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.key} className={`${styles.card} ${styles[it.variant]}`} title={it.tooltip}>
            <div className={styles.top}>
              <span className={styles.label}>{it.label}</span>
              <span className={styles.icon}>
                <Icon size={16} />
              </span>
            </div>
            <div className={styles.value}>{it.value}</div>
            {it.progress !== undefined && (
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{ '--fill': Math.max(0, Math.min(it.progress, 100)) / 100 } as React.CSSProperties}
                />
              </div>
            )}
            <div className={styles.hint}>{it.hint}</div>
          </div>
        );
      })}
    </div>
  );
}
