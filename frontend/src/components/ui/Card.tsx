import React from 'react';
import styles from './Card.module.css';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: 'default' | 'danger' | 'warning' | 'info';
  interactive?: boolean;
}

export function Card({ variant = 'default', interactive = false, className, children, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={interactive ? { y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" } : undefined}
      className={`${styles.card} ${styles[variant]} ${interactive ? styles.interactive : ''} ${className || ''}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
