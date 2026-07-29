"use client";

import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, BarElement, Tooltip, type TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useIsDark, chartInk, fmtCompactRp, riskBarColor, riskPalette } from './riskChartTheme';
import { fmtInt } from '@/lib/format';
import type { GroupedBucket } from '@/lib/risiko/aggregate';
import styles from '@/features/ringkasan/components/charts/charts.module.css';

ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, Tooltip);

const OTHER_LABEL = 'Lainnya';

/** Lipat sisa kategori ke bucket "Lainnya" ketika jumlah kategori melebihi maxBars — mengikuti
 * aturan dataviz skill "9th series folds into Other", diterapkan ke jumlah BAR (bukan hue) karena
 * chart ini satu-warna: kardinalitas tinggi (mis. puluhan satker) tetap harus dibatasi supaya
 * chart tetap terbaca, bukan soal warna habis. */
function foldTopN(buckets: GroupedBucket[], maxBars: number): GroupedBucket[] {
  if (buckets.length <= maxBars) return buckets;
  const top = buckets.slice(0, maxBars - 1);
  const rest = buckets.slice(maxBars - 1);
  const other: GroupedBucket = {
    label: OTHER_LABEL,
    count: rest.reduce((s, b) => s + b.count, 0),
    pagu: rest.reduce((s, b) => s + b.pagu, 0),
  };
  return [...top, other];
}

interface Props {
  data: GroupedBucket[];
  maxBars?: number;
  height?: number | string;
  vertical?: boolean;
  multicolor?: boolean;
}

// Chart distribusi generik dipakai berulang untuk berbagai dimensi (satker, PPK, metode, jenis
// pengadaan, sumber dana, tipe swakelola, main risk driver) — SATU seri nominal-kategorikal per
// pemanggilan, jadi seluruh bar memakai warna yang SAMA (identitas dibawa label sumbu-Y, bukan
// warna) per aturan dataviz skill; tidak butuh legend (judul section sudah menyebut dimensinya).
export function RisikoDistribusiBarChart({ data, maxBars = 8, height = '100%', vertical = false, multicolor = false }: Props) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const buckets = useMemo(() => foldTopN(data, maxBars), [data, maxBars]);
  const singleColor = riskBarColor(isDark);
  const palette = riskPalette(isDark);

  const { chartData, options } = useMemo(
    () => ({
      chartData: {
        labels: buckets.map((b) => b.label),
        datasets: [
          {
            data: buckets.map((b) => b.count),
            backgroundColor: multicolor ? buckets.map((_, i) => palette[i % palette.length]) : singleColor,
            borderRadius: vertical ? 6 : 6,
            borderSkipped: false,
            barThickness: 'flex' as const,
            maxBarThickness: vertical ? 48 : 80, // Bar horizontal lebih besar
          },
        ],
      },
      options: {
        indexAxis: (vertical ? 'x' : 'y') as 'x' | 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: vertical ? { top: 20 } : { right: 16 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => {
                const b = buckets[ctx.dataIndex];
                return [`${fmtInt(b.count)} paket`, `Pagu: ${fmtCompactRp(b.pagu)}`];
              },
            },
          },
        },
        scales: {
          x: {
            type: (vertical ? 'linear' : 'logarithmic') as 'linear' | 'logarithmic',
            beginAtZero: true,
            ticks: vertical
              ? {
                  color: ink.tick,
                  font: { size: 11 },
                  maxRotation: 30,
                  minRotation: 0,
                }
              : { 
                  color: ink.tick, 
                  precision: 0,
                  maxTicksLimit: 5,
                  callback: (value: number | string) => {
                    const num = Number(value);
                    if (num === 1 || num === 10 || num === 100 || num === 1000 || num === 10000) {
                      return fmtInt(num);
                    }
                    return null;
                  }
                },
            grid: vertical ? { display: false } : { color: ink.grid },
          },
          y: {
            beginAtZero: true,
            ticks: vertical
              ? { color: ink.tick, precision: 0 }
              : { color: ink.tick, font: { size: 12 } },
            grid: vertical ? { color: ink.grid } : { display: false },
          },
        },
      },
    }),
    [buckets, singleColor, palette, ink.tick, ink.grid, ink.tooltipBg, ink.tooltipText, vertical, multicolor]
  );

  if (data.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
