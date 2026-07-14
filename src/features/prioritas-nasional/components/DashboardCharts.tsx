'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MasterDataPN } from '@/types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { parseIndonesianNumber } from '../utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardChartsProps {
  data: MasterDataPN[];
}

// Shared chart styling helpers
const CHART_COLORS = {
  teal: 'rgba(13, 148, 136, 0.85)',
  sky: 'rgba(2, 132, 199, 0.85)',
  rose: 'rgba(244, 63, 94, 0.85)',
  amber: 'rgba(245, 158, 11, 0.85)',
  violet: 'rgba(139, 92, 246, 0.85)',
  emerald: 'rgba(16, 185, 129, 0.85)',
  fontColor: '#9ca3af',
  grid: 'rgba(156, 163, 175, 0.15)',
};

const makeBarOptions = (formatTooltipValue: (v: number) => string, xTickCb?: (v: string | number) => string | number) => ({
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  color: CHART_COLORS.fontColor,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: CHART_COLORS.fontColor, font: { size: 12, weight: 500 as const } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { x: number | null } }) => {
          const lbl = ctx.dataset.label ? ctx.dataset.label + ': ' : '';
          return ctx.parsed.x !== null ? lbl + formatTooltipValue(ctx.parsed.x) : lbl;
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: CHART_COLORS.grid },
      ticks: {
        color: CHART_COLORS.fontColor,
        font: { weight: 500 as const },
        callback: xTickCb ?? ((v: string | number) => {
          const n = typeof v === 'string' ? parseFloat(v) : v;
          if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' M';
          if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' Jt';
          return n;
        }),
      },
    },
    y: {
      grid: { display: false },
      ticks: { color: CHART_COLORS.fontColor, font: { size: 11, weight: 500 as const } },
    },
  },
});

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const formatLabel = (label: string, maxLen = 38) => {
  if (label.length <= maxLen) return label;
  const words = label.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const word of words) {
    if ((line + word).length > maxLen) { lines.push(line.trim()); line = word + ' '; }
    else line += word + ' ';
  }
  if (line) lines.push(line.trim());
  return lines;
};

export function DashboardCharts({ data }: DashboardChartsProps) {
  const { paguRealisasiData, sisaPaguData, distribusiUnitData } = useMemo(() => {
    const programMap: Record<string, { pagu: number; realisasi: number; sisa: number }> = {};
    const unitMap: Record<string, number> = {};

    data.forEach(item => {
      const namaRO = item['Nama RO'] || 'Unknown';
      const unit = item.Unit || 'Unknown Unit';
      const pagu = parseIndonesianNumber(item['Pagu (Capaian)']);
      const realisasi = parseIndonesianNumber(item['Realisasi Anggaran']);
      const sisa = parseIndonesianNumber(item['Selisih Pagu']) || Math.max(0, pagu - realisasi);

      if (!programMap[namaRO]) programMap[namaRO] = { pagu: 0, realisasi: 0, sisa: 0 };
      programMap[namaRO].pagu += pagu;
      programMap[namaRO].realisasi += realisasi;
      programMap[namaRO].sisa += sisa;

      unitMap[unit] = (unitMap[unit] || 0) + pagu;
    });

    // Chart 1: Pagu vs Realisasi Top 5 programs
    const top5 = Object.entries(programMap).sort((a, b) => b[1].pagu - a[1].pagu).slice(0, 5);
    const paguRealisasi = {
      labels: top5.map(([name]) => formatLabel(name)),
      datasets: [
        { label: 'Pagu', data: top5.map(([, v]) => v.pagu), backgroundColor: CHART_COLORS.teal, borderRadius: 5 },
        { label: 'Realisasi', data: top5.map(([, v]) => v.realisasi), backgroundColor: CHART_COLORS.sky, borderRadius: 5 },
      ],
    };

    // Chart 2: Top 5 Sisa Pagu (Gap Analysis)
    const top5Sisa = Object.entries(programMap).sort((a, b) => b[1].sisa - a[1].sisa).slice(0, 5);
    const sisaPagu = {
      labels: top5Sisa.map(([name]) => formatLabel(name)),
      datasets: [
        { label: 'Sisa Pagu', data: top5Sisa.map(([, v]) => v.sisa), backgroundColor: CHART_COLORS.rose, borderRadius: 5 },
      ],
    };

    // Chart 3: Distribusi Pagu per Unit (Doughnut)
    const unitEntries = Object.entries(unitMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const distribusiUnit = {
      labels: unitEntries.map(([name]) => name.length > 30 ? name.substring(0, 30) + '...' : name),
      datasets: [{
        data: unitEntries.map(([, v]) => v),
        backgroundColor: [
          CHART_COLORS.teal, CHART_COLORS.sky, CHART_COLORS.violet,
          CHART_COLORS.amber, CHART_COLORS.rose, CHART_COLORS.emerald,
          'rgba(100, 116, 139, 0.85)',
        ],
        borderWidth: 2,
        borderColor: 'var(--surface)',
      }],
    };

    return { paguRealisasiData: paguRealisasi, sisaPaguData: sisaPagu, distribusiUnitData: distribusiUnit };
  }, [data]);

  const barOptionsPaguRealisasi = makeBarOptions(rupiah);
  const barOptionsSisa = makeBarOptions(rupiah);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: CHART_COLORS.fontColor,
          font: { size: 11, weight: 500 as const },
          boxWidth: 14,
          padding: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label?: string; parsed: number; dataset: { data: number[] } }) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
            return ` ${rupiah(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };

  const cardStyle = {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column' as const,
  };

  const titleStyle = {
    margin: '0 0 8px 0',
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  };

  const subtitleStyle = {
    margin: '0 0 20px 0',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  };

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Row 1: Pagu vs Realisasi (full width) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ ...cardStyle, minHeight: '440px' }}
      >
        <h3 style={titleStyle}>Top 5 Program: Pagu vs Realisasi</h3>
        <p style={subtitleStyle}>5 program dengan pagu terbesar beserta serapan realisasinya</p>
        <div style={{ flex: 1, position: 'relative' }}>
          <Bar data={paguRealisasiData} options={barOptionsPaguRealisasi} />
        </div>
      </motion.div>

      {/* Row 2: Sisa Pagu + Distribusi Unit (2 columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Insight #2 — Top 5 Sisa Pagu */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ ...cardStyle, minHeight: '380px' }}
        >
          <h3 style={titleStyle}>Top 5 Sisa Pagu Terbesar</h3>
          <p style={subtitleStyle}>Program dengan anggaran yang belum terserap paling banyak</p>
          <div style={{ flex: 1, position: 'relative' }}>
            <Bar data={sisaPaguData} options={barOptionsSisa} />
          </div>
        </motion.div>

        {/* Insight #3 — Distribusi Pagu per Unit */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ ...cardStyle, minHeight: '380px' }}
        >
          <h3 style={titleStyle}>Distribusi Beban Pagu per Unit Kerja</h3>
          <p style={subtitleStyle}>Porsi tanggung jawab anggaran prioritas nasional antar unit</p>
          <div style={{ flex: 1, position: 'relative' }}>
            <Doughnut data={distribusiUnitData} options={doughnutOptions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
