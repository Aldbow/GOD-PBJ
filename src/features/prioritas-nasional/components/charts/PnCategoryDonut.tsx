"use client";

import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useIsDark, chartInk } from '@/features/ringkasan/components/charts/chartTheme';
import { fmtInt } from '@/lib/format';
import styles from './PnCategoryDonut.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface PnDonutDatum {
  label: string;
  count: number;
}

interface Props {
  data: PnDonutDatum[];
  getColor: (label: string, isDark: boolean) => string;
  totalLabel?: string;
}

export function PnCategoryDonut({ data, getColor, totalLabel = 'Total Paket' }: Props) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  const { chartData, options } = useMemo(() => {
    const labels = data.map((d) => d.label);
    const colors = labels.map((l) => getColor(l, isDark));
    return {
      chartData: {
        labels,
        datasets: [
          {
            data: data.map((d) => d.count),
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
                const pct = ((d.count / total) * 100).toFixed(1).replace('.', ',');
                return `${fmtInt(d.count)} paket (${pct}%)`;
              },
            },
          },
        },
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, getColor, isDark, ink.surface, ink.tooltipBg, total]);

  if (data.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  return (
    <div className={styles.donutLayout}>
      <ul className={styles.legendCol}>
        {data.map((d) => (
          <li key={d.label} className={styles.legendRow}>
            <span className={styles.swatch} style={{ background: getColor(d.label, isDark) }} />
            <span className={styles.legendName} title={d.label}>{d.label}</span>
            <span className={styles.legendCount}>{fmtInt(d.count)}</span>
            <span className={styles.legendPct}>{((d.count / total) * 100).toFixed(1).replace('.', ',')}%</span>
          </li>
        ))}
      </ul>
      <div className={styles.donutArea}>
        <div className={styles.donutBox}>
          <Doughnut data={chartData} options={options} />
          <div className={styles.donutCenter}>
            <div className={styles.donutTotal}>{fmtInt(total)}</div>
            <div className={styles.donutLabel}>{totalLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
