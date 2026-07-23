"use client";

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type TooltipItem,
  type Plugin,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MetodeAggregate } from '../../lib/ringkasanData';
import { useIsDark, metodePalette, chartInk, fmtCompactRp } from './chartTheme';
import { fmtInt } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export function MetodeBarChart({ metode }: { metode: MetodeAggregate[] }) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  // Plugin ringan: tulis jumlah paket di ujung tiap bar (relief rule + spec).
  const endLabelPlugin = useMemo<Plugin<'bar'>>(
    () => ({
      id: 'endLabel',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        ctx.save();
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillStyle = ink.tick;
        ctx.textBaseline = 'middle';
        meta.data.forEach((bar, i) => {
          const val = metode[i]?.jumlahPaket ?? 0;
          ctx.textAlign = 'left';
          ctx.fillText(fmtInt(val), bar.x + 6, bar.y);
        });
        ctx.restore();
      },
    }),
    [metode, ink.tick]
  );

  const { data, options } = useMemo(() => {
    const labels = metode.map((m) => m.metode);
    const colors = metodePalette(labels, isDark);
    return {
      data: {
        labels,
        datasets: [
          {
            data: metode.map((m) => m.jumlahPaket),
            backgroundColor: colors,
            borderRadius: 4,
            borderSkipped: false,
            barThickness: 'flex' as const,
            maxBarThickness: 26,
          },
        ],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 34 } },
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
                return [`${fmtInt(m.jumlahPaket)} paket`, `Pagu: ${fmtCompactRp(m.pagu)}`];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: ink.tick, precision: 0 },
            grid: { color: ink.grid },
          },
          y: {
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
    <div className={`${styles.wrap} ${styles.h300}`}>
      <Bar data={data} options={options} plugins={[endLabelPlugin]} />
    </div>
  );
}
