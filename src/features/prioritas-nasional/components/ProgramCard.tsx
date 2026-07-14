'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MasterDataPN } from '@/types';
import { Building2, Target, Banknote, Layers } from 'lucide-react';

interface ProgramCardProps {
  data: MasterDataPN;
  index: number;
}

export function ProgramCard({ data, index }: ProgramCardProps) {
  // Helper to parse percentages
  const parsePercent = (val: string) => {
    if (!val) return 0;
    const num = parseFloat(val.replace(',', '.').replace('%', ''));
    return isNaN(num) ? 0 : num;
  };

  const pctAnggaran = parsePercent(data['% Capaian Anggaran']);
  const pctVolume = parsePercent(data['% Capaian Fisik/Volume']);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: 'var(--card-shadow)', transition: { duration: 0.2 } }}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        willChange: 'transform'
      }}
    >
      {/* Decorative top border gradient using info theme color */}
      <div 
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '4px',
          background: 'var(--info-600)',
          transformOrigin: 'left',
          transition: 'transform 0.5s ease',
        }}
        className="card-gradient-top"
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ 
              fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', 
              background: 'var(--bg-page)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' 
            }}>
              {data['Kode RO']}
            </span>
          </div>
          <h3 style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '16px', lineHeight: 1.3, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={data['Nama RO']}>
            {data['Nama RO']}
          </h3>
        </div>
        <div style={{ padding: '8px', background: 'var(--info-100)', borderRadius: '8px', flexShrink: 0 }}>
          <Layers size={20} color="var(--info-600)" />
        </div>
      </div>

      {/* Unit */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '24px' }}>
        <Building2 size={16} color="var(--text-tertiary)" style={{ marginTop: '2px', flexShrink: 0 }} />
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={data.Unit}>
          {data.Unit}
        </p>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Anggaran Section */}
        <div style={{ background: 'var(--bg-page)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Banknote size={16} color="var(--teal-600)" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Anggaran</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--teal-600)' }}>{pctAnggaran}%</span>
          </div>
          
          <div style={{ width: '100%', background: 'var(--track-bg)', borderRadius: '999px', height: '6px', marginBottom: '12px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pctAnggaran, 100)}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              style={{ background: 'var(--teal-600)', height: '100%', borderRadius: '999px' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>Pagu</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={data['Pagu (Capaian)']}>
                Rp {data['Pagu (Capaian)']}
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>Realisasi</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={data['Realisasi Anggaran']}>
                Rp {data['Realisasi Anggaran']}
              </p>
            </div>
          </div>
        </div>

        {/* Volume/Fisik Section */}
        <div style={{ background: 'var(--bg-page)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} color="var(--info-600)" />
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Fisik / Vol ({data.Satuan})</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--info-600)' }}>{pctVolume}%</span>
          </div>

          <div style={{ width: '100%', background: 'var(--track-bg)', borderRadius: '999px', height: '6px', marginBottom: '12px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pctVolume, 100)}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              style={{ background: 'var(--info-600)', height: '100%', borderRadius: '999px' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>Target</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{data['Target Volume (Capaian)']}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 2px 0' }}>Realisasi</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{data['Realisasi Volume']}</p>
            </div>
          </div>
        </div>
      </div>
      
    </motion.div>
  );
}
