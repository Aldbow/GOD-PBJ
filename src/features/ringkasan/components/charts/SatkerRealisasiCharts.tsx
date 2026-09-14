"use client";

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  type TooltipItem,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { MetodeAggregate } from '../../lib/ringkasanData';
import { useIsDark, chartInk, metodePalette, fmtCompactRp } from './chartTheme';
import { fmtPct, fmtRupiah } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// 1. Donut Chart (Proporsi Realisasi Rupiah)
export function RealisasiDonutChart({ metode }: { metode: MetodeAggregate[] }) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const { data, options, totalRealisasi } = useMemo(() => {
    // Hanya tampilkan metode yang ada realisasinya
    const active = metode.filter((m) => m.realisasi > 0);
    const labels = active.map((m) => m.metode);
    const colors = metodePalette(labels, isDark);
    const totalRealisasi = active.reduce((s, m) => s + m.realisasi, 0) || 1;

    return {
      totalRealisasi,
      data: {
        labels,
        datasets: [
          {
            data: active.map((m) => m.realisasi),
            backgroundColor: colors,
            borderColor: ink.surface,
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                const val = ctx.raw as number;
                const pct = ((val / totalRealisasi) * 100).toFixed(1).replace('.', ',');
                return `${fmtCompactRp(val)} (${pct}%)`;
              },
            },
          },
        },
      },
    };
  }, [metode, isDark, ink.surface, ink.tooltipBg]);

  if (metode.length === 0 || totalRealisasi <= 1) {
    return <div className={styles.empty} style={{ height: 200 }}>Belum ada realisasi.</div>;
  }

  return (
    <div style={{ position: 'relative', height: '240px', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Doughnut data={data} options={options} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {fmtCompactRp(totalRealisasi)}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Realisasi</div>
      </div>
    </div>
  );
}

// 2. Stacked Bar Chart (Realisasi vs Sisa Pagu)
export function RealisasiStackedBarChart({ metode }: { metode: MetodeAggregate[] }) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const { data, options } = useMemo(() => {
    // Urutkan berdasarkan pagu terbesar
    const sorted = [...metode].sort((a, b) => b.pagu - a.pagu).filter(m => m.pagu > 0);
    const labels = sorted.map((m) => m.metode);
    const realisasiColors = metodePalette(labels, isDark);
    
    // Warna untuk Sisa Pagu (transparan / redup)
    const sisaColors = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Realisasi',
            data: sorted.map((m) => m.realisasi),
            backgroundColor: realisasiColors,
            borderRadius: 4,
            barThickness: 16,
          },
          {
            label: 'Sisa Anggaran',
            data: sorted.map((m) => m.belum),
            backgroundColor: sisaColors,
            borderRadius: 4,
            barThickness: 16,
          },
        ],
      },
      options: {
        indexAxis: 'y' as const,
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
              afterBody: (items: TooltipItem<'bar'>[]) => {
                const m = sorted[items[0].dataIndex];
                if (!m) return '';
                return [
                  `Pagu: ${fmtRupiah(m.pagu)}`,
                  `Realisasi: ${fmtRupiah(m.realisasi)}`,
                  `Sisa: ${fmtRupiah(m.belum)}`,
                  `% Capaian: ${fmtPct(m.pctRealisasi)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: ink.tick, callback: (v: any) => fmtCompactRp(v) },
            grid: { color: ink.grid },
          },
          y: {
            stacked: true,
            ticks: { color: ink.tick, font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    };
  }, [metode, isDark, ink.tick, ink.grid, ink.tooltipBg]);

  if (metode.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  return (
    <div style={{ height: Math.max(metode.length * 40, 200), width: '100%' }}>
      <Bar data={data} options={options} />
    </div>
  );
}
