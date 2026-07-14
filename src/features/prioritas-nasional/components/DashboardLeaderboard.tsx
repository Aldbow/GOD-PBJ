'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MasterDataPN } from '@/types';
import { TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react';
import { parseIndonesianNumber } from '../utils';

interface DashboardLeaderboardProps {
  data: MasterDataPN[];
}

export function DashboardLeaderboard({ data }: DashboardLeaderboardProps) {
  const { top3, bottom3 } = useMemo(() => {
    // Filter out items with no capaian fisik data
    const withData = data
      .map(item => ({
        namaRO: item['Nama RO'] || '-',
        kodeRO: item['Kode RO'] || '-',
        unit: item.Unit || '-',
        pctFisik: parseIndonesianNumber(item['% Capaian Fisik/Volume']),
        pctAnggaran: parseIndonesianNumber(item['% Capaian Anggaran']),
      }))
      .filter(item => !isNaN(item.pctFisik));

    const sorted = [...withData].sort((a, b) => b.pctFisik - a.pctFisik);

    return {
      top3: sorted.slice(0, 3),
      bottom3: sorted.slice(-3).reverse(),
    };
  }, [data]);

  const RankRow = ({
    item,
    rank,
    isTop,
  }: {
    item: { namaRO: string; kodeRO: string; unit: string; pctFisik: number; pctAnggaran: number };
    rank: number;
    isTop: boolean;
  }) => {
    const color = isTop ? '#10b981' : '#f43f5e';
    const trackColor = isTop ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)';
    const rankBg = isTop
      ? ['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.12)', 'rgba(16,185,129,0.08)'][rank - 1]
      : ['rgba(244,63,94,0.2)', 'rgba(244,63,94,0.12)', 'rgba(244,63,94,0.08)'][rank - 1];

    return (
      <motion.div
        initial={{ opacity: 0, x: isTop ? -16 : 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: rank * 0.08 }}
        style={{
          background: rankBg,
          border: `1px solid ${color}30`,
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        {/* Rank number */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '14px', flexShrink: 0,
        }}>
          {rank}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
            margin: '0 0 2px 0',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }} title={item.namaRO}>
            {item.namaRO}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            title={item.unit}>
            {item.kodeRO} · {item.unit}
          </p>
          {/* Mini progress bar */}
          <div style={{ height: '4px', background: 'var(--track-bg)', borderRadius: '999px', marginTop: '8px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(item.pctFisik, 100)}%` }}
              transition={{ duration: 1, delay: 0.2 + rank * 0.1 }}
              style={{ height: '100%', background: color, borderRadius: '999px' }}
            />
          </div>
        </div>

        {/* Percentage */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '20px', fontWeight: 900, color, margin: 0, lineHeight: 1 }}>
            {item.pctFisik.toFixed(0)}<span style={{ fontSize: '12px' }}>%</span>
          </p>
          <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Capaian Fisik</p>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}
    >
      {/* Top 3 Performers */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(16,185,129,0.25)',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ padding: '8px', background: 'rgba(16,185,129,0.15)', borderRadius: '10px' }}>
            <Award size={18} color="#10b981" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Top 3 Program Tercepat
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Capaian fisik/volume tertinggi
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <TrendingUp size={20} color="#10b981" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          {top3.map((item, i) => (
            <RankRow key={item.kodeRO + i} item={item} rank={i + 1} isTop={true} />
          ))}
        </div>
      </div>

      {/* Bottom 3 — Perlu Atensi */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(244,63,94,0.25)',
        padding: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ padding: '8px', background: 'rgba(244,63,94,0.15)', borderRadius: '10px' }}>
            <AlertTriangle size={18} color="#f43f5e" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Bottom 3 Perlu Atensi
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Capaian fisik/volume terendah
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <TrendingDown size={20} color="#f43f5e" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          {bottom3.map((item, i) => (
            <RankRow key={item.kodeRO + i} item={item} rank={i + 1} isTop={false} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
