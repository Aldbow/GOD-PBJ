"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Package } from '@/types';
import styles from './MetodePengadaanChart.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip);

// Kategorikal, sengaja tidak memakai merah/kuning/teal — warna-warna itu sudah
// dipakai untuk badge risiko (tinggi/sedang/rendah) di halaman yang sama.
const SLOT_COLORS_LIGHT = ['#2a78d6', '#e87ba4', '#4a3aa7', '#eb6834'];
const SLOT_COLORS_DARK = ['#3987e5', '#d55181', '#9085e9', '#d95926'];
const OTHER_COLOR_LIGHT = '#898781';
const OTHER_COLOR_DARK = '#898781';
const MAX_SLICES = 4;

export function MetodePengadaanChart({ packages }: { packages: Package[] }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    return () => observer.disconnect();
  }, []);

  const breakdown = useMemo(() => {
    const byMetode = new Map<string, number>();
    packages.forEach(p => {
      const key = p.metode || 'Lainnya';
      byMetode.set(key, (byMetode.get(key) || 0) + 1);
    });
    const sorted = Array.from(byMetode.entries())
      .map(([metode, jumlah]) => ({ metode, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);

    if (sorted.length <= MAX_SLICES) return sorted;

    const top = sorted.slice(0, MAX_SLICES);
    const rest = sorted.slice(MAX_SLICES);
    const lainnya = rest.reduce((s, r) => s + r.jumlah, 0);
    return [...top, { metode: 'Lainnya', jumlah: lainnya }];
  }, [packages]);

  if (breakdown.length === 0) {
    return null;
  }

  const total = breakdown.reduce((s, b) => s + b.jumlah, 0);
  const slotColors = isDark ? SLOT_COLORS_DARK : SLOT_COLORS_LIGHT;
  const otherColor = isDark ? OTHER_COLOR_DARK : OTHER_COLOR_LIGHT;
  const colors = breakdown.map((b, i) => b.metode === 'Lainnya' ? otherColor : slotColors[i % slotColors.length]);
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139,146,160,0.15)';
  const tickColor = isDark ? '#9CA3B8' : '#5B6472';
  const surfaceColor = isDark ? '#1a1a19' : '#fcfcfb';

  const pieData = {
    labels: breakdown.map(b => b.metode),
    datasets: [{
      data: breakdown.map(b => b.jumlah),
      backgroundColor: colors,
      borderColor: surfaceColor,
      borderWidth: 2,
    }]
  };

  const barData = {
    labels: breakdown.map(b => b.metode),
    datasets: [{
      data: breakdown.map(b => b.jumlah),
      backgroundColor: colors,
      borderRadius: 4,
      maxBarThickness: 34,
    }]
  };

  const tooltipLabel = (ctx: any) => {
    const item = breakdown[ctx.dataIndex];
    const pct = total > 0 ? Math.round((item.jumlah / total) * 100) : 0;
    return `${item.jumlah} paket (${pct}%)`;
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: tooltipLabel } }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: tooltipLabel } }
    },
    scales: {
      x: {
        ticks: { color: tickColor, autoSkip: false, maxRotation: 20, minRotation: 0 },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { color: tickColor, precision: 0 },
        grid: { color: gridColor }
      }
    }
  };

  return (
    <Card style={{ marginBottom: 26, padding: '18px 20px' }}>
      <SectionHeader
        title="Distribusi metode pengadaan"
        caption="Jumlah paket per metode yang ditangani"
      />
      <div className={styles.chartGrid}>
        <div className={styles.pieWrap}>
          <Pie data={pieData} options={pieOptions} />
        </div>
        <div className={styles.barWrap}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
      <div className={styles.list}>
        {breakdown.map((b, i) => (
          <div key={b.metode} className={styles.row}>
            <span className={styles.swatch} style={{ background: colors[i] }} />
            <span className={styles.rowName}>{b.metode}</span>
            <span className={styles.rowMeta}>{b.jumlah} paket · {total > 0 ? Math.round((b.jumlah / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
