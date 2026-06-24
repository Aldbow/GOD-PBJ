"use client";

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RealisasiChart } from './RealisasiChart';
import { Badge } from '@/components/ui/Badge';
import { motion } from 'framer-motion';
import { Satker, Package } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300 } }
};

export function RingkasanView() {
  const [risks, setRisks] = useState<{ satkerName: string, pkg: Package }[]>([]);

  useEffect(() => {
    // Fetch top risks from all satkers
    fetch('/api/satker')
      .then(res => res.json())
      .then((data: Satker[]) => {
        const topRisks = data.map(s => ({
          satkerName: s.name,
          pkg: s.packages[0] // just picking the first for the summary
        }));
        setRisks(topRisks);
      });
  }, []);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      {/* Banner */}
      <motion.div variants={itemVariants} style={{ background: 'var(--info-100)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--info-600)', margin: '0 0 4px' }}>Proyeksi predikat ITKP tahun berjalan</p>
          <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            Sangat baik <small style={{ fontFamily: 'var(--font-inter)', fontWeight: 400, fontSize: 13, color: 'var(--text-secondary)' }}>(skor 87,4 / target 85)</small>
          </p>
        </div>
        <div style={{ width: 220 }}>
          <ProgressBar value={87} label="87% tercapai" />
        </div>
      </motion.div>

      {/* ITKP Indicators */}
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>Indikator ITKP</p>
      <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 26 }}>
        <Card>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Reviu RUP</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>92<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/100</span></p>
          <p style={{ fontSize: 11, margin: '8px 0 0', color: 'var(--teal-600)' }}>▲ stabil, di atas target</p>
        </Card>
        <Card>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Pemilihan penyedia</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>85<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/100</span></p>
          <p style={{ fontSize: 11, margin: '8px 0 0', color: 'var(--amber-600)' }}>▬ mendekati ambang batas</p>
        </Card>
        <Card>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Tingkat kematangan UKPBJ</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>90<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/100</span></p>
          <p style={{ fontSize: 11, margin: '8px 0 0', color: 'var(--teal-600)' }}>▲ naik dari kuartal lalu</p>
        </Card>
        <Card variant="danger">
          <p style={{ fontSize: 12, color: 'var(--red-600)', margin: '0 0 8px' }}>Kualifikasi & kompetensi SDM PBJ</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0, color: 'var(--red-600)' }}>68<span style={{ fontSize: 13 }}>/100</span></p>
          <p style={{ fontSize: 11, margin: '8px 0 0', color: 'var(--red-600)' }}>⚠ perlu intervensi pelatihan</p>
        </Card>
      </motion.div>

      {/* Chart */}
      <motion.div variants={itemVariants}>
        <RealisasiChart />
      </motion.div>

      {/* Risks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Register risiko lintas satker</p>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>data ilustratif dari 5 satker contoh</span>
      </div>
      <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
        {risks.map((r, i) => (
          <motion.div key={i} whileHover={{ x: 4 }} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Badge variant={r.pkg.risiko}>Risiko {r.pkg.risiko}</Badge>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{r.pkg.nama}</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '3px 0 0' }}>Satker: {r.satkerName} · PIC: {r.pkg.pic} · {r.pkg.sirup ? 'sesuai SIRUP' : 'SIRUP belum sesuai'}</p>
            </div>
            <a href="/drilldown" style={{ fontSize: 12, color: 'var(--info-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0, textDecoration: 'none' }}>Lihat detail →</a>
          </motion.div>
        ))}
      </motion.div>

    </motion.div>
  );
}
