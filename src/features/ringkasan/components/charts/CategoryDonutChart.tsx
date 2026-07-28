"use client";

import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useIsDark, chartInk, fmtCompactRp } from './chartTheme';
import { fmtInt } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface CategoryDatum {
  jumlahPaket: number;
  pagu: number;
  realisasi: number;
}

interface Props<T extends CategoryDatum> {
  data: T[];
  getLabel: (item: T) => string;
  getColor: (label: string, isDark: boolean) => string;
  totalPaket: number;
}

export function CategoryDonutChart<T extends CategoryDatum>({ data, getLabel, getColor, totalPaket }: Props<T>) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const { chartData, options } = useMemo(() => {
    const labels = data.map(getLabel);
    const colors = labels.map((l) => getColor(l, isDark));
    const total = data.reduce((s, d) => s + d.jumlahPaket, 0) || 1;

    return {
      chartData: {
        labels,
        datasets: [
          {
            data: data.map((d) => d.jumlahPaket),
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
                const d = data[ctx.dataIndex];
                const pct = ((d.jumlahPaket / total) * 100).toFixed(1).replace('.', ',');
                return [
                  `${fmtInt(d.jumlahPaket)} paket (${pct}%)`,
                  `Pagu: ${fmtCompactRp(d.pagu)}`,
                  `Realisasi: ${fmtCompactRp(d.realisasi)}`,
                ];
              },
            },
          },
        },
      },
    };
  }, [data, getLabel, getColor, isDark, ink.surface, ink.tooltipBg]);

  if (data.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  const total = data.reduce((s, d) => s + d.jumlahPaket, 0) || 1;

  return (
    <div className={styles.donutLayout}>
      <ul className={styles.legendCol}>
        {data.map((d) => {
          const label = getLabel(d);
          return (
            <li key={label} className={styles.legendRow}>
              <span className={styles.swatch} style={{ background: getColor(label, isDark) }} />
              <span className={styles.legendName} title={label}>{label}</span>
              <span className={styles.legendCount}>{fmtInt(d.jumlahPaket)}</span>
              <span className={styles.legendPct}>{((d.jumlahPaket / total) * 100).toFixed(1).replace('.', ',')}%</span>
            </li>
          );
        })}
      </ul>
      <div className={styles.donutArea}>
        <div className={`${styles.wrap} ${styles.donutBox}`}>
          <Doughnut data={chartData} options={options} />
          <div className={styles.donutCenter}>
            <div className={styles.donutTotal}>{fmtInt(totalPaket)}</div>
            <div className={styles.donutLabel}>Total Paket</div>
          </div>
        </div>
      </div>
    </div>
  );
}
