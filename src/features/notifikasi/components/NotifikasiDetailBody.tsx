"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { kategoriVariant } from '@/lib/risiko/badge';
import { fmtInt, fmtPct, fmtRupiahDetail } from '@/lib/format';
import {
  DATA_QUALITY_FLAG_LABEL,
  EXECUTION_STATUS_LABEL,
  RISK_KATEGORI_LABEL,
} from '@/lib/risiko/types';
import { ALERT_TYPE_META, type NotifikasiItem } from '@/lib/notifikasi/alerts';
import type { NotifikasiDetail } from '@/lib/notifikasi/detail';
import styles from './NotifikasiDetailBody.module.css';

interface Props {
  item: NotifikasiItem;
  detail: NotifikasiDetail | null;
  loading: boolean;
}

const DASH = '—';

function text(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? DASH : s;
}

export function NotifikasiDetailBody({ item, detail, loading }: Props) {
  const risiko = detail?.risiko ?? null;
  const realisasi = detail?.realisasi ?? null;

  const pagu = item.pagu ?? 0;
  // Nilai dari daftar dipakai sampai query detail selesai, supaya angka tidak
  // "berkedip" dari kosong ke terisi saat panel dibuka.
  const nilaiRealisasi = realisasi?.total ?? item.realisasi ?? 0;
  const punyaRealisasi = realisasi != null || item.realisasi != null;
  const serapan = pagu > 0 ? (nilaiRealisasi / pagu) * 100 : null;
  const lebihPagu = pagu > 0 && nilaiRealisasi > pagu;
  const selisih = nilaiRealisasi - pagu;

  return (
    <div className={styles.body}>
      <header className={styles.intro}>
        <h3 className={styles.paketName}>{item.nama_paket || 'Tanpa Nama'}</h3>
        <p className={styles.paketCode}>{item.kd_rup}</p>
      </header>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Alasan Notifikasi</h4>
        <ul className={styles.reasons}>
          {item.types.map((type) => (
            <li key={type} className={styles.reason}>
              <span
                className={`${styles.reasonMark} ${styles[`mark_${ALERT_TYPE_META[type].tone}`]}`}
                aria-hidden="true"
              />
              <div className={styles.reasonText}>
                <span className={styles.reasonLabel}>{ALERT_TYPE_META[type].label}</span>
                <p className={styles.reasonDesc}>{ALERT_TYPE_META[type].description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Anggaran &amp; Realisasi</h4>
        <div className={styles.figures}>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Pagu</span>
            <span className={styles.figureValue}>{pagu > 0 ? fmtRupiahDetail(pagu) : DASH}</span>
          </div>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Realisasi</span>
            <span className={`${styles.figureValue} ${lebihPagu ? styles.figureDanger : ''}`}>
              {punyaRealisasi ? fmtRupiahDetail(nilaiRealisasi) : 'Belum ada'}
            </span>
          </div>
        </div>

        {serapan != null && punyaRealisasi && (
          <div className={styles.serapan}>
            <div className={styles.serapanHead}>
              <span className={styles.figureLabel}>Serapan terhadap pagu</span>
              <span className={`${styles.serapanValue} ${lebihPagu ? styles.figureDanger : ''}`}>
                {fmtPct(serapan, 1)}
              </span>
            </div>
            <div
              className={styles.track}
              role="img"
              aria-label={`Serapan ${fmtPct(serapan, 1)} dari pagu`}
            >
              <span
                className={`${styles.fill} ${lebihPagu ? styles.fillOver : ''}`}
                style={{ transform: `scaleX(${Math.min(Math.max(serapan, 0), 100) / 100})` }}
              />
            </div>
            <p className={styles.serapanNote}>
              {lebihPagu
                ? `Realisasi melampaui pagu sebesar ${fmtRupiahDetail(selisih)}.`
                : `Sisa pagu ${fmtRupiahDetail(Math.max(-selisih, 0))}.`}
            </p>
          </div>
        )}

        {realisasi && (
          <dl className={styles.fields}>
            <Field label="Status Transaksi" value={text(realisasi.status)} />
            <Field label="Jumlah Transaksi" value={fmtInt(realisasi.transaksi)} />
            <Field
              label="Terumumkan di SIRUP"
              value={realisasi.is_from_sirup == null ? DASH : realisasi.is_from_sirup ? 'Ya' : 'Tidak'}
            />
            <Field
              label="RUP Aktif"
              value={realisasi.status_aktif_rup == null ? DASH : realisasi.status_aktif_rup ? 'Ya' : 'Tidak'}
            />
          </dl>
        )}
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Identitas Paket</h4>
        <dl className={styles.fields}>
          <Field label="Satuan Kerja" value={text(item.satker)} />
          <Field label="Eselon 1" value={text(risiko?.eselon1)} />
          <Field label="PPK" value={text(risiko?.nama_ppk)} />
          <Field label="Tahun Anggaran" value={text(risiko?.tahun_anggaran)} />
          <Field label="Jenis Paket" value={text(risiko?.jenis_paket ?? item.jenis_paket)} />
          <Field label="Metode Pengadaan" value={text(item.metode_pengadaan)} />
          <Field label="Jenis Pengadaan" value={text(risiko?.jenis_pengadaan)} />
          <Field label="Sumber Dana" value={text(risiko?.sumber_dana)} />
          {risiko?.tipe_swakelola && (
            <Field label="Tipe Swakelola" value={text(risiko.tipe_swakelola)} />
          )}
        </dl>
      </section>

      {risiko && (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Penilaian Risiko</h4>
          <dl className={styles.fields}>
            <Field
              label="Kategori"
              value={
                risiko.kategori ? (
                  <Badge variant={kategoriVariant(risiko.kategori)}>
                    {RISK_KATEGORI_LABEL[risiko.kategori]}
                  </Badge>
                ) : (
                  DASH
                )
              }
            />
            <Field
              label="Skor Total"
              value={
                risiko.total_score != null
                  ? `${risiko.total_score} / ${risiko.max_score}`
                  : 'Tidak dapat dihitung'
              }
            />
            <Field
              label="Status Pelaksanaan"
              value={
                risiko.execution_status
                  ? EXECUTION_STATUS_LABEL[risiko.execution_status]
                  : DASH
              }
            />
            <Field label="Jumlah Revisi RUP" value={text(risiko.jumlah_revisi)} />
          </dl>

          {risiko.main_risk_driver && (
            <p className={styles.driver}>
              Pendorong risiko utama: <strong>{risiko.main_risk_driver}</strong>
            </p>
          )}

          {risiko.components.length > 0 && (
            <ul className={styles.components}>
              {risiko.components
                .filter((c) => c.applicable)
                .map((c) => (
                  <li key={c.code} className={styles.component}>
                    <div className={styles.componentHead}>
                      <span className={styles.componentLabel}>{c.label}</span>
                      <span className={styles.componentScore}>
                        {c.score != null ? `${c.score} / ${c.maxScore}` : 'Tidak dinilai'}
                      </span>
                    </div>
                    <p className={styles.componentReason}>{c.reason}</p>
                  </li>
                ))}
            </ul>
          )}

          {risiko.data_quality_flags.length > 0 && (
            <ul className={styles.flags}>
              {risiko.data_quality_flags.map((f) => (
                <li key={f} className={styles.flag}>
                  {DATA_QUALITY_FLAG_LABEL[f] ?? f}
                </li>
              ))}
            </ul>
          )}

          {risiko.calculated_at && (
            <p className={styles.calcNote}>
              Skor dihitung {new Date(risiko.calculated_at).toLocaleString('id-ID')}.
            </p>
          )}
        </section>
      )}

      {loading && (
        <p className={styles.loading}>
          <Loader2 size={14} className={styles.spin} aria-hidden="true" />
          Memuat rincian lengkap paket...
        </p>
      )}

      {!loading && !risiko && (
        <p className={styles.calcNote}>
          Paket ini belum tercatat di modul Risiko Pengadaan, sehingga rincian skor dan
          status pelaksanaan belum tersedia.
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={styles.fieldValue}>{value}</dd>
    </div>
  );
}
