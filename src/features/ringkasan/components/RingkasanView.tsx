"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RealisasiChart } from './RealisasiChart';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { motion, Variants } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { ExportDataModal } from '@/components/ui/ExportDataModal';
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
  const [allRisks, setAllRisks] = useState<any[]>([]);
  const [risks, setRisks] = useState<{ satkerName: string, pkg: Package }[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCurationLoading, setIsCurationLoading] = useState(false);
  const [isCurationAutoRunning, setIsCurationAutoRunning] = useState(false);
  const [curationMessage, setCurationMessage] = useState<string | null>(null);

  const stopAutoCurationRef = useRef(false);

  const handleRunCuration = async () => {
    setIsCurationLoading(true);
    setIsCurationAutoRunning(true);
    stopAutoCurationRef.current = false;
    setCurationMessage('Memulai kurasi otomatis...');
    let totalProcessedSoFar = 0;

    while (!stopAutoCurationRef.current) {
      try {
        const res = await fetch('/api/kurasi', { method: 'POST' });
        const data = await res.json();
        
        if (res.ok) {
           const processed = data.total_processed || 0;
           totalProcessedSoFar += processed;
           
           if (processed === 0) {
              setCurationMessage(`Selesai! Tidak ada lagi data yang perlu dikurasi. (Total yang berhasil dikurasi: ${totalProcessedSoFar} paket)`);
              break;
           }

           setCurationMessage(`Telah mengurasi ${totalProcessedSoFar} data. Menunggu 5 detik untuk permintaan berikutnya...`);
           await new Promise(resolve => setTimeout(resolve, 5000));
        } else if (res.status === 429) {
           setCurationMessage(`Batas akses (Rate limit) API tercapai. Menunggu 30 detik sebelum melanjutkan...`);
           await new Promise(resolve => setTimeout(resolve, 30000));
        } else {
           setCurationMessage(`Terjadi kesalahan: ${data.error}. Menghentikan kurasi otomatis.`);
           break;
        }
      } catch (err) {
        setCurationMessage('Gagal menghubungi server API. Menghentikan kurasi otomatis.');
        break;
      }
    }
    
    setIsCurationLoading(false);
    setIsCurationAutoRunning(false);
  };

  const handleStopCuration = () => {
    stopAutoCurationRef.current = true;
    setCurationMessage('Perintah berhenti diterima. Menunggu AI menyelesaikan paket yang sedang dikerjakan...');
  };

  useEffect(() => {
    // Fetch all risks for export, display top 5
    const fetchRisks = async () => {
      const { data, error } = await supabase
        .from('view_dashboard_gabungan_satker')
        .select('*');

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
        
        // Sort by risk priority if needed, here we just take the raw data
        const flatRisks = topRisks.map((r: any) => ({
          satkerName: r.satkerName,
          kd_rup: r.pkg.id,
          nama: r.pkg.nama,
          pic: r.pkg.pic,
          nilai_rp: r.pkg.nilai * 1000000000,
          realisasi: r.pkg.realisasi,
          spse: r.pkg.spse,
          risiko: r.pkg.risiko,
        }));

        setAllRisks(flatRisks);
        setRisks(topRisks.slice(0, 5));
      }
    };
    fetchRisks();
  }, []);

  const exportColumns: any[] = [
    { key: 'satkerName', label: 'Nama Satker' },
    { key: 'kd_rup', label: 'Kode RUP' },
    { key: 'nama', label: 'Nama Paket', width: 40 },
    { key: 'pic', label: 'Nama PPK' },
    { key: 'nilai_rp', label: 'Pagu (Rp)', type: 'currency' },
    { key: 'realisasi', label: 'Realisasi (%)', type: 'number' },
    { key: 'spse', label: 'Status SPSE' },
    { key: 'risiko', label: 'Tingkat Risiko' },
  ];

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

      {/* AI Curation Indicators */}
      <SectionHeader 
        title="Status Validasi / Kurasi AI" 
        caption="Tingkat kepatuhan metode vs pagu (Data Dummy/Proyeksi)"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            {isCurationAutoRunning && (
              <button 
                className={styles.exportBtnHeader} 
                onClick={handleStopCuration}
                style={{ backgroundColor: 'var(--red-50, #fef2f2)', color: 'var(--red-700, #b91c1c)', borderColor: 'var(--red-200, #fecaca)' }}
              >
                Hentikan Kurasi
              </button>
            )}
            <button 
              className={styles.exportBtnHeader} 
              onClick={handleRunCuration}
              disabled={isCurationLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isCurationLoading ? 0.7 : 1, cursor: isCurationLoading ? 'not-allowed' : 'pointer' }}
            >
              {isCurationLoading && <Loader2 size={16} className={styles.spinner} style={{ animation: 'spin 1s linear infinite' }} />}
              {isCurationLoading ? 'AI Sedang Bekerja...' : 'Jalankan Kurasi Otomatis'}
            </button>
          </div>
        }
      />
      {isCurationLoading && (
        <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--blue-950, #eff6ff)', border: '1px solid var(--blue-200, #bfdbfe)' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--blue-900, #1e3a8a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            AI sedang menganalisa data. Mohon tunggu, proses ini mungkin memakan waktu hingga 15-30 detik...
          </p>
        </div>
      )}
      {!isCurationLoading && curationMessage && (
        <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--surface-sunken)', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)' }}>{curationMessage}</p>
        </div>
      )}
      <motion.div variants={itemVariants} className={styles.statGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '24px' }}>
        <StatCard
          label="Total Data Akurat"
          value="1,050"
          unit=" pkt"
          tone="good"
          hint="✅ Sesuai aturan pengadaan"
        />
        <StatCard
          label="Data Tidak Akurat"
          value="150"
          unit=" pkt"
          tone="danger"
          hint="❌ Menyalahi batas nilai/akun"
        />
        <StatCard
          label="Belum Dikurasi"
          value="24"
          unit=" pkt"
          tone="warn"
          hint="Menunggu pemrosesan"
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
        action={
          <button 
            className={styles.exportBtnHeader}
            onClick={() => setIsExportModalOpen(true)}
          >
            Export Data
          </button>
        }
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
      
      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Laporan Realisasi & Risiko PBJ"
        filename={`Laporan_Realisasi_${new Date().toISOString().slice(0,10)}`}
        columns={exportColumns}
        allData={allRisks}
        filteredData={allRisks}
      />
    </motion.div>
  );
}
