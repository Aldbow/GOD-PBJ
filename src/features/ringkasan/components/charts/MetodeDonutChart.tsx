"use client";

import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { MetodeAggregate } from '../../lib/ringkasanData';
import { useIsDark, metodePalette, chartInk, fmtCompactRp } from './chartTheme';
import { fmtInt } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export function MetodeDonutChart({ metode, totalPaket }: { metode: MetodeAggregate[]; totalPaket: number }) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const { data, options } = useMemo(() => {
    const labels = metode.map((m) => m.metode);
    const colors = metodePalette(labels, isDark);
    const total = metode.reduce((s, m) => s + m.jumlahPaket, 0) || 1;

    return {
      data: {
        labels,
        datasets: [
          {
            data: metode.map((m) => m.jumlahPaket),
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
        cutout: '64%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                const m = metode[ctx.dataIndex];
                const pct = ((m.jumlahPaket / total) * 100).toFixed(1).replace('.', ',');
                return [
                  `${fmtInt(m.jumlahPaket)} paket (${pct}%)`,
                  `Pagu: ${fmtCompactRp(m.pagu)}`,
                  `Realisasi: ${fmtCompactRp(m.realisasi)}`,
                ];
              },
            },
          },
        },
      },
    };
  }, [metode, isDark, ink.surface, ink.tooltipBg]);

  if (metode.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  const total = metode.reduce((s, m) => s + m.jumlahPaket, 0) || 1;

  return (
    <div className={styles.donutLayout}>
      <ul className={styles.legendCol}>
        {metode.map((m) => (
          <li key={m.metode} className={styles.legendRow}>
            <span className={styles.swatch} style={{ background: metodePalette([m.metode], isDark)[0] }} />
            <span className={styles.legendName} title={m.metode}>{m.metode}</span>
            <span className={styles.legendCount}>{fmtInt(m.jumlahPaket)}</span>
            <span className={styles.legendPct}>{((m.jumlahPaket / total) * 100).toFixed(1).replace('.', ',')}%</span>
          </li>
        ))}
      </ul>
      <div className={styles.donutArea}>
        <div className={`${styles.wrap} ${styles.donutBox}`}>
          <Doughnut data={data} options={options} />
          <div className={styles.donutCenter}>
            <div className={styles.donutTotal}>{fmtInt(totalPaket)}</div>
            <div className={styles.donutLabel}>Total Paket</div>
          </div>
        </div>
      </div>
    </div>
  );
}
