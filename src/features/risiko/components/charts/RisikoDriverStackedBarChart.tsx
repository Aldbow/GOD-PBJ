"use client";

import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, type TooltipItem, Legend, type Plugin } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useIsDark, chartInk, riskKategoriColor } from './riskChartTheme';
import { fmtInt } from '@/lib/format';
import { type RiskKategori, RISK_KATEGORI_LABEL } from '@/lib/risiko/types';
import styles from '@/features/ringkasan/components/charts/charts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface StackedBucket {
  label: string;
  totalCount: number;
  counts: Record<RiskKategori, number>;
}

interface Props {
  data: StackedBucket[];
  maxBars?: number;
  height?: number | string;
  onClick?: (driverLabel: string) => void;
}

const KATEGORI_ORDER: RiskKategori[] = ['TINGGI', 'SEDANG', 'RENDAH', 'DATA_TIDAK_LENGKAP'];

export function RisikoDriverStackedBarChart({ data, maxBars = 8, height = '100%', onClick }: Props) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const buckets = useMemo(() => {
    if (data.length <= maxBars) return data;
    const top = data.slice(0, maxBars - 1);
    const rest = data.slice(maxBars - 1);
    
    const other: StackedBucket = {
      label: 'Lainnya',
      totalCount: rest.reduce((s, b) => s + b.totalCount, 0),
      counts: {
        TINGGI: rest.reduce((s, b) => s + b.counts.TINGGI, 0),
        SEDANG: rest.reduce((s, b) => s + b.counts.SEDANG, 0),
        RENDAH: rest.reduce((s, b) => s + b.counts.RENDAH, 0),
        DATA_TIDAK_LENGKAP: rest.reduce((s, b) => s + b.counts.DATA_TIDAK_LENGKAP, 0),
      }
    };
    return [...top, other];
  }, [data, maxBars]);

  // Plugin: menampilkan total paket di ujung kanan setiap bar
  const totalLabelPlugin: Plugin<'bar'> = useMemo(() => ({
    id: 'totalLabel',
    afterDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(chart.data.datasets.length - 1);
      if (!meta?.data) return;

      ctx.save();
      ctx.font = 'bold 11px var(--font-geist-sans), sans-serif';
      ctx.fillStyle = ink.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < buckets.length; i++) {
        // Cari ujung kanan bar terakhir (dataset paling atas yang visible) untuk baris ini
        let maxX = 0;
        let barY = 0;
        for (let dsIdx = chart.data.datasets.length - 1; dsIdx >= 0; dsIdx--) {
          const dsMeta = chart.getDatasetMeta(dsIdx);
          if (!dsMeta.hidden && dsMeta.data[i]) {
            const bar = dsMeta.data[i];
            const x = (bar as any).x ?? 0;
            if (x > maxX) {
              maxX = x;
              barY = (bar as any).y ?? 0;
            }
          }
        }
        if (maxX > 0) {
          ctx.fillText(fmtInt(buckets[i].totalCount) + ' paket', maxX + 8, barY);
        }
      }
      ctx.restore();
    },
  }), [buckets, ink.text]);

  const { chartData, options } = useMemo(
    () => ({
      chartData: {
        labels: buckets.map((b) => b.label),
        datasets: KATEGORI_ORDER.map((kat) => ({
          label: RISK_KATEGORI_LABEL[kat],
          data: buckets.map((b) => b.totalCount === 0 ? 0 : (b.counts[kat] / b.totalCount) * 100),
          backgroundColor: riskKategoriColor(kat, isDark),
          borderRadius: 4,
          borderSkipped: false,
          barThickness: 'flex' as const,
          maxBarThickness: 40,
        })).filter(ds => ds.data.some(v => v > 0)),
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 100 } }, // ruang untuk label total di kanan
        onHover: (event: any, chartElement: any) => {
          if (onClick && event.native?.target) {
            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
          }
        },
        onClick: (event: any, chartElement: any) => {
          if (!onClick || !chartElement.length) return;
          const idx = chartElement[0].index;
          onClick(buckets[idx].label);
        },
        plugins: {
          legend: { 
            display: true,
            position: 'bottom' as const,
            labels: {
              color: ink.text,
              usePointStyle: true,
              boxWidth: 8,
              padding: 20,
              font: { size: 11, family: 'var(--font-geist-sans)' }
            }
          },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => {
                const b = buckets[ctx.dataIndex];
                const pct = (ctx.raw as number).toFixed(1).replace('.', ',');
                const dsLabel = ctx.dataset.label;
                const kat = KATEGORI_ORDER.find(k => RISK_KATEGORI_LABEL[k] === dsLabel);
                const count = kat ? b.counts[kat] : 0;
                return `${dsLabel}: ${fmtInt(count)} paket (${pct}%)`;
              },
              footer: (items: TooltipItem<'bar'>[]) => {
                const idx = items[0].dataIndex;
                return `Total: ${fmtInt(buckets[idx].totalCount)} paket`;
              }
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            type: 'linear' as const,
            beginAtZero: true,
            max: 100,
            ticks: { 
              color: ink.tick, 
              precision: 0,
              maxTicksLimit: 5,
              callback: (value: any) => `${value}%`,
            },
            grid: { color: ink.grid, tickLength: 0 },
            border: { display: false },
          },
          y: {
            stacked: true,
            ticks: {
              color: ink.text,
              font: { size: 12 },
              callback: function (val: any) {
                return buckets[val].label;
              },
            },
            grid: { display: false },
            border: { display: false },
          },
        },
      },
    }),
    [buckets, isDark, ink]
  );

  if (buckets.length === 0) {
    return <div className={styles.empty}>Belum ada data risiko.</div>;
  }

  return (
    <div style={{ height, width: '100%' }}>
      <Bar data={chartData} options={options} plugins={[totalLabelPlugin]} />
    </div>
  );
}
