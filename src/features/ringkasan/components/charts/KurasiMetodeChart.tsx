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

export function KurasiMetodeChart({ metode }: { metode: MetodeAggregate[] }) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const inkRef = React.useRef(ink);
  inkRef.current = ink;

  const { data, options, plugins } = useMemo(() => {
    const labels = metode.map((m) => m.metode);

    const inlineLabelsPlugin = {
      id: 'inlineLabels',
      afterDraw(chart: any) {
        const { ctx } = chart;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px var(--font-geist-sans), sans-serif';

        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i);
          if (meta.hidden) return;
          meta.data.forEach((element: any, index: number) => {
            const val = dataset.data[index];
            if (val > 0) {
              const width = Math.abs(element.x - element.base);
              // Hanya gambar teks jika lebar batang cukup (minimal 18px)
              if (width > 18) {
                const centerX = (element.x + element.base) / 2;
                const centerY = element.y;
                // Belum Dikurasi (i === 2) warnanya abu-abu terang, jadi pakai ink.valueText. Sisanya putih.
                ctx.fillStyle = i === 2 ? inkRef.current.valueText : '#ffffff';
                ctx.fillText(fmtInt(val), centerX, centerY);
              }
            }
          });
        });
        ctx.restore();
      }
    };

    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Akurat',
            data: metode.map((m) => m.akurat),
            backgroundColor: seriesColor('akurat', isDark),
            borderRadius: 4,
            borderSkipped: false as const,
            maxBarThickness: 22,
            stack: 'k',
          },
          {
            label: 'Perlu Koreksi',
            data: metode.map((m) => m.perluKoreksi),
            backgroundColor: seriesColor('perluKoreksi', isDark),
            borderRadius: 4,
            borderSkipped: false as const,
            maxBarThickness: 22,
            stack: 'k',
          },
          {
            label: 'Belum Dikurasi',
            data: metode.map((m) => m.belumDikurasi),
            backgroundColor: seriesColor('belumKurasi', isDark),
            borderRadius: 4,
            borderSkipped: false as const,
            maxBarThickness: 22,
            stack: 'k',
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
              label: (ctx: TooltipItem<'bar'>) => {
                const m = metode[ctx.dataIndex];
                const val = ctx.datasetIndex === 0 ? m.akurat : ctx.datasetIndex === 1 ? m.perluKoreksi : m.belumDikurasi;
                const pct = m.jumlahPaket > 0 ? (val / m.jumlahPaket) * 100 : 0;
                return `${ctx.dataset.label}: ${fmtInt(val)} paket (${fmtPct(pct)})`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            ticks: { color: ink.tick, precision: 0 },
            grid: { color: ink.grid },
          },
          y: {
            stacked: true,
            ticks: { color: ink.tick, font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
      plugins: [inlineLabelsPlugin]
    };
  }, [metode, isDark, ink.tick, ink.grid, ink.tooltipBg, ink.valueText]);

  if (metode.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  const height = Math.max(160, metode.length * 38 + 20);

  return (
    <div>
      <div className={styles.wrap} style={{ height }}>
        <Bar data={data} options={options} plugins={plugins} />
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: seriesColor('akurat', isDark) }} /> Akurat
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: seriesColor('perluKoreksi', isDark) }} /> Perlu Koreksi
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: seriesColor('belumKurasi', isDark) }} /> Belum Dikurasi
        </span>
      </div>
    </div>
  );
}
