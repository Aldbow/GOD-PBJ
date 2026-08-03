"use client";

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { RupHistoryTimeline } from './RupHistoryTimeline';
import type { RupHistoryEntry } from '@/lib/paket/rupHistory';
import { useSession } from '@/components/auth/SessionProvider';
import { Sparkles, Loader2 } from 'lucide-react';
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
  kdRup?: string;
  onCurationSuccess?: (newData: any) => void;
}

export function PaketDetailModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  historyData, 
  loadingHistory,
  statusKurasi: initialStatus,
  catatanKurasi: initialCatatan,
  rekomendasiKurasi: initialRekomendasi,
  kdRup,
  onCurationSuccess
}: PaketDetailModalProps) {
  const { role } = useSession();
  const [isCurating, setIsCurating] = React.useState(false);
  const [localStatus, setLocalStatus] = React.useState(initialStatus);
  const [localCatatan, setLocalCatatan] = React.useState(initialCatatan);
  const [localRekomendasi, setLocalRekomendasi] = React.useState(initialRekomendasi);

  React.useEffect(() => {
    setLocalStatus(initialStatus);
    setLocalCatatan(initialCatatan);
    setLocalRekomendasi(initialRekomendasi);
  }, [initialStatus, initialCatatan, initialRekomendasi]);

  const statusKurasi = localStatus;
  const catatanKurasi = localCatatan;
  const rekomendasiKurasi = localRekomendasi;

  const handleKurasiUlang = async () => {
    if (!kdRup) return;
    setIsCurating(true);
    try {
      const res = await fetch('/api/kurasi/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kd_rup: kdRup })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLocalStatus(data.data.status_kurasi);
        setLocalCatatan(data.data.catatan_kurasi);
        setLocalRekomendasi(data.data.rekomendasi_kurasi);
        if (onCurationSuccess) onCurationSuccess(data.data);
      } else {
        alert('Gagal mengurasi: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      alert('Gagal menghubungi server.');
    } finally {
      setIsCurating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.body}>
        {statusKurasi && (
          <div style={{
            padding: '16px', 
            marginBottom: '20px', 
            backgroundColor: statusKurasi === 'Akurat' ? 'var(--emerald-50, #ecfdf5)' : (statusKurasi === 'Belum Dikurasi' ? 'var(--slate-50, #f8fafc)' : 'var(--red-50, #fef2f2)'), 
            color: statusKurasi === 'Akurat' ? 'var(--emerald-900, #064e3b)' : (statusKurasi === 'Belum Dikurasi' ? 'var(--slate-900, #0f172a)' : 'var(--red-900, #7f1d1d)'), 
            borderRadius: '12px', 
            border: `1px solid ${statusKurasi === 'Akurat' ? 'var(--emerald-200, #a7f3d0)' : (statusKurasi === 'Belum Dikurasi' ? 'var(--slate-300, #cbd5e1)' : 'var(--red-200, #fecaca)')}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ margin: '0', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {statusKurasi === 'Akurat' ? '✅' : (statusKurasi === 'Belum Dikurasi' ? '❔' : '⚠️')} Analisis Kurasi AI
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: statusKurasi === 'Akurat' ? 'var(--emerald-100, #d1fae5)' : (statusKurasi === 'Belum Dikurasi' ? 'var(--slate-200, #e2e8f0)' : 'var(--red-100, #fee2e2)'),
                  color: statusKurasi === 'Akurat' ? 'var(--emerald-700, #047857)' : (statusKurasi === 'Belum Dikurasi' ? 'var(--slate-700, #334155)' : 'var(--red-700, #b91c1c)')
                }}>
                  {statusKurasi.toUpperCase()}
                </span>
                
                {role === 'admin' && kdRup && (
                  <button
                    onClick={handleKurasiUlang}
                    disabled={isCurating}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(0,0,0,0.1)',
                      cursor: isCurating ? 'not-allowed' : 'pointer',
                      opacity: isCurating ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      color: 'var(--slate-700)'
                    }}
                    onMouseEnter={(e) => {
                      if(!isCurating) {
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if(!isCurating) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {isCurating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>Kurasi Ulang</span>
                  </button>
                )}
              </div>
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
