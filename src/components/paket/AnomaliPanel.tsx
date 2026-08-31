"use client";

import React from 'react';
import { AlertTriangle, FileWarning, TrendingUp, CheckCircle2, Filter } from 'lucide-react';
import { anomaliOf, ANOMALI_LABEL, type AnomaliJenis, type AnomaliRow, type AnomaliSummary } from '@/lib/anomali';
import { fmtRupiah, fmtInt } from '@/lib/format';
import { Card, type CardTone } from '@/components/ui/Card';
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

  // 'critical' = risiko, 'serious' = peringatan. Warnanya hanya di Card.Icon.
  const tint: Record<TileDef['severity'], CardTone> = {
    critical: 'risk',
    serious: 'warning',
  };

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
        <Card>
          <Card.Body className={styles.empty}>
            Tidak ada anomali terdeteksi pada data ini.
          </Card.Body>
        </Card>
      ) : (
        <div className={styles.grid}>
          {tiles.map((t) => {
            const Icon = t.icon;
            const active = activeFilter.includes(t.jenis);
            const disabled = t.count === 0;
            const content = (
              <>
                <Card.Header>
                  <Card.Icon tone={tint[t.severity]}><Icon /></Card.Icon>
                  <Card.Label as="span">{t.label}</Card.Label>
                  {clickable && !disabled && (
                    <Card.Action as="span">
                      <Filter size={11} /> {active ? 'aktif' : 'filter'}
                    </Card.Action>
                  )}
                </Card.Header>
                <Card.Body className={styles.body}>
                  <div className={styles.valueRow}>
                    <span className={styles.count}>{fmtInt(t.count)}</span>
                    <span className={styles.countUnit}>paket</span>
                  </div>
                  <p className={styles.nilai}>
                    {t.nilaiLabel}: <strong>{fmtRupiah(t.nilai)}</strong>
                  </p>
                </Card.Body>
                <Card.Footer>{t.desc}</Card.Footer>
              </>
            );

            if (clickable) {
              return (
                <Card
                  key={t.jenis}
                  as="button"
                  interactive={!disabled}
                  type="button"
                  className={`${styles.tile} ${active ? styles.tileActive : ''}`}
                  onClick={() => !disabled && onToggleFilter?.(t.jenis)}
                  disabled={disabled}
                  aria-pressed={active}
                >
                  {content}
                </Card>
              );
            }
            return (
              <Card key={t.jenis} className={styles.tile}>
                {content}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
