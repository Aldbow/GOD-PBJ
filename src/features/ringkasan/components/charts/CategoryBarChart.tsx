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
  type ScriptableContext,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useIsDark, chartInk, fmtCompactRp } from './chartTheme';
import { fmtInt } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export interface CategoryBarDatum {
  jumlahPaket: number;
  pagu: number;
  realisasi: number;
  belum: number;
  pctRealisasi: number;
  paketSudah: number;
  paketBelum: number;
}

interface Props<T extends CategoryBarDatum> {
  data: T[];
  getLabel: (item: T) => string;
  getColor: (label: string, isDark: boolean) => string;
  mode?: 'keuangan' | 'paket';
}

function adjustHex(hex: string, amount: number): string {
  if (!hex.startsWith('#')) return hex;
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + Math.round(255 * amount);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * amount);
  let b = (num & 0x0000ff) + Math.round(255 * amount);

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#')) return hex;
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function CategoryBarChart<T extends CategoryBarDatum>({ data, getLabel, getColor, mode = 'keuangan' }: Props<T>) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const dataRef = React.useRef(data);
  const getLabelRef = React.useRef(getLabel);
  const modeRef = React.useRef(mode);
  const inkRef = React.useRef(ink);

  // Update refs secara sinkron agar plugin (yang dipanggil saat draw) selalu punya data terbaru
  dataRef.current = data;
  getLabelRef.current = getLabel;
  modeRef.current = mode;
  inkRef.current = ink;

  const endLabelPlugin = useMemo<Plugin<'bar'>>(
    () => ({
      id: 'endLabel',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta0 = chart.getDatasetMeta(0);
        const meta1 = chart.getDatasetMeta(1);
        ctx.save();
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textBaseline = 'middle';

        meta1.data.forEach((bar1, i) => {
          const d = dataRef.current[i];
          const currentMode = modeRef.current;
          if (!d) return;

          let pct = 0;
          let valText = '';

          if (currentMode === 'keuangan') {
            pct = d.pctRealisasi;
            valText = fmtCompactRp(d.realisasi);
          } else {
            pct = d.jumlahPaket > 0 ? (d.paketSudah / d.jumlahPaket) * 100 : 0;
            valText = fmtInt(d.paketSudah) + ' pkt';
          }

          const pctText = pct.toFixed(1).replace('.', ',') + '%';

          ctx.textAlign = 'left';
          ctx.fillStyle = inkRef.current.valueText;
          ctx.fillText(pctText, bar1.x + 6, bar1.y);

          const bar0 = meta0.data[i];
          if (pct > 85) {
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(valText, bar0.x - 6, bar0.y);
          } else if (pct >= 0) {
            ctx.textAlign = 'left';
            ctx.fillStyle = inkRef.current.valueText;
            ctx.fillText(valText, bar0.x + 6, bar0.y);
          }
        });
        ctx.restore();
      },
    }),
    []
  );

  const { chartData, options } = useMemo(() => {
    const labels = data.map(getLabel);
    const colors = labels.map((l) => getColor(l, isDark));

    let dataSudah: number[] = [];
    let dataBelum: number[] = [];

    if (mode === 'keuangan') {
      dataSudah = data.map((d) => Math.min(100, d.pctRealisasi));
      dataBelum = data.map((d) => Math.max(0, 100 - d.pctRealisasi));
    } else {
      dataSudah = data.map((d) => Math.min(100, d.jumlahPaket > 0 ? (d.paketSudah / d.jumlahPaket) * 100 : 0));
      dataBelum = data.map((d) => Math.max(0, 100 - (d.jumlahPaket > 0 ? (d.paketSudah / d.jumlahPaket) * 100 : 0)));
    }

    const bgRealisasi = (ctx: ScriptableContext<'bar'>) => {
      const { chartArea, ctx: canvasCtx } = ctx.chart;
      if (!chartArea) return colors[ctx.dataIndex];
      const baseColor = colors[ctx.dataIndex];
      const gradient = canvasCtx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, adjustHex(baseColor, 0.35));
      return gradient;
    };

    const bgSisa = (ctx: ScriptableContext<'bar'>) => {
      const { chartArea, ctx: canvasCtx } = ctx.chart;
      if (!chartArea) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      const baseColor = colors[ctx.dataIndex];
      const gradient = canvasCtx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
      gradient.addColorStop(0, hexToRgba(adjustHex(baseColor, isDark ? -0.4 : -0.2), 0.4));
      gradient.addColorStop(1, hexToRgba(adjustHex(baseColor, isDark ? -0.7 : -0.4), 0.1));
      return gradient;
    };

    return {
      chartData: {
        labels,
        datasets: [
          {
            label: 'Realisasi',
            data: dataSudah,
            backgroundColor: bgRealisasi,
            borderRadius: 4,
            borderSkipped: false,
            barThickness: 'flex' as const,
            maxBarThickness: 26,
          },
          {
            label: mode === 'keuangan' ? 'Sisa Pagu' : 'Belum Realisasi',
            data: dataBelum,
            backgroundColor: bgSisa,
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
        layout: { padding: { right: 70 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => {
                const d = data[ctx.dataIndex];
                const isRealized = ctx.datasetIndex === 0;

                if (mode === 'keuangan') {
                  return [
                    isRealized
                      ? `Realisasi: ${fmtCompactRp(d.realisasi)} (${d.pctRealisasi.toFixed(1).replace('.', ',')}%)`
                      : `Sisa Pagu: ${fmtCompactRp(d.belum)}`,
                    `Total Pagu: ${fmtCompactRp(d.pagu)}`,
                    `${fmtInt(d.jumlahPaket)} paket`
                  ];
                } else {
                  const count = isRealized ? d.paketSudah : d.paketBelum;
                  const pct = isRealized
                    ? (d.jumlahPaket > 0 ? (d.paketSudah / d.jumlahPaket * 100) : 0)
                    : (d.jumlahPaket > 0 ? (d.paketBelum / d.jumlahPaket * 100) : 0);
                  const labelName = isRealized ? 'Sudah Terealisasi' : 'Belum Terealisasi';
                  return [
                    `${labelName}: ${fmtInt(count)} paket (${pct.toFixed(1).replace('.', ',')}%)`,
                    isRealized ? `Realisasi: ${fmtCompactRp(d.realisasi)}` : `Pagu Tersisa: ${fmtCompactRp(d.belum)}`
                  ];
                }
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            min: 0,
            max: 100,
            ticks: {
              color: ink.tick,
              precision: 0,
              callback: function(value: string | number) {
                return value + '%';
              }
            },
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
  }, [data, getLabel, getColor, mode, isDark, ink.tick, ink.grid, ink.tooltipBg]);

  if (data.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  return (
    <div className={`${styles.wrap} ${styles.h300}`}>
      <Bar data={chartData} options={options} plugins={[endLabelPlugin]} />
    </div>
  );
}
