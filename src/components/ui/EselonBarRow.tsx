import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Building2 } from 'lucide-react';
import { Card } from './Card';
import styles from './EselonBarRow.module.css';

interface EselonBarRowProps {
  name: string;
  pagu: number;
  realisasi: number;
  count: number;
  countLabel?: string;
  index?: number;
  onClick: () => void;
  formatRupiah: (n: number) => string;
}

export function EselonBarRow({
  name,
  pagu,
  realisasi,
  count,
  countLabel = 'Paket',
  index,
  onClick,
  formatRupiah,
}: EselonBarRowProps) {
  const pct = pagu > 0 ? (realisasi / pagu) * 100 : 0;
  const clampedPct = Math.min(Math.max(pct, 0), 100);
  const color = clampedPct > 75 ? '#06b6d4' : clampedPct > 40 ? '#f97316' : '#ef4444';
  const glow =
    clampedPct > 75 ? 'rgba(6, 182, 212, 0.35)' : clampedPct > 40 ? 'rgba(249, 115, 22, 0.35)' : 'rgba(239, 68, 68, 0.35)';

  return (
    <Card interactive padding="tight" className={styles.row} onClick={onClick}>
      <Card.Header className={styles.top}>
        <Card.Icon tone="neutral"><Building2 /></Card.Icon>
        {index != null && <span className={styles.rank}>{index + 1}</span>}
        <Card.Title className={styles.name} title={name}>{name}</Card.Title>
        <span className={styles.pct} style={{ color }}>{pct.toFixed(1)}%</span>
        <span className={styles.arrow}><ArrowRight size={16} /></span>
      </Card.Header>
      <Card.Body className={styles.body}>
      <div className={styles.track}>
        <motion.div
          className={styles.fill}
          style={{ background: color, boxShadow: `0 0 10px ${glow}` }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedPct}%` }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <div className={styles.meta}>
        <span>Pagu <span className={styles.metaVal}>{formatRupiah(pagu)}</span></span>
        <span className={styles.dotSep}>·</span>
        <span>Realisasi <span className={styles.metaVal} style={{ color }}>{formatRupiah(realisasi)}</span></span>
        <span className={styles.dotSep}>·</span>
        <span><span className={styles.metaVal}>{count}</span> {countLabel}</span>
      </div>
      </Card.Body>
    </Card>
  );
}
