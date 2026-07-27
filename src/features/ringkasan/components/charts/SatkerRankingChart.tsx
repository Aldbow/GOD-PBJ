"use client";

import React, { useMemo, useState } from 'react';
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
import type { SatkerAggregate } from '../../lib/ringkasanData';
import { useIsDark, rankColor, chartInk, fmtCompactRp } from './chartTheme';
import { fmtInt, fmtPct, fmtRupiah } from '@/lib/format';
import styles from './charts.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type Metric = 'realisasi' | 'pct' | 'belum';

const METRICS: Record<Metric, { label: string; getValue: (s: SatkerAggregate) => number; format: (v: number) => string }> = {
  realisasi: { label: 'Realisasi (Rp)', getValue: (s) => s.realisasi, format: fmtCompactRp },
  pct: { label: '% Capaian', getValue: (s) => s.pctRealisasi, format: (v) => fmtPct(v, 0) },
  belum: { label: 'Sisa Anggaran', getValue: (s) => s.belum, format: fmtCompactRp },
};

const TOP_N = 10;

type Row = SatkerAggregate & { isOther?: boolean; pinnedRank?: number };

export function SatkerRankingChart({ satker, selectedSatker }: { satker: SatkerAggregate[]; selectedSatker: string }) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);
  const cfg = METRICS['pct'];

  const rows = useMemo<Row[]>(() => {
    const sorted = [...satker].sort((a, b) => cfg.getValue(b) - cfg.getValue(a));
    const rankOf = new Map(sorted.map((s, i) => [s.satker, i + 1]));

    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);
    const selectedInRest = !!selectedSatker && rest.some((s) => s.satker === selectedSatker);

    const list: Row[] = [...top];

    if (selectedInRest) {
      const s = sorted.find((r) => r.satker === selectedSatker)!;
      list.push({ ...s, pinnedRank: rankOf.get(s.satker) });
    }

    return list;
  }, [satker, selectedSatker, cfg]);

  // Plugin ringan: tulis nilai metrik aktif di ujung tiap bar.
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
          const val = cfg.getValue(rows[i]);
          ctx.textAlign = 'left';
          ctx.fillText(cfg.format(val), bar.x + 6, bar.y);
        });
        ctx.restore();
      },
    }),
    [rows, cfg, ink.tick]
  );

  const { data, options } = useMemo(() => {
    const labels = rows.map((r) => (r.pinnedRank ? `${r.satker} · Peringkat #${r.pinnedRank}` : r.satker));

    return {
      data: {
        labels,
        datasets: [
          {
            data: rows.map((r) => cfg.getValue(r)),
            backgroundColor: (context: any) => {
              const { chart, dataIndex } = context;
              const r = rows[dataIndex];
              if (!r || !chart.chartArea) return rankColor(r?.satker === selectedSatker ? 'highlight' : 'base', isDark);
              
              const { left, right } = chart.chartArea;
              const ctx = chart.ctx;
              const gradient = ctx.createLinearGradient(left, 0, right, 0);
              
              if (r.satker === selectedSatker) {
                // Highlight: Purple to Pink (Premium look)
                gradient.addColorStop(0, '#7928CA');
                gradient.addColorStop(1, '#FF0080');
              } else {
                // Base: Blue to Cyan
                gradient.addColorStop(0, '#007CF0');
                gradient.addColorStop(1, '#00DFD8');
              }
              return gradient;
            },
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
        layout: { padding: { right: 46 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              title: (items: TooltipItem<'bar'>[]) => rows[items[0].dataIndex]?.satker ?? '',
              label: () => '',
              afterBody: (items: TooltipItem<'bar'>[]) => {
                const r = rows[items[0].dataIndex];
                if (!r) return '';
                return [
                  `Jumlah paket : ${fmtInt(r.jumlahPaket)}`,
                  `Pagu         : ${fmtRupiah(r.pagu)}`,
                  `Realisasi    : ${fmtRupiah(r.realisasi)}`,
                  `Sisa         : ${fmtRupiah(r.belum)}`,
                  `% Capaian    : ${fmtPct(r.pctRealisasi)}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            min: 0,
            max: 100,
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
  }, [rows, cfg, isDark, selectedSatker, ink.tick, ink.grid, ink.tooltipBg]);

  return (
    <div>
      {rows.length === 0 ? (
        <div className={styles.empty}>Tidak ada data untuk filter ini.</div>
      ) : (
        <>
          <div className={`${styles.wrap}`} style={{ height: Math.max(rows.length * 30, 200) }}>
            <Bar data={data} options={options} plugins={[endLabelPlugin]} />
          </div>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: rankColor('base', isDark) }} /> Satuan Kerja
            </span>
            {!!selectedSatker && (
              <span className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: rankColor('highlight', isDark) }} /> Satker terpilih (filter)
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
