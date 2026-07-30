'use client';

import { motion, type Variants } from 'framer-motion';
import { Building2, ShieldCheck, Users } from 'lucide-react';
import styles from './LandingAbout.module.css';

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const ROLES = [
  { icon: ShieldCheck, label: 'Administrator (UKPBJ)' },
  { icon: Building2, label: 'Sekretariat Jenderal' },
  { icon: Users, label: 'PPK' },
];

export function LandingAbout() {
  return (
    <section id="tentang" className={styles.section}>
      <motion.div
        className={styles.inner}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <div className={styles.text}>
          <span className={styles.eyebrow}>Tentang</span>
          <h2 className={styles.heading}>Dibangun untuk pengambil keputusan PBJ Kemnaker</h2>
          <p className={styles.body}>
            DEWA-PBJ membantu Kementerian Ketenagakerjaan memantau kesehatan proses pengadaan
            barang/jasa secara menyeluruh — dari perencanaan hingga realisasi — sehingga
            penyimpangan dan keterlambatan dapat dikenali sebelum berdampak lebih jauh.
          </p>
        </div>

        <ul className={styles.roles}>
          {ROLES.map(({ icon: Icon, label }) => (
            <li key={label} className={styles.role}>
              <span className={styles.roleIcon}>
                <Icon size={16} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
