"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, type CardTone } from '@/components/ui/Card';
import styles from './SummaryCards.module.css';

export interface MetricCardDef {
  key: string;
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  badge?: string;
  badgeTone?: 'good' | 'warn';
  accent?: 'info' | 'teal' | 'amber' | 'indigo' | 'purple' | 'neutral';
}

// Aksen kartu hanya hidup di tint Card.Icon. Palet lama dipetakan ke empat
// rona resmi: netral/anggaran, positif/realisasi, peringatan, risiko.
const TINT: Record<NonNullable<MetricCardDef['accent']>, CardTone> = {
  info: 'neutral',
  neutral: 'neutral',
  indigo: 'neutral',
  purple: 'neutral',
  teal: 'positive',
  amber: 'warning',
};

interface MetricGridProps {
  title: string;
  icon: LucideIcon;
  cards: MetricCardDef[];
}

export function MetricGrid({ title, icon: TitleIcon, cards }: MetricGridProps) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        <TitleIcon size={18} color="var(--info-600)" />
        {title}
      </h3>
      <div className={styles.grid}>
        {cards.map((card) => (
          <Card key={card.key}>
            <Card.Header>
              <Card.Icon tone={TINT[card.accent || 'neutral']}><card.icon /></Card.Icon>
              <Card.Label>{card.label}</Card.Label>
            </Card.Header>
            <Card.Body className={styles.cardBody}>
              <div className={styles.cardValueRow}>
                <p className={styles.cardValue}>{card.value}</p>
                {card.badge && (
                  <Badge variant="default" className={`${styles.cardBadge} ${styles[`badge-${card.badgeTone || 'good'}`]}`}>
                    {card.badge}
                  </Badge>
                )}
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 'info' (biru) dan 'amber' (kuning) sengaja dipakai ulang dari warna flag
// "Metode" di tabel (lihat metodeDefault/metodeDikecualikan di
// paketView.module.css) — bukan warna baru, supaya arti warnanya konsisten
// di seluruh halaman ini: biru = Pengadaan Langsung, kuning = Dikecualikan.
type RealisasiSegmentColor = 'info' | 'amber' | 'teal';

const SEGMENT_BAR_CLASS: Record<RealisasiSegmentColor, string> = {
  info: styles.rincianSegmentInfo,
  amber: styles.pencatatanSegmentWarning,
  teal: styles.pencatatanSegmentPositive,
};

const SEGMENT_DOT_CLASS: Record<RealisasiSegmentColor, string> = {
  info: styles.legendDotInfo,
  amber: styles.legendDotRemaining,
  teal: styles.legendDotDone,
};

interface RealisasiCardSegment {
  color: RealisasiSegmentColor;
  label: string;
  value: React.ReactNode;
  /** Angka mentah — dipakai sebagai bobot flex-grow bar, bukan ditampilkan. */
  amount: number;
}

interface RealisasiCardDef {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  /** Dua bagian nyata dari total kartu ini — bukan metrik buatan untuk
   *  mengisi ruang. Transaksional pecah menurut metode aslinya (Pengadaan
   *  Langsung/Dikecualikan); Pencatatan menurut status paketnya. */
  first: RealisasiCardSegment;
  second: RealisasiCardSegment;
  emptyMessage?: string;
}

interface RealisasiRincianGridProps {
  title: string;
  icon: LucideIcon;
  /** Ditampilkan di kanan judul seksi. */
  totalLabel: string;
  left: RealisasiCardDef;
  right: RealisasiCardDef;
}

function RealisasiCard({ def }: { def: RealisasiCardDef }) {
  const total = def.first.amount + def.second.amount;
  const hasSplit = total > 0;

  return (
    <Card>
      <Card.Header>
        <Card.Icon tone="neutral"><def.icon /></Card.Icon>
        <Card.Label>{def.label}</Card.Label>
      </Card.Header>
      <Card.Body>
        <p className={styles.rincianValue}>{def.value}</p>
        {hasSplit ? (
          <>
            <div className={styles.pencatatanBar}>
              <span className={SEGMENT_BAR_CLASS[def.first.color]} style={{ flex: `${def.first.amount} 0 0%` }} />
              <span className={SEGMENT_BAR_CLASS[def.second.color]} style={{ flex: `${def.second.amount} 0 0%` }} />
            </div>
            <div className={styles.pencatatanLegend}>
              <div className={styles.pencatatanLegendItem}>
                <span className={`${styles.legendDot} ${SEGMENT_DOT_CLASS[def.first.color]}`} />
                <span className={styles.pencatatanLegendLabel}>{def.first.label}</span>
                <span className={styles.pencatatanLegendValue}>{def.first.value}</span>
              </div>
              <div className={styles.pencatatanLegendItem}>
                <span className={`${styles.legendDot} ${SEGMENT_DOT_CLASS[def.second.color]}`} />
                <span className={styles.pencatatanLegendLabel}>{def.second.label}</span>
                <span className={styles.pencatatanLegendValue}>{def.second.value}</span>
              </div>
            </div>
          </>
        ) : (
          <p className={styles.pencatatanEmpty}>{def.emptyMessage || 'Belum ada realisasi.'}</p>
        )}
      </Card.Body>
    </Card>
  );
}

/** Dua kartu sejajar dengan kerangka identik — ikon+label, angka besar, bar
 *  proporsi, dua baris legenda — supaya keduanya terasa setara. Setaranya
 *  bukan dari basa-basi visual: kedua kartu memang benar-benar pecah jadi
 *  dua bagian nyata (lihat RealisasiCardDef.first/second), cuma sumber
 *  pecahannya beda per kartu. */
export function RealisasiRincianGrid({ title, icon: TitleIcon, totalLabel, left, right }: RealisasiRincianGridProps) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>
        <TitleIcon size={18} color="var(--info-600)" />
        {title}
        <span className={styles.progressTotal}>{totalLabel}</span>
      </h3>
      <div className={styles.grid}>
        <RealisasiCard def={left} />
        <RealisasiCard def={right} />
      </div>
    </div>
  );
}

interface DualProgressBarProps {
  title: string;
  totalLabel: string;
  donePct: number;
  remainingPct: number;
  doneLabel: string;
  remainingLabel: string;
}

export function DualProgressBar({ title, totalLabel, donePct, remainingPct, doneLabel, remainingLabel }: DualProgressBarProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Icon tone="positive"><TrendingUp /></Card.Icon>
        <Card.Title>{title}</Card.Title>
        <span className={styles.progressTotal}>{totalLabel}</span>
      </Card.Header>
      <Card.Body>
      <div className={styles.progressTrack}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, donePct)}%` }}
          transition={{ duration: 1 }}
          className={styles.progressDone}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, remainingPct)}%` }}
          transition={{ duration: 1 }}
          className={styles.progressRemaining}
        />
      </div>
      <div className={styles.progressLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotDone}`} /> {doneLabel} ({donePct.toFixed(1)}%)
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotRemaining}`} /> {remainingLabel} ({remainingPct.toFixed(1)}%)
        </span>
      </div>
      </Card.Body>
    </Card>
  );
}
