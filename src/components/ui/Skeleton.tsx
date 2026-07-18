import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, radius, className, style }: SkeletonProps) {
  return (
    <span
      className={`${styles.skeleton} ${className || ''}`}
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
