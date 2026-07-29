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
import styles from '@/components/paket/paketView.module.css';

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
        {detail.components.map((c) => (
          <div key={c.code} className={styles.modalBox} style={{ marginBottom: 8 }}>
            <p className={styles.modalBoxText} style={{ fontWeight: 600 }}>
              {c.label}: {c.applicable ? (c.score != null ? `${c.score} / ${c.maxScore}` : 'Tidak dapat dinilai') : 'Tidak Berlaku'}
            </p>
            <p className={styles.modalText} style={{ margin: '2px 0' }}>
              Nilai mentah: {c.rawValue ?? '-'} {c.normalizedValue ? `(normalisasi: ${c.normalizedValue})` : ''}
            </p>
            <p className={styles.modalText} style={{ margin: '2px 0' }}>{c.reason}</p>
            <p className={styles.modalText} style={{ margin: '2px 0', opacity: 0.7 }}>Sumber: {c.sourceTable}</p>
          </div>
        ))}
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
          Dihitung: {new Date(detail.calculated_at).toLocaleString('id-ID')} · Versi aturan: {detail.rules_version}
        </p>
      </div>
    </>
  );
}
