"use client";

import React, { useEffect, useState } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RealisasiChart } from './RealisasiChart';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { motion, Variants } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Package } from '@/types';
import { supabase } from '@/lib/supabase';
import styles from './RingkasanView.module.css';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300 } }
};

export function RingkasanView() {
  const [risks, setRisks] = useState<{ satkerName: string, pkg: Package }[]>([]);

  useEffect(() => {
    // Fetch top risks from all satkers directly from Supabase
    const fetchRisks = async () => {
      const { data, error } = await supabase
        .from('view_dashboard_gabungan_satker')
        .select('*')
        .limit(5);

      if (data && !error) {
        const topRisks = data.map((row: any) => {
          const paguNum = Number(row.pagu) || 0;
          const totalNum = Number(row.total) || 0;
          const realisasi = paguNum > 0 ? Math.round((totalNum / paguNum) * 100) : 0;
          let risiko: 'tinggi' | 'sedang' | 'rendah' = 'rendah';
          if (paguNum > 1000000000 && realisasi === 0) {
            risiko = 'tinggi';
          } else if (realisasi < 50 && row.status !== 'Selesai' && row.status !== 'COMPLETED') {
            risiko = 'sedang';
          }

          return {
            satkerName: row.satker,
            pkg: {
              id: row.kd_rup,
              satkerId: row.satker,
              nama: row.rup_name || 'Tidak Diketahui',
              nilai: paguNum / 1000000000,
              spse: row.status || 'BELUM REALISASI',
              sirup: row.status_aktif_rup === true || row.status_aktif_rup === 'true',
              realisasi: Math.min(realisasi, 100),
              risiko,
              pic: row.nama_ppk || 'Tidak Diketahui'
            }
          };
        });
        setRisks(topRisks);
      }
    };
    fetchRisks();
  }, []);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show">
      {/* Banner */}
      <motion.div variants={itemVariants} className={styles.banner}>
        <div>
          <p className={styles.bannerEyebrow}>Proyeksi predikat ITKP tahun berjalan</p>
          <p className={styles.bannerValue}>
            Sangat baik <span className={styles.bannerSub}>(skor 87,4 / target 85)</span>
          </p>
        </div>
        <div className={styles.bannerProgress}>
          <ProgressBar value={87} label="87% tercapai" />
        </div>
      </motion.div>

      {/* ITKP Indicators */}
      <SectionHeader title="Indikator ITKP" />
      <motion.div variants={itemVariants} className={styles.statGrid}>
        <StatCard
          label="Reviu RUP"
          value="92"
          unit="/100"
          tone="good"
          hint="▲ stabil, di atas target"
        />
        <StatCard
          label="Pemilihan penyedia"
          value="85"
          unit="/100"
          tone="warn"
          hint="▬ mendekati ambang batas"
        />
        <StatCard
          label="Tingkat kematangan UKPBJ"
          value="90"
          unit="/100"
          tone="good"
          hint="▲ naik dari kuartal lalu"
        />
        <StatCard
          label="Kualifikasi & kompetensi SDM PBJ"
          value="68"
          unit="/100"
          tone="danger"
          hint="⚠ perlu intervensi pelatihan"
        />
      </motion.div>

      {/* Chart */}
      <motion.div variants={itemVariants}>
        <RealisasiChart />
      </motion.div>

      {/* Risks */}
      <SectionHeader
        title="Register risiko lintas satker"
        caption="data ilustratif dari 5 satker contoh"
      />
      <motion.div variants={itemVariants} className={styles.riskList}>
        {risks.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.riskRow}>
                <Skeleton width={92} height={22} radius="var(--radius-pill)" />
                <div className={styles.riskBody}>
                  <Skeleton width="52%" height={13} />
                  <Skeleton width="72%" height={11} style={{ marginTop: 7 }} />
                </div>
                <Skeleton width={80} height={12} />
              </div>
            ))
          : risks.map((r, i) => (
              <motion.div key={i} whileHover={{ x: 3 }} className={styles.riskRow}>
                <Badge variant={r.pkg.risiko}>Risiko {r.pkg.risiko}</Badge>
                <div className={styles.riskBody}>
                  <p className={styles.riskName}>{r.pkg.nama}</p>
                  <p className={styles.riskMeta}>
                    Satker: {r.satkerName} · PIC: {r.pkg.pic} · {r.pkg.sirup ? 'sesuai SIRUP' : 'SIRUP belum sesuai'}
                  </p>
                </div>
                <a href={`/drilldown?satker=${encodeURIComponent(r.satkerName)}`} className={styles.riskLink}>
                  Lihat detail <ArrowRight size={14} />
                </a>
              </motion.div>
            ))}
      </motion.div>
    </motion.div>
  );
}
