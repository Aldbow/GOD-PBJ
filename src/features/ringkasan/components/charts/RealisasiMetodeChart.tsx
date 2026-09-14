"use client";

import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MetodeAggregate } from '../../lib/ringkasanData';
import { useIsDark, seriesColor, chartInk, fmtCompactRp } from './chartTheme';
import { fmtInt, fmtPct, fmtRupiah } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type Mode = 'nilai' | 'paket';

export function RealisasiMetodeChart({ metode }: { metode: MetodeAggregate[] }) {
  const isDark = useIsDark();
  const [mode, setMode] = useState<Mode>('nilai');
  const ink = chartInk(isDark);

  const { data, options } = useMemo(() => {
    const labels = metode.map((m) => m.metode);
    const paguColor = seriesColor('pagu', isDark);
    const realisasiColor = seriesColor('realisasi', isDark);

    const datasets =
      mode === 'nilai'
        ? [
            { label: 'Pagu', data: metode.map((m) => m.pagu), backgroundColor: paguColor, borderRadius: 4, borderSkipped: false as const, maxBarThickness: 26 },
            { label: 'Realisasi', data: metode.map((m) => m.realisasi), backgroundColor: realisasiColor, borderRadius: 4, borderSkipped: false as const, maxBarThickness: 26 },
          ]
        : [
            { label: 'Jumlah Paket', data: metode.map((m) => m.jumlahPaket), backgroundColor: realisasiColor, borderRadius: 4, borderSkipped: false as const, maxBarThickness: 34 },
          ];

    return {
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) => metode[items[0].dataIndex]?.metode ?? '',
              label: () => '',
              afterBody: (items: TooltipItem<'bar'>[]) => {
                const m = metode[items[0].dataIndex];
                if (!m) return '';
                return [
                  `Jumlah paket : ${fmtInt(m.jumlahPaket)}`,
                  `Pagu         : ${fmtRupiah(m.pagu)}`,
                  `Realisasi    : ${fmtRupiah(m.realisasi)}`,
                  `Belum        : ${fmtRupiah(m.belum)}`,
                  `% Realisasi  : ${fmtPct(m.pctRealisasi)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: ink.tick, font: { size: 10 }, maxRotation: 30, minRotation: 0 },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: ink.tick,
              precision: 0,
              callback: (v: string | number) => (mode === 'nilai' ? fmtCompactRp(Number(v)) : fmtInt(Number(v))),
            },
            grid: { color: ink.grid },
          },
        },
      },
    };
  }, [metode, isDark, mode, ink.tick, ink.grid, ink.tooltipBg]);

  return (
    <div>
      <div className={styles.toggle} style={{ marginBottom: 14 }}>
        <button className={`${styles.toggleBtn} ${mode === 'nilai' ? styles.toggleActive : ''}`} onClick={() => setMode('nilai')}>
          Berdasarkan Nilai
        </button>
        <button className={`${styles.toggleBtn} ${mode === 'paket' ? styles.toggleActive : ''}`} onClick={() => setMode('paket')}>
          Berdasarkan Jumlah Paket
        </button>
      </div>

      {metode.length === 0 ? (
        <div className={styles.empty}>Tidak ada data untuk filter ini.</div>
      ) : (
        <>
          <div className={`${styles.wrap} ${styles.h320}`}>
            <Bar data={data} options={options} />
          </div>
          {mode === 'nilai' && (
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: seriesColor('pagu', isDark) }} /> Pagu
              </span>
              <span className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: seriesColor('realisasi', isDark) }} /> Realisasi
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
