"use client";

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { RupHistoryTimeline } from './RupHistoryTimeline';
import type { RupHistoryEntry } from '@/lib/paket/rupHistory';
import styles from './PaketDetailModal.module.css';

interface PaketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  historyData: RupHistoryEntry[];
  loadingHistory: boolean;
  statusKurasi?: string;
  catatanKurasi?: string;
  rekomendasiKurasi?: string;
}

export function PaketDetailModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  historyData, 
  loadingHistory,
  statusKurasi,
  catatanKurasi,
  rekomendasiKurasi
}: PaketDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.body}>
        {statusKurasi && statusKurasi !== 'Belum Dikurasi' && (
          <div style={{
            padding: '16px', 
            marginBottom: '20px', 
            backgroundColor: statusKurasi === 'Akurat' ? 'var(--emerald-50, #ecfdf5)' : 'var(--red-50, #fef2f2)', 
            color: statusKurasi === 'Akurat' ? 'var(--emerald-900, #064e3b)' : 'var(--red-900, #7f1d1d)', 
            borderRadius: '12px', 
            border: `1px solid ${statusKurasi === 'Akurat' ? 'var(--emerald-200, #a7f3d0)' : 'var(--red-200, #fecaca)'}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ margin: '0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {statusKurasi === 'Akurat' ? '✅' : '⚠️'} Analisis Kurasi AI
              </h4>
              <span style={{
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: statusKurasi === 'Akurat' ? 'var(--emerald-100, #d1fae5)' : 'var(--red-100, #fee2e2)',
                color: statusKurasi === 'Akurat' ? 'var(--emerald-700, #047857)' : 'var(--red-700, #b91c1c)'
              }}>
                {statusKurasi.toUpperCase()}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {catatanKurasi && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '10px 12px', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catatan Analisis</p>
                  <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>{catatanKurasi}</p>
                </div>
              )}
              
              {rekomendasiKurasi && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.6)', padding: '10px 12px', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rekomendasi Tindakan</p>
                  <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>{rekomendasiKurasi}</p>
                </div>
              )}
            </div>
          </div>
        )}
        {children}
        <RupHistoryTimeline data={historyData} loading={loadingHistory} />
      </div>
    </Modal>
  );
}
