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
import type { MetodeAggregate } from '../../lib/ringkasanData';
import { useIsDark, metodePalette, chartInk, fmtCompactRp } from './chartTheme';
import { fmtInt } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

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

export function MetodeBarChart({ metode, mode = 'keuangan' }: { metode: MetodeAggregate[], mode?: 'keuangan' | 'paket' }) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const metodeRef = React.useRef(metode);
  const modeRef = React.useRef(mode);
  React.useEffect(() => {
    metodeRef.current = metode;
    modeRef.current = mode;
  }, [metode, mode]);

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
          const m = metodeRef.current[i];
          const currentMode = modeRef.current;
          if (!m) return;
          
          let pct = 0;
          let valText = '';

          if (currentMode === 'keuangan') {
            pct = m.pctRealisasi;
            valText = fmtCompactRp(m.realisasi);
          } else {
            pct = m.jumlahPaket > 0 ? (m.paketSudah / m.jumlahPaket) * 100 : 0;
            valText = fmtInt(m.paketSudah) + ' pkt';
          }

          const pctText = pct.toFixed(1).replace('.', ',') + '%';

          // Draw percentage at the end of the full bar
          ctx.textAlign = 'left';
          ctx.fillStyle = ink.tick;
          ctx.fillText(pctText, bar1.x + 6, bar1.y);

          // Draw realized value at the end of the realization part
          const bar0 = meta0.data[i];
          if (pct > 85) {
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff'; // White text inside solid colored bar
            // Agar tidak menabrak kiri jika terlalu pendek, fallback ke outside
            ctx.fillText(valText, bar0.x - 6, bar0.y);
          } else if (pct > 0) {
            ctx.textAlign = 'left';
            ctx.fillStyle = ink.tick;
            ctx.fillText(valText, bar0.x + 6, bar0.y);
          } else if (pct === 0) {
            // Jika 0%, nilai juga 0, bisa ditampilkan di luar bar
            ctx.textAlign = 'left';
            ctx.fillStyle = ink.tick;
            ctx.fillText(valText, bar0.x + 6, bar0.y);
          }
        });
        ctx.restore();
      },
    }),
    [ink.tick, isDark]
  );

  const { data, options } = useMemo(() => {
    const labels = metode.map((m) => m.metode);
    const colors = metodePalette(labels, isDark);
    
    let dataSudah: number[] = [];
    let dataBelum: number[] = [];

    if (mode === 'keuangan') {
      dataSudah = metode.map((m) => m.pctRealisasi);
      dataBelum = metode.map((m) => Math.max(0, 100 - m.pctRealisasi));
    } else {
      dataSudah = metode.map((m) => m.jumlahPaket > 0 ? (m.paketSudah / m.jumlahPaket) * 100 : 0);
      dataBelum = metode.map((m) => Math.max(0, 100 - (m.jumlahPaket > 0 ? (m.paketSudah / m.jumlahPaket) * 100 : 0)));
    }

    const bgRealisasi = (ctx: ScriptableContext<'bar'>) => {
      const { chartArea, ctx: canvasCtx } = ctx.chart;
      if (!chartArea) return colors[ctx.dataIndex];
      const baseColor = colors[ctx.dataIndex];
      const gradient = canvasCtx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(1, adjustHex(baseColor, 0.35)); // Lebih cerah di ujung
      return gradient;
    };

    const bgSisa = (ctx: ScriptableContext<'bar'>) => {
      const { chartArea, ctx: canvasCtx } = ctx.chart;
      if (!chartArea) return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
      const baseColor = colors[ctx.dataIndex];
      const gradient = canvasCtx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
      // Lebih gelap dan memudar
      gradient.addColorStop(0, hexToRgba(adjustHex(baseColor, isDark ? -0.4 : -0.2), 0.4));
      gradient.addColorStop(1, hexToRgba(adjustHex(baseColor, isDark ? -0.7 : -0.4), 0.1));
      return gradient;
    };

    return {
      data: {
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
                const m = metode[ctx.dataIndex];
                const isRealized = ctx.datasetIndex === 0;
                
                if (mode === 'keuangan') {
                  return [
                    isRealized 
                      ? `Realisasi: ${fmtCompactRp(m.realisasi)} (${m.pctRealisasi.toFixed(1).replace('.', ',')}%)`
                      : `Sisa Pagu: ${fmtCompactRp(m.belum)}`,
                    `Total Pagu: ${fmtCompactRp(m.pagu)}`,
                    `${fmtInt(m.jumlahPaket)} paket`
                  ];
                } else {
                  const count = isRealized ? m.paketSudah : m.paketBelum;
                  const pct = isRealized 
                    ? (m.jumlahPaket > 0 ? (m.paketSudah / m.jumlahPaket * 100) : 0)
                    : (m.jumlahPaket > 0 ? (m.paketBelum / m.jumlahPaket * 100) : 0);
                  const labelName = isRealized ? 'Sudah Terealisasi' : 'Belum Terealisasi';
                  return [
                    `${labelName}: ${fmtInt(count)} paket (${pct.toFixed(1).replace('.', ',')}%)`,
                    isRealized ? `Realisasi: ${fmtCompactRp(m.realisasi)}` : `Pagu Tersisa: ${fmtCompactRp(m.belum)}`
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
  }, [metode, mode, isDark, ink.tick, ink.grid, ink.tooltipBg]);

  if (metode.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  return (
    <div className={`${styles.wrap} ${styles.h300}`}>
      <Bar data={data} options={options} plugins={[endLabelPlugin]} />
    </div>
  );
}
