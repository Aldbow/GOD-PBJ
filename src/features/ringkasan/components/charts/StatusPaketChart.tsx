"use client";

import React, { useMemo } from 'react';
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
import { useIsDark, seriesColor, chartInk } from './chartTheme';
import { fmtInt, fmtPct } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export function StatusPaketChart({ metode }: { metode: MetodeAggregate[] }) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const { data, options } = useMemo(() => {
    const labels = metode.map((m) => m.metode);
    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Sudah realisasi',
            data: metode.map((m) => m.paketSudah),
            backgroundColor: seriesColor('sudah', isDark),
            borderRadius: 4,
            borderSkipped: false as const,
            maxBarThickness: 34,
            stack: 's',
          },
          {
            label: 'Belum realisasi',
            data: metode.map((m) => m.paketBelum),
            backgroundColor: seriesColor('belum', isDark),
            borderRadius: 4,
            borderSkipped: false as const,
            maxBarThickness: 34,
            stack: 's',
          },
        ],
      },
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
              label: (ctx: TooltipItem<'bar'>) => {
                const m = metode[ctx.dataIndex];
                const val = ctx.datasetIndex === 0 ? m.paketSudah : m.paketBelum;
                const pct = m.jumlahPaket > 0 ? (val / m.jumlahPaket) * 100 : 0;
                return `${ctx.dataset.label}: ${fmtInt(val)} paket (${fmtPct(pct)})`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: ink.tick, font: { size: 10 }, maxRotation: 30 },
            grid: { display: false },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: ink.tick, precision: 0 },
            grid: { color: ink.grid },
          },
        },
      },
    };
  }, [metode, isDark, ink.tick, ink.grid, ink.tooltipBg]);

  if (metode.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  return (
    <div>
      <div className={`${styles.wrap} ${styles.h300}`}>
        <Bar data={data} options={options} />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: seriesColor('sudah', isDark) }} /> Sudah realisasi
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: seriesColor('belum', isDark) }} /> Belum realisasi
        </span>
      </div>
    </div>
  );
}
