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
  const [metric, setMetric] = useState<Metric>('realisasi');
  const cfg = METRICS[metric];

  const rows = useMemo<Row[]>(() => {
    const sorted = [...satker].sort((a, b) => cfg.getValue(b) - cfg.getValue(a));
    const rankOf = new Map(sorted.map((s, i) => [s.satker, i + 1]));

    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);
    const selectedInRest = !!selectedSatker && rest.some((s) => s.satker === selectedSatker);
    const restForOther = selectedInRest ? rest.filter((s) => s.satker !== selectedSatker) : rest;

    const list: Row[] = [...top];

    if (restForOther.length > 0) {
      const jumlahPaket = restForOther.reduce((s, r) => s + r.jumlahPaket, 0);
      const pagu = restForOther.reduce((s, r) => s + r.pagu, 0);
      const realisasi = restForOther.reduce((s, r) => s + r.realisasi, 0);
      list.push({
        satker: `Lainnya (${restForOther.length} satker)`,
        jumlahPaket,
        pagu,
        realisasi,
        belum: Math.max(pagu - realisasi, 0),
        pctRealisasi: pagu > 0 ? (realisasi / pagu) * 100 : 0,
        isOther: true,
      });
    }

    if (selectedInRest) {
      const s = sorted.find((r) => r.satker === selectedSatker)!;
      list.push({ ...s, pinnedRank: rankOf.get(s.satker) });
    }

    return list;
  }, [satker, metric, selectedSatker, cfg]);

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
    const colors = rows.map((r) => {
      if (r.isOther) return rankColor('other', isDark);
      if (r.satker === selectedSatker) return rankColor('highlight', isDark);
      return rankColor('base', isDark);
    });

    return {
      data: {
        labels,
        datasets: [
          {
            data: rows.map((r) => cfg.getValue(r)),
            backgroundColor: colors,
            borderRadius: 4,
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
      <div className={styles.toggle} style={{ marginBottom: 14 }}>
        <button className={`${styles.toggleBtn} ${metric === 'realisasi' ? styles.toggleActive : ''}`} onClick={() => setMetric('realisasi')}>
          Realisasi (Rp)
        </button>
        <button className={`${styles.toggleBtn} ${metric === 'pct' ? styles.toggleActive : ''}`} onClick={() => setMetric('pct')}>
          % Capaian
        </button>
        <button className={`${styles.toggleBtn} ${metric === 'belum' ? styles.toggleActive : ''}`} onClick={() => setMetric('belum')}>
          Sisa Anggaran
        </button>
      </div>

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
            {rows.some((r) => r.isOther) && (
              <span className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: rankColor('other', isDark) }} /> Lainnya
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
