import React from 'react';
import styles from './Badge.module.css';
import { motion, HTMLMotionProps } from 'framer-motion';

export type BadgeVariant = 'tinggi' | 'sedang' | 'rendah' | 'default';

interface BadgeProps extends HTMLMotionProps<"span"> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${styles.badge} ${styles[variant]} ${className || ''}`}
      {...props}
    >
      {children}
    </motion.span>
  );
}
