"use client";

import React from 'react';
import { fmtRupiahDetail } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { kategoriVariant } from '@/lib/risiko/badge';
import {
  RISK_KATEGORI_LABEL,
  EXECUTION_STATUS_LABEL,
  DATA_QUALITY_FLAG_LABEL,
  type RiskDetail,
} from '@/lib/risiko/types';
import { DollarSign, Clock, PenTool, Target, FileText, Activity, CheckCircle } from 'lucide-react';
import styles from '@/components/paket/paketView.module.css';

const getIconForCode = (code: string) => {
  switch(code) {
    case 'pagu': return <DollarSign size={16} />;
    case 'sisa_waktu': return <Clock size={16} />;
    case 'jumlah_revisi': return <PenTool size={16} />;
    case 'metode': return <Target size={16} />;
    case 'jenis': return <FileText size={16} />;
    case 'sumber_dana': return <Activity size={16} />;
    default: return <CheckCircle size={16} />;
  }
}

const getScoreBadgeVariant = (score: number | null) => {
  if (score === 3) return 'tinggi';
  if (score === 2) return 'sedang';
  if (score === 1) return 'rendah';
  return 'default';
}

interface Props {
  detail: RiskDetail;
}

export function RisikoDetailBody({ detail }: Props) {
  return (
    <>
      <div>
        <h3 className={styles.modalTitle}>{detail.nama_paket || 'Tanpa Nama'}</h3>
        <p className={styles.modalSubLabel}>Jenis Paket</p>
        <div className={styles.modalBox}>
          <p className={styles.modalBoxText}>{detail.jenis_paket}</p>
        </div>
      </div>

      <div className={styles.modalGrid}>
        <div>
          <span className={styles.modalFieldLabel}>Kode RUP</span>
          <span className={styles.modalFieldValue}>{detail.kd_rup}</span>
        </div>
        <div>
          <span className={styles.modalFieldLabel}>Total Nilai Pagu</span>
          <span className={styles.modalFieldValue}>{detail.pagu != null ? fmtRupiahDetail(detail.pagu) : '-'}</span>
        </div>
        <div className={styles.modalDivider} />
        <div>
          <span className={styles.modalFieldLabel}>Skor Total</span>
          <span className={styles.modalFieldValueStrong}>
            {detail.total_score != null ? `${detail.total_score} / ${detail.max_score}` : 'Tidak dapat dihitung'}
          </span>
        </div>
        <div>
          <span className={styles.modalFieldLabel}>Kategori Risiko</span>
          <span className={styles.modalFieldValue}>
            <Badge variant={kategoriVariant(detail.kategori)}>{RISK_KATEGORI_LABEL[detail.kategori]}</Badge>
          </span>
        </div>
      </div>

      <div>
        <h4 className={styles.modalSectionTitle}>Status Pelaksanaan</h4>
        <p className={styles.modalText}>
          Status: <strong className={styles.modalStatusStrong}>{EXECUTION_STATUS_LABEL[detail.execution_status]}</strong>
        </p>
        <p className={styles.modalText}>Sumber bukti: {detail.execution_evidence_source || '-'}</p>
        <p className={styles.modalText}>Tanggal bukti: {detail.execution_evidence_date || '-'}</p>
      </div>

      <div>
        <h4 className={styles.modalSectionTitle}>Rincian Komponen Skor</h4>
      <div style={{ display: 'grid', gap: '12px' }}>
        {detail.components
          .filter((c) => {
            if (detail.jenis_paket?.toLowerCase() === 'swakelola') {
              if (['metode', 'jenis', 'sumber_dana'].includes(c.code)) {
                return false;
              }
            }
            return true;
          })
          .map((c) => (
          <div key={c.code} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '16px',
            background: 'var(--surface-raised, var(--surface))',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '8px', background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>
                  {getIconForCode(c.code)}
                </span>
                <strong style={{ fontSize: '14px', fontWeight: 600 }}>{c.label}</strong>
              </div>
              <div>
                {c.applicable ? (
                  c.score != null ? (
                    <Badge variant={getScoreBadgeVariant(c.score)}>Skor: {c.score} / {c.maxScore}</Badge>
                  ) : (
                    <Badge variant="default">Tidak dinilai</Badge>
                  )
                ) : (
                  <Badge variant="default">Tidak Berlaku</Badge>
                )}
              </div>
            </div>
            
            <div style={{ paddingLeft: '40px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {c.reason}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--surface-sunken)', borderRadius: '6px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono, monospace)', border: '1px solid var(--border)' }}>
                  Data: {c.rawValue ?? '-'}
                </span>
                {c.normalizedValue && (
                  <span style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--surface-sunken)', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                    Kategori: {c.normalizedValue}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      {detail.transaction_refs.length > 0 && (
        <div>
          <h4 className={styles.modalSectionTitle}>Referensi Transaksi</h4>
          {detail.transaction_refs.map((t, i) => (
            <p key={i} className={styles.modalText}>{t.label}: {t.code}</p>
          ))}
        </div>
      )}

      {detail.data_quality_flags.length > 0 && (
        <div>
          <h4 className={styles.modalSectionTitle}>Masalah Kualitas Data</h4>
          {detail.data_quality_flags.map((f) => (
            <p key={f} className={styles.modalText}>
              <Badge variant="tinggi">{f}</Badge> {DATA_QUALITY_FLAG_LABEL[f]}
            </p>
          ))}
        </div>
      )}

      <div>
        <h4 className={styles.modalSectionTitle}>Informasi Instansi &amp; Satker</h4>
        <p className={styles.modalText}>Eselon 1: {detail.eselon1 || '-'}</p>
        <p className={styles.modalText}>Satuan Kerja: {detail.satker || '-'}</p>
        <p className={styles.modalText}>PPK: {detail.nama_ppk || '-'}</p>
      </div>

      <div>
        <h4 className={styles.modalSectionTitle}>Perhitungan</h4>
        <p className={styles.modalText} style={{ opacity: 0.7 }}>
          Dihitung: {new Date(detail.calculated_at).toLocaleString('id-ID')}
        </p>
      </div>
    </>
  );
}
