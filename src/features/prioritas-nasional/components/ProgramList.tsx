'use client';

import React, { useState, useMemo } from 'react';
import { MasterDataPN } from '@/types';
import { ProgramCard } from './ProgramCard';
import { Search, AlertCircle, LayoutDashboard, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardMetrics } from './DashboardMetrics';
import { DashboardCharts } from './DashboardCharts';
import { DashboardLeaderboard } from './DashboardLeaderboard';

import { parseIndonesianNumber } from '../utils';

interface ProgramListProps {
  initialData: MasterDataPN[];
}

type SortOption = 'rvro_desc' | 'rvro_asc' | 'anggaran_desc' | 'anggaran_asc';

export function ProgramList({ initialData }: ProgramListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('rvro_desc');

  const filteredData = useMemo(() => {
    const filtered = initialData.filter((item) => {
      return (
        item['Nama RO']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item['Kode RO']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Unit?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    // Apply sorting based on percentage fields
    return filtered.sort((a, b) => {
      if (sortBy === 'rvro_desc') {
        return parseIndonesianNumber(b['% Capaian Fisik/Volume']) - parseIndonesianNumber(a['% Capaian Fisik/Volume']);
      } else if (sortBy === 'rvro_asc') {
        return parseIndonesianNumber(a['% Capaian Fisik/Volume']) - parseIndonesianNumber(b['% Capaian Fisik/Volume']);
      } else if (sortBy === 'anggaran_desc') {
        return parseIndonesianNumber(b['% Capaian Anggaran']) - parseIndonesianNumber(a['% Capaian Anggaran']);
      } else {
        return parseIndonesianNumber(a['% Capaian Anggaran']) - parseIndonesianNumber(b['% Capaian Anggaran']);
      }
    });
  }, [initialData, searchQuery, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Dashboard Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '10px', background: 'var(--info-100)', borderRadius: '12px' }}>
          <LayoutDashboard size={28} color="var(--info-600)" />
        </div>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            Dashboard Program Prioritas Nasional
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '15px' }}>
            Pantau ringkasan performa dan kelola pencapaian anggaran serta fisik dari setiap RO.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <DashboardMetrics data={initialData} />

      {/* Leaderboard */}
      <DashboardLeaderboard data={initialData} />

      {/* Charts Section */}
      <DashboardCharts data={initialData} />

      {/* Search and List Header */}
      <div style={{ 
        background: 'var(--surface)', 
        padding: '24px', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border)',
        marginTop: '16px'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Rincian Program RO</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Daftar detail dari seluruh program prioritas nasional.</p>
          </div>
          
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--bg-page)', padding: '8px 16px', 
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' 
          }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info-600)' }}>{filteredData.length}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.2 }}>Program<br/>Ditemukan</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '16px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <Search size={20} color="var(--text-tertiary)" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan Nama RO, Kode RO, atau Unit..."
              style={{
                width: '100%', padding: '14px 14px 14px 48px', 
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-page)', color: 'var(--text-primary)', 
                fontSize: '15px', outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--info-500)';
                e.target.style.boxShadow = '0 0 0 3px var(--info-100)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '16px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <ArrowUpDown size={18} color="var(--text-tertiary)" />
            </div>
            <select
              style={{
                width: '100%', padding: '14px 36px 14px 44px', 
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-page)', color: 'var(--text-primary)', 
                fontSize: '15px', outline: 'none', cursor: 'pointer', appearance: 'none',
                transition: 'border-color 0.2s ease'
              }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              onFocus={(e) => e.target.style.borderColor = 'var(--info-500)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            >
              <option value="rvro_desc">Persentase RVRO Terbesar</option>
              <option value="rvro_asc">Persentase RVRO Terkecil</option>
              <option value="anggaran_desc">Persentase Realisasi Anggaran Terbesar</option>
              <option value="anggaran_asc">Persentase Realisasi Anggaran Terkecil</option>
            </select>
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: '16px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredData.length > 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '24px' 
        }}>
          <AnimatePresence>
            {filteredData.map((program, index) => (
              <ProgramCard key={program.id || program['Kode RO']} data={program} index={index} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '60px 20px', textAlign: 'center', background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)'
          }}
        >
          <div style={{ background: 'var(--bg-page)', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
            <AlertCircle size={32} color="var(--text-tertiary)" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px', marginTop: 0 }}>Tidak ada program ditemukan</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 0 24px 0', fontSize: '14px' }}>
            Coba sesuaikan kata kunci pencarian untuk menemukan program yang Anda cari.
          </p>
          <button 
            onClick={() => setSearchQuery('')}
            style={{
              padding: '10px 16px', background: 'var(--info-100)', color: 'var(--info-600)',
              borderRadius: 'var(--radius-md)', fontWeight: 500, border: 'none', cursor: 'pointer', fontSize: '14px',
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--info-200)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--info-100)'}
          >
            Reset Pencarian
          </button>
        </motion.div>
      )}
    </div>
  );
}
