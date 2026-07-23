"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, FileWarning, TrendingUp, CheckCircle2, Filter } from 'lucide-react';
import { anomaliOf, ANOMALI_LABEL, type AnomaliJenis, type AnomaliRow, type AnomaliSummary } from '@/lib/anomali';
import { fmtRupiah, fmtInt } from '@/lib/format';
import styles from './AnomaliPanel.module.css';

// Badge ringkas untuk baris tabel yang terdeteksi anomali.
export function AnomaliBadge({ row }: { row: AnomaliRow }) {
  const jenis = anomaliOf(row);
  if (jenis.length === 0) return null;
  const tip = jenis.map((j) => ANOMALI_LABEL[j]).join(' • ');
  return (
    <span className={styles.rowBadge} title={tip}>
      <AlertTriangle size={10} /> Anomali
    </span>
  );
}

interface Props {
  summary: AnomaliSummary;
  activeFilter?: AnomaliJenis[];
  onToggleFilter?: (jenis: AnomaliJenis) => void;
  title?: string;
}

interface TileDef {
  jenis: AnomaliJenis;
  label: string;
  desc: string;
  icon: typeof AlertTriangle;
  severity: 'critical' | 'serious';
  count: number;
  nilai: number;
  nilaiLabel: string;
}

export function AnomaliPanel({ summary, activeFilter = [], onToggleFilter, title = 'Deteksi Anomali' }: Props) {
  const tiles: TileDef[] = [
    {
      jenis: 'tanpa_rup',
      label: 'Realisasi Tanpa RUP',
      desc: 'Ada realisasi tanpa RUP terumumkan',
      icon: FileWarning,
      severity: 'critical',
      count: summary.tanpaRup.count,
      nilai: summary.tanpaRup.nilai,
      nilaiLabel: 'Nilai realisasi',
    },
    {
      jenis: 'lebih_pagu',
      label: 'Realisasi > Pagu',
      desc: 'Realisasi melampaui pagu anggaran',
      icon: TrendingUp,
      severity: 'serious',
      count: summary.lebihPagu.count,
      nilai: summary.lebihPagu.nilai,
      nilaiLabel: 'Kelebihan',
    },
  ];

  const clickable = Boolean(onToggleFilter);

  return (
    <div className={styles.section}>
      <h3 className={styles.title}>
        <AlertTriangle size={18} className={styles.titleIcon} />
        {title}
        {summary.totalPaket > 0 ? (
          <span className={styles.totalBadge}>{fmtInt(summary.totalPaket)} paket</span>
        ) : (
          <span className={styles.okBadge}>
            <CheckCircle2 size={13} /> Bersih
          </span>
        )}
      </h3>

      {summary.totalPaket === 0 ? (
        <div className={styles.empty}>
          <CheckCircle2 size={18} />
          Tidak ada anomali terdeteksi pada data ini.
        </div>
      ) : (
        <div className={styles.grid}>
          {tiles.map((t) => {
            const Icon = t.icon;
            const active = activeFilter.includes(t.jenis);
            const disabled = t.count === 0;
            const content = (
              <>
                <div className={`${styles.iconWrap} ${styles[`sev-${t.severity}`]}`}>
                  <Icon size={22} />
                </div>
                <div className={styles.body}>
                  <p className={styles.label}>{t.label}</p>
                  <div className={styles.valueRow}>
                    <span className={styles.count}>{fmtInt(t.count)}</span>
                    <span className={styles.countUnit}>paket</span>
                  </div>
                  <p className={styles.nilai}>
                    {t.nilaiLabel}: <strong>{fmtRupiah(t.nilai)}</strong>
                  </p>
                  <p className={styles.desc}>{t.desc}</p>
                </div>
                {clickable && !disabled && (
                  <span className={styles.filterHint}>
                    <Filter size={11} /> {active ? 'aktif' : 'filter'}
                  </span>
                )}
              </>
            );

            if (clickable) {
              return (
                <motion.button
                  key={t.jenis}
                  type="button"
                  whileHover={disabled ? undefined : { y: -2 }}
                  className={`${styles.tile} ${styles[`tile-${t.severity}`]} ${active ? styles.tileActive : ''}`}
                  onClick={() => !disabled && onToggleFilter?.(t.jenis)}
                  disabled={disabled}
                  aria-pressed={active}
                >
                  {content}
                </motion.button>
              );
            }
            return (
              <div key={t.jenis} className={`${styles.tile} ${styles[`tile-${t.severity}`]}`}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
