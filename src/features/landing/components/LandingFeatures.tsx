'use client';

import { motion, type Variants } from 'framer-motion';
import { LayoutDashboard, ShieldAlert, ShoppingCart, GraduationCap, type LucideIcon } from 'lucide-react';
import styles from './LandingFeatures.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

type Feature = { icon: LucideIcon; title: string; description: string };

const FEATURES: Feature[] = [
  {
    icon: LayoutDashboard,
    title: 'Ringkasan Real-time',
    description: '',
  },
  {
    icon: ShieldAlert,
    title: 'Deteksi Risiko Dini',
    description: '',
  },
  {
    icon: ShoppingCart,
    title: 'Realisasi Multi-Metode',
    description: '',
  },
  {
    icon: GraduationCap,
    title: 'Penilaian ITKP',
    description: '',
  },
];

export function LandingFeatures() {
  return (
    <section id="modul" className={styles.section}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Modul</span>
        <h2 className={styles.heading}>Digital Early Warning Analytics</h2>
      </div>

      <motion.div
        className={styles.grid}
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <motion.div key={title} className={styles.card} variants={item}>
            <span className={styles.iconWrap}>
              <Icon size={20} />
            </span>
            <h3 className={styles.cardTitle}>{title}</h3>
            <p className={styles.cardDesc}>{description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
