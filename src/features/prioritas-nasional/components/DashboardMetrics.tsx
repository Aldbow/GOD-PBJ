'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MasterDataPN } from '@/types';
import { Banknote, TrendingUp, Target, Activity } from 'lucide-react';
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

    return {
      totalPagu,
      totalRealisasi,
      avgCapaianAnggaran: validAnggaranCount > 0 ? (sumCapaianAnggaran / validAnggaranCount) : 0,
      avgCapaianFisik: validFisikCount > 0 ? (sumCapaianFisik / validFisikCount) : 0,
    };
  }, [data]);

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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.5 }}
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative background circle */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: card.bg,
            opacity: 0.5,
            zIndex: 0
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>{card.title}</span>
              <div style={{ padding: '8px', borderRadius: '12px', background: card.bg }}>
                <card.icon size={20} color={card.color} />
              </div>
            </div>
            
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              {card.value}
            </h3>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
