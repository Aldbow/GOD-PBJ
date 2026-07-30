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
    description: 'Pantau realisasi anggaran dan progres paket pengadaan dalam satu layar.',
  },
  {
    icon: ShieldAlert,
    title: 'Deteksi Risiko Dini',
    description: 'Identifikasi paket berisiko lewat skor dan indikator peringatan otomatis.',
  },
  {
    icon: ShoppingCart,
    title: 'Realisasi Multi-Metode',
    description: 'Lacak E-Purchasing, Tender, Pengadaan Langsung, Penunjukan Langsung, dan Swakelola.',
  },
  {
    icon: GraduationCap,
    title: 'Penilaian ITKP',
    description: 'Nilai tingkat kematangan dan pemanfaatan sistem pengadaan tiap satuan kerja.',
  },
];

export function LandingFeatures() {
  return (
    <section id="modul" className={styles.section}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Modul</span>
        <h2 className={styles.heading}>Satu Dashboard, Seluruh Siklus Pengadaan</h2>
        <p className={styles.sub}>
          DEWA-PBJ merangkum data perencanaan, realisasi, dan risiko pengadaan Kementerian
          Ketenagakerjaan dalam satu tempat.
        </p>
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
