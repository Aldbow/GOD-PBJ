"use client";

import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, type TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { CheckCircle2, AlertTriangle, ShieldAlert, HelpCircle, type LucideIcon } from 'lucide-react';
import { useIsDark, chartInk, riskKategoriColor } from './riskChartTheme';
import { fmtInt } from '@/lib/format';
import { countRup } from '@/lib/format';
import { RISK_KATEGORI_LABEL, type RiskKategori, type RiskRow } from '@/lib/risiko/types';

type DonutRow = Pick<RiskRow, 'kd_rup' | 'kategori'>;
import styles from '@/features/ringkasan/components/charts/charts.module.css';

ChartJS.register(ArcElement, Tooltip);

// Urutan TETAP (baik -> kritis -> tak diketahui) — warna status TIDAK pernah diurutkan ulang
// berdasarkan jumlah, beda dengan palet kategorikal biasa (lihat riskChartTheme.ts).
const KATEGORI_ORDER: RiskKategori[] = ['RENDAH', 'SEDANG', 'TINGGI', 'DATA_TIDAK_LENGKAP'];

// Status selalu dipasangkan ikon + label (dataviz skill, "Status is fixed") — jangan hanya warna.
const KATEGORI_ICON: Record<RiskKategori, LucideIcon> = {
  RENDAH: CheckCircle2,
  SEDANG: AlertTriangle,
  TINGGI: ShieldAlert,
  DATA_TIDAK_LENGKAP: HelpCircle,
};

interface Props {
  rows: DonutRow[];
}

export function RisikoKategoriDonut({ rows }: Props) {
  const isDark = useIsDark();
  const ink = chartInk(isDark);

  const buckets = useMemo(() => {
    const counts: Record<RiskKategori, number> = { RENDAH: 0, SEDANG: 0, TINGGI: 0, DATA_TIDAK_LENGKAP: 0 };
    for (const r of rows) counts[r.kategori] += countRup(r.kd_rup);
    return KATEGORI_ORDER.map((kategori) => ({ kategori, count: counts[kategori] }));
  }, [rows]);

  const total = buckets.reduce((s, b) => s + b.count, 0) || 1;

  const { chartData, options } = useMemo(() => {
    const nonZero = buckets.filter((b) => b.count > 0);
    return {
      chartData: {
        labels: nonZero.map((b) => RISK_KATEGORI_LABEL[b.kategori]),
        datasets: [
          {
            data: nonZero.map((b) => b.count),
            backgroundColor: nonZero.map((b) => riskKategoriColor(b.kategori, isDark)),
            borderColor: ink.surface,
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { animateRotate: true, animateScale: true },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: ink.tooltipBg,
            titleColor: ink.tooltipText,
            bodyColor: ink.tooltipText,
            padding: 10,
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                const b = nonZero[ctx.dataIndex];
                const pct = ((b.count / total) * 100).toFixed(1).replace('.', ',');
                return `${fmtInt(b.count)} paket (${pct}%)`;
              },
            },
          },
        },
      },
    };
  }, [buckets, isDark, ink.surface, ink.tooltipBg, ink.tooltipText, total]);

  if (rows.length === 0) {
    return <div className={styles.empty}>Tidak ada data untuk filter ini.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
      {/* Donut chart area */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
          <Doughnut data={chartData} options={options} />
          <div className={styles.donutCenter}>
            <div className={styles.donutTotal}>{fmtInt(total)}</div>
            <div className={styles.donutLabel}>Total Paket</div>
          </div>
        </div>
      </div>

      {/* Legend di bawah */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {buckets.map((b) => {
          const Icon = KATEGORI_ICON[b.kategori];
          const pct = ((b.count / total) * 100).toFixed(1).replace('.', ',');
          return (
            <li key={b.kategori} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 10,
              background: b.count > 0 ? `${riskKategoriColor(b.kategori, isDark)}12` : 'transparent',
              border: `1px solid ${b.count > 0 ? `${riskKategoriColor(b.kategori, isDark)}30` : 'transparent'}`,
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: riskKategoriColor(b.kategori, isDark),
                flexShrink: 0,
              }} />
              <Icon size={14} style={{ color: riskKategoriColor(b.kategori, isDark), flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {RISK_KATEGORI_LABEL[b.kategori]}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {fmtInt(b.count)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
