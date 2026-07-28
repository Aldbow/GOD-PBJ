"use client";

import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { JenisAggregate } from '../../lib/ringkasanData';
import { useIsDark, jenisPalette, chartInk, fmtCompactRp } from './chartTheme';
import { fmtInt } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export function JenisDonutChart({ jenis, totalPaket }: { jenis: JenisAggregate[]; totalPaket: number }) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const { data, options } = useMemo(() => {
    const labels = jenis.map((j) => j.jenis);
    const colors = jenisPalette(labels, isDark);
    const total = jenis.reduce((s, j) => s + j.jumlahPaket, 0) || 1;

    return {
      data: {
        labels,
        datasets: [
          {
            data: jenis.map((j) => j.jumlahPaket),
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
                const j = jenis[ctx.dataIndex];
                const pct = ((j.jumlahPaket / total) * 100).toFixed(1).replace('.', ',');
                return [
                  `${fmtInt(j.jumlahPaket)} paket (${pct}%)`,
                  `Pagu: ${fmtCompactRp(j.pagu)}`,
                  `Realisasi: ${fmtCompactRp(j.realisasi)}`,
                ];
              },
            },
          },
        },
      },
    };
  }, [jenis, isDark, ink.surface, ink.tooltipBg]);

  if (jenis.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  const total = jenis.reduce((s, j) => s + j.jumlahPaket, 0) || 1;

  return (
    <div className={styles.donutLayout}>
      <ul className={styles.legendCol}>
        {jenis.map((j) => (
          <li key={j.jenis} className={styles.legendRow}>
            <span className={styles.swatch} style={{ background: jenisPalette([j.jenis], isDark)[0] }} />
            <span className={styles.legendName} title={j.jenis}>{j.jenis}</span>
            <span className={styles.legendCount}>{fmtInt(j.jumlahPaket)}</span>
            <span className={styles.legendPct}>{((j.jumlahPaket / total) * 100).toFixed(1).replace('.', ',')}%</span>
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
