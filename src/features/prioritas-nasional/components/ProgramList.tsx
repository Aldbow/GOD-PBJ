'use client';

import React, { useState, useMemo } from 'react';
import { MasterDataPN } from '@/types';
import { ProgramCard } from './ProgramCard';
import { Search, Filter, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgramListProps {
  initialData: MasterDataPN[];
}

export function ProgramList({ initialData }: ProgramListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(initialData.map(d => d.Status).filter(Boolean));
    return ['All', ...Array.from(statuses)];
  }, [initialData]);

  const filteredData = useMemo(() => {
    return initialData.filter((item) => {
      const matchesSearch = 
        item['Nama RO']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item['Kode RO']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Unit?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || item.Status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [initialData, searchQuery, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header and Controls */}
      <div style={{ 
        background: 'var(--surface)', 
        padding: '24px', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Daftar Program Prioritas Nasional</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Pantau dan kelola pencapaian anggaran serta fisik dari setiap RO.</p>
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
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <Search size={20} color="var(--text-tertiary)" />
            </div>
            <input
              type="text"
              placeholder="Cari berdasarkan Nama RO, Kode RO, atau Unit..."
              style={{
                width: '100%', padding: '12px 12px 12px 40px', 
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-page)', color: 'var(--text-primary)', 
                fontSize: '14px', outline: 'none'
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <Filter size={18} color="var(--text-tertiary)" />
            </div>
            <select
              style={{
                width: '100%', padding: '12px 36px 12px 36px', 
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-page)', color: 'var(--text-primary)', 
                fontSize: '14px', outline: 'none', cursor: 'pointer', appearance: 'none'
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'All' ? 'Semua Status' : status}
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <SlidersHorizontal size={16} color="var(--text-tertiary)" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredData.length > 0 ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
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
            Coba sesuaikan kata kunci pencarian atau ubah filter status untuk menemukan program yang Anda cari.
          </p>
          <button 
            onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
            style={{
              padding: '10px 16px', background: 'var(--info-100)', color: 'var(--info-600)',
              borderRadius: 'var(--radius-md)', fontWeight: 500, border: 'none', cursor: 'pointer', fontSize: '14px'
            }}
          >
            Reset Pencarian
          </button>
        </motion.div>
      )}
    </div>
  );
}
