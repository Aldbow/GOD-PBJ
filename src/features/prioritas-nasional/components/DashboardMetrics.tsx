'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MasterDataPN } from '@/types';
import { Banknote, TrendingUp, Target, Activity, ShieldCheck, ShieldAlert } from 'lucide-react';
import { parseIndonesianNumber, formatRupiah } from '../utils';

interface DashboardMetricsProps {
  data: MasterDataPN[];
}

export function DashboardMetrics({ data }: DashboardMetricsProps) {
  const metrics = useMemo(() => {
    let totalPagu = 0;
    let totalRealisasi = 0;
    let sumCapaianAnggaran = 0;
    let sumCapaianFisik = 0;
    let validAnggaranCount = 0;
    let validFisikCount = 0;

    data.forEach(item => {
      totalPagu += parseIndonesianNumber(item['Pagu (Capaian)']);
      totalRealisasi += parseIndonesianNumber(item['Realisasi Anggaran']);

      const pctAnggaran = parseIndonesianNumber(item['% Capaian Anggaran']);
      if (!isNaN(pctAnggaran)) {
        sumCapaianAnggaran += pctAnggaran;
        validAnggaranCount++;
      }

      const pctFisik = parseIndonesianNumber(item['% Capaian Fisik/Volume']);
      if (!isNaN(pctFisik)) {
        sumCapaianFisik += pctFisik;
        validFisikCount++;
      }
    });

    const avgAnggaran = validAnggaranCount > 0 ? (sumCapaianAnggaran / validAnggaranCount) : 0;
    const avgFisik = validFisikCount > 0 ? (sumCapaianFisik / validFisikCount) : 0;
    const overallHealth = (avgAnggaran + avgFisik) / 2;

    return {
      totalPagu,
      totalRealisasi,
      avgCapaianAnggaran: avgAnggaran,
      avgCapaianFisik: avgFisik,
      overallHealth,
    };
  }, [data]);

  // Determine zone color based on overall health
  const getZone = (pct: number) => {
    if (pct >= 70) return { label: 'Zona Hijau', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: ShieldCheck };
    if (pct >= 40) return { label: 'Zona Kuning', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: ShieldAlert };
    return { label: 'Zona Merah', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', icon: ShieldAlert };
  };

  const zone = getZone(metrics.overallHealth);

  const cards = [
    {
      title: 'Total Pagu',
      value: formatRupiah(metrics.totalPagu),
      icon: Banknote,
      color: 'var(--teal-600)',
      bg: 'var(--teal-100)',
    },
    {
      title: 'Total Realisasi Anggaran',
      value: formatRupiah(metrics.totalRealisasi),
      icon: TrendingUp,
      color: 'var(--info-600)',
      bg: 'var(--info-100)',
    },
    {
      title: 'Rata-rata Capaian Anggaran',
      value: `${metrics.avgCapaianAnggaran.toFixed(1)}%`,
      icon: Target,
      color: 'var(--amber-600)',
      bg: 'var(--amber-100)',
    },
    {
      title: 'Rata-rata Capaian Fisik',
      value: `${metrics.avgCapaianFisik.toFixed(1)}%`,
      icon: Activity,
      color: 'var(--rose-600)',
      bg: 'var(--rose-100)',
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* === PANEL INDIKATOR KESEHATAN NASIONAL === */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${zone.color}40`,
          padding: '28px 32px',
          boxShadow: `0 0 0 4px ${zone.color}10`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow accent */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: '35%',
          background: `linear-gradient(to left, ${zone.color}15, transparent)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '24px', position: 'relative', zIndex: 1 }}>
          {/* Left: Title and zone */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <zone.icon size={22} color={zone.color} />
              <span style={{
                fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em',
                color: zone.color, textTransform: 'uppercase',
                background: zone.bg, padding: '3px 10px', borderRadius: '999px',
                border: `1px solid ${zone.color}50`,
              }}>
                {zone.label}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
              Indikator Kinerja Nasional
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Rata-rata gabungan dari capaian anggaran & fisik seluruh program
            </p>
          </div>

          {/* Right: Big percentage */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: '48px', fontWeight: 900, color: zone.color, margin: 0, lineHeight: 1 }}>
              {metrics.overallHealth.toFixed(1)}
              <span style={{ fontSize: '24px' }}>%</span>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Indeks Kinerja Keseluruhan</p>
          </div>
        </div>

        {/* Progress bars */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px', position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Capaian Anggaran', pct: metrics.avgCapaianAnggaran, color: '#14b8a6' },
            { label: 'Capaian Fisik/Volume', pct: metrics.avgCapaianFisik, color: '#38bdf8' },
          ].map((item) => (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: item.color }}>{item.pct.toFixed(1)}%</span>
              </div>
              <div style={{ height: '8px', background: 'var(--track-bg)', borderRadius: '999px', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(item.pct, 100)}%` }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                  style={{ height: '100%', background: item.color, borderRadius: '999px' }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* === 4 SUMMARY CARDS === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.08, duration: 0.5 }}
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '90px', height: '90px', borderRadius: '50%',
              background: card.bg, opacity: 0.5, zIndex: 0
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>{card.title}</span>
                <div style={{ padding: '7px', borderRadius: '10px', background: card.bg }}>
                  <card.icon size={18} color={card.color} />
                </div>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                {card.value}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
