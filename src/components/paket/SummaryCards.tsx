"use client";

import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
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
          <motion.div key={card.key} whileHover={{ y: -2 }} className={`${styles.card} ${styles[`accent-${card.accent || 'neutral'}`]}`}>
            <div className={`${styles.iconWrap} ${styles[`iconWrap-${card.accent || 'neutral'}`]}`}>
              <card.icon size={24} />
            </div>
            <div className={styles.cardBody}>
              <p className={styles.cardLabel}>{card.label}</p>
              <div className={styles.cardValueRow}>
                <p className={styles.cardValue}>{card.value}</p>
                {card.badge && (
                  <Badge variant="default" className={`${styles.cardBadge} ${styles[`badge-${card.badgeTone || 'good'}`]}`}>
                    {card.badge}
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>
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
    <div className={styles.progressCard}>
      <div className={styles.progressHead}>
        <span className={styles.progressTitle}>{title}</span>
        <span className={styles.progressTotal}>{totalLabel}</span>
      </div>
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
    </div>
  );
}
