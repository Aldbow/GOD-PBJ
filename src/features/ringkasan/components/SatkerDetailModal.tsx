"use client";

import React, { useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { aggregate, type GabunganRow, type RingkasanFilterValue } from '../lib/ringkasanData';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { RealisasiDonutChart, RealisasiStackedBarChart } from './charts/SatkerRealisasiCharts';
import styles from './RingkasanView.module.css';

interface SatkerDetailModalProps {
  satkerName: string | null;
  rows: GabunganRow[];
  onClose: () => void;
}

export function SatkerDetailModal({ satkerName, rows, onClose }: SatkerDetailModalProps) {
  
  const detailData = useMemo(() => {
    if (!satkerName) return null;
    const filter: RingkasanFilterValue = { satker: satkerName, ppk: '' };
    return aggregate(rows, filter);
  }, [satkerName, rows]);

  return (
    <Modal isOpen={!!satkerName} onClose={onClose} title="Detail Satuan Kerja">
      {satkerName && detailData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {satkerName}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Analisis detail realisasi anggaran per metode pengadaan
            </p>
          </div>

          <div>
            <SectionHeader title="Proporsi Realisasi (Rupiah)" caption="Metode pengadaan dengan serapan anggaran terbesar" />
            <div className={styles.panel} style={{ padding: '24px' }}>
              <RealisasiDonutChart metode={detailData.metode} />
            </div>
          </div>

          <div>
            <SectionHeader title="Pagu vs Realisasi per Metode" caption="Perbandingan progres capaian dan sisa anggaran tiap metode" />
            <div className={styles.panel} style={{ padding: '24px 24px 16px' }}>
              <RealisasiStackedBarChart metode={detailData.metode} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
