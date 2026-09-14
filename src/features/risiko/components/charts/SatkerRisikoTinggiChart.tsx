"use client";

import React, { useMemo, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, type TooltipItem, type Plugin } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useIsDark, chartInk, riskKategoriColor } from './riskChartTheme';
import { fmtInt, fmtRupiah } from '@/lib/format';
import styles from '@/features/ringkasan/components/charts/charts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/** #rrggbb -> rgba(...) supaya bar non-terpilih bisa diredupkan tanpa perlu warna kedua. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface SatkerRisikoBucket {
  satker: string;
  count: number;
  pagu: number;
}

interface Props {
  data: SatkerRisikoBucket[];
  selectedSatker?: string | null;
  onClick?: (satker: string) => void;
  height?: number | string;
}

export function SatkerRisikoTinggiChart({ data, selectedSatker, onClick, height }: Props) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);
  // Sama dengan warna "Tinggi" (Skor 3) di chart Top 5 Pemicu Risiko Utama — semua paket di
  // chart ini memang berkategori Tinggi, jadi satu warna status itu konsisten dipakai di sini.
  const tinggiColor = riskKategoriColor('TINGGI', isDark);

  // react-chartjs-2 hanya memakai prop `plugins` sekali saat chart pertama dibuat (lihat
  // catatan yang sama di RisikoDriverStackedBarChart) — baca dari ref supaya label total di
  // ujung bar tetap ikut ter-update tiap kali chart di-redraw, bukan beku di data awal mount.
  const dataRef = useRef(data);
  dataRef.current = data;
  const inkRef = useRef(ink);
  inkRef.current = ink;

  const endLabelPlugin: Plugin<'bar'> = useMemo(
    () => ({
      id: 'endLabelSatkerRisiko',
      afterDatasetsDraw(chart) {
        const rows = dataRef.current;
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        ctx.save();
        ctx.font = '600 11px var(--font-geist-sans), sans-serif';
        ctx.fillStyle = inkRef.current.valueText;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        meta.data.forEach((bar, i) => {
          const r = rows[i];
          if (!r) return;
          ctx.fillText(`${fmtInt(r.count)} paket`, (bar as any).x + 6, (bar as any).y);
        });
        ctx.restore();
      },
    }),
    []
  );

  const { chartData, options } = useMemo(
    () => ({
      chartData: {
        labels: data.map((r) => r.satker),
        datasets: [
          {
            data: data.map((r) => r.count),
            backgroundColor: data.map((r) => {
              // Redupkan bar lain saat ada yang terpilih, supaya seleksi tetap terlihat
              // walau semua bar memakai warna status "Tinggi" yang sama.
              if (selectedSatker && r.satker !== selectedSatker) return hexToRgba(tinggiColor, 0.35);
              return tinggiColor;
            }),
            borderRadius: 6,
            borderSkipped: false,
            barThickness: 'flex' as const,
            maxBarThickness: 22,
          },
        ],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { right: 90 } },
        onHover: (event: any, els: any) => {
          if (onClick && event.native?.target) {
            event.native.target.style.cursor = els[0] ? 'pointer' : 'default';
          }
        },
        onClick: (event: any, els: any) => {
          if (!onClick || !els.length) return;
          const r = data[els[0].index];
          if (r) onClick(r.satker);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) => data[items[0].dataIndex]?.satker ?? '',
              label: () => '',
              afterBody: (items: TooltipItem<'bar'>[]) => {
                const r = data[items[0].dataIndex];
                if (!r) return '';
                return [`Paket risiko tinggi : ${fmtInt(r.count)}`, `Total pagu           : ${fmtRupiah(r.pagu)}`];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: ink.tick, precision: 0 },
            grid: { color: ink.grid },
            border: { display: false },
          },
          y: {
            ticks: { color: ink.valueText, font: { size: 11.5 } },
            grid: { display: false },
            border: { display: false },
          },
        },
      },
    }),
    [data, selectedSatker, isDark, tinggiColor, ink, onClick]
  );

  if (data.length === 0) {
    return <div className={styles.empty}>Tidak ada satuan kerja dengan risiko tinggi untuk filter ini.</div>;
  }

  return (
    <div style={{ height: height ?? Math.max(data.length * 32, 160), width: '100%' }}>
      <Bar data={chartData} options={options} plugins={[endLabelPlugin]} />
    </div>
  );
}
