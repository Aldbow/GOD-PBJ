import React from 'react';
import styles from './ProgressBar.module.css';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        <motion.div
          className={styles.fill}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
}
