import React from 'react';
import styles from './Card.module.css';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: 'default' | 'danger' | 'warning' | 'info';
  /** Kartu benar-benar bisa diklik — tambah cursor:pointer + lift saat hover. */
  interactive?: boolean;
  /** Lift halus saat hover tanpa menyiratkan bisa diklik (mis. stat/KPI card). */
  elevateOnHover?: boolean;
}

// Transition per-gesture (bukan top-level `transition`) supaya tidak menimpa
// animasi initial/animate yang mungkin dikirim consumer lewat props spread.
const HOVER_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };
const TAP_TRANSITION = { duration: 0.1, ease: [0.22, 1, 0.36, 1] as const };

export function Card({
  variant = 'default',
  interactive = false,
  elevateOnHover = false,
  className,
  children,
  ...props
}: CardProps) {
  const lift = interactive || elevateOnHover;
  return (
    <motion.div
      whileHover={lift ? { y: -2, transition: HOVER_TRANSITION } : undefined}
      whileTap={interactive ? { y: 0, scale: 0.995, transition: TAP_TRANSITION } : undefined}
      className={`${styles.card} ${styles[variant]} ${interactive ? styles.interactive : ''} ${elevateOnHover ? styles.elevateOnHover : ''} ${className || ''}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
