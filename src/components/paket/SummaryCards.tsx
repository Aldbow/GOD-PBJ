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
