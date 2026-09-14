"use client";

import React, { useMemo, useRef } from 'react';
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
  counts: Record<string, number>;
  /** Label asli yang dilipat ke bucket ini (dipakai bucket "Lainnya" hasil folding). Bucket normal tidak perlu mengisi ini. */
  members?: string[];
}

interface Props {
  data: StackedBucket[];
  maxBars?: number;
  height?: number | string;
  onClick?: (driverLabel: string, members: string[], segmentKey?: string) => void;
  segmentKeys?: string[];
  segmentLabels?: Record<string, string>;
  segmentColors?: (key: string, isDark: boolean) => string;
}

const KATEGORI_ORDER: RiskKategori[] = ['TINGGI', 'SEDANG', 'RENDAH', 'DATA_TIDAK_LENGKAP'];

export function RisikoDriverStackedBarChart({ 
  data, 
  maxBars = 8, 
  height = '100%', 
  onClick,
  segmentKeys = KATEGORI_ORDER,
  segmentLabels = RISK_KATEGORI_LABEL,
  segmentColors = (k: string, isDark: boolean) => riskKategoriColor(k as RiskKategori, isDark)
}: Props) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const buckets = useMemo(() => {
    if (data.length <= maxBars) return data;
    const top = data.slice(0, maxBars - 1);
    const rest = data.slice(maxBars - 1);
    
    const otherCounts: Record<string, number> = {};
    for (const key of segmentKeys) {
      otherCounts[key] = rest.reduce((s, b) => s + (b.counts[key] || 0), 0);
    }

    const other: StackedBucket = {
      label: 'Lainnya',
      totalCount: rest.reduce((s, b) => s + b.totalCount, 0),
      counts: otherCounts,
      members: rest.map((b) => b.label),
    };
    return [...top, other];
  }, [data, maxBars, segmentKeys]);

  // react-chartjs-2 hanya memakai prop `plugins` sekali saat chart pertama kali dibuat
  // (lihat renderChart() di node_modules/react-chartjs-2) — instance plugin yang
  // ter-registrasi tidak diganti lagi walau `totalLabelPlugin` di-memo ulang tiap render.
  // Makanya closure-nya harus baca dari ref (bukan langsung dari `buckets`/`ink`), supaya
  // angka "X paket" di ujung kanan tetap ikut ter-update tiap kali chart di-redraw
  // (mis. setelah filter/klik bar mengubah data).
  const bucketsRef = useRef(buckets);
  bucketsRef.current = buckets;
  const inkRef = useRef(ink);
  inkRef.current = ink;

  // Plugin: menampilkan total paket di ujung kanan setiap bar
  const totalLabelPlugin: Plugin<'bar'> = useMemo(() => ({
    id: 'totalLabel',
    afterDraw(chart) {
      const { ctx } = chart;
      const currentBuckets = bucketsRef.current;
      const meta = chart.getDatasetMeta(chart.data.datasets.length - 1);
      if (!meta?.data) return;

      ctx.save();
      ctx.font = 'bold 11px var(--font-geist-sans), sans-serif';
      ctx.fillStyle = inkRef.current.valueText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < currentBuckets.length; i++) {
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
          ctx.fillText(fmtInt(currentBuckets[i].totalCount) + ' paket', maxX + 8, barY);
        }
      }
      ctx.restore();
    },
  }), []);

  const { chartData, options } = useMemo(
    () => ({
      chartData: {
        labels: buckets.map((b) => b.label),
        datasets: segmentKeys.map((key) => ({
          label: segmentLabels[key] || key,
          data: buckets.map((b) => b.totalCount === 0 ? 0 : ((b.counts[key] || 0) / b.totalCount) * 100),
          backgroundColor: segmentColors(key, isDark),
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
        onClick: (event: any, chartElement: any, chartInstance: any) => {
          if (!onClick || !chartElement.length) return;
          const el = chartElement[0];
          const bucket = buckets[el.index];
          const dsLabel = chartInstance?.data?.datasets?.[el.datasetIndex]?.label;
          const segmentKey = segmentKeys.find((k) => (segmentLabels[k] || k) === dsLabel);
          onClick(bucket.label, bucket.members && bucket.members.length > 0 ? bucket.members : [bucket.label], segmentKey);
        },
        plugins: {
          legend: { 
            display: true,
            position: 'bottom' as const,
            labels: {
              color: ink.valueText,
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
                const key = segmentKeys.find(k => (segmentLabels[k] || k) === dsLabel);
                const count = key ? (b.counts[key] || 0) : 0;
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
              color: ink.valueText,
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
