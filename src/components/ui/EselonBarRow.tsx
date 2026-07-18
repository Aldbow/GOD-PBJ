import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index != null ? Math.min(index * 0.03, 0.3) : 0 }}
      className={styles.row}
      onClick={onClick}
    >
      <div className={styles.top}>
        {index != null && <span className={styles.rank}>{index + 1}</span>}
        <span className={styles.name} title={name}>{name}</span>
        <span className={styles.pct} style={{ color }}>{pct.toFixed(1)}%</span>
        <span className={styles.arrow}><ArrowRight size={16} /></span>
      </div>
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
    </motion.div>
  );
}
