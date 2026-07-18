"use client";

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { PaketDetail } from '@/features/paket/components/PaketDetail';
import { motion, AnimatePresence } from 'framer-motion';
import { Satker, Package, RiskLevel } from '@/types';
import styles from './DrilldownView.module.css';

export function DrilldownView() {
  const [satkers, setSatkers] = useState<{ value: string, label: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [satkerData, setSatkerData] = useState<Satker | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<'semua' | RiskLevel>('semua');
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all satker lists for dropdown
  useEffect(() => {
    fetch('/api/satker')
      .then(res => res.json())
      .then((data: Satker[]) => {
        const formatted = data.map(s => ({ value: s.id, label: s.name }));
        setSatkers(formatted);
        if (formatted.length > 0) {
          setSelectedId(formatted[0].value);
        }
      });
  }, []);

  // Fetch selected satker
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/satker?id=${selectedId}`)
      .then(res => res.json())
      .then(data => {
        setSatkerData(data);
        setLoading(false);
      });
  }, [selectedId]);

  const fmtRupiah = (m: number) => 'Rp ' + m.toFixed(2).replace('.', ',') + ' M';

  const pkgs = satkerData?.packages || [];
  const jumlah = pkgs.length;
  const totalNilai = pkgs.reduce((s, p) => s + p.nilai, 0);
  const rataRealisasi = jumlah ? Math.round(pkgs.reduce((s, p) => s + p.realisasi, 0) / jumlah) : 0;
  const tinggi = pkgs.filter(p => p.risiko === 'tinggi').length;

  const filteredPkgs = pkgs.filter(p => riskFilter === 'semua' || p.risiko === riskFilter);

  const riskOptions: Array<{ key: 'semua' | RiskLevel; label: string }> = [
    { key: 'semua', label: 'Semua' },
    { key: 'tinggi', label: 'Tinggi' },
    { key: 'sedang', label: 'Sedang' },
    { key: 'rendah', label: 'Rendah' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className={styles.header}>
        <div>
          <p className={styles.selectLabel}>Pilih satuan kerja</p>
          <Select
            options={satkers}
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ width: 250 }}
          />
        </div>
        <div className={styles.filterGroup}>
          {riskOptions.map(opt => (
            <button
              key={opt.key}
              className={`${styles.filterBtn} ${riskFilter === opt.key ? styles.active : ''}`}
              onClick={() => setRiskFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <p className={styles.loading}>Memuat data satuan kerja...</p>
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.statGrid}>
              <StatCard label="Jumlah paket" value={jumlah} />
              <StatCard label="Total nilai pagu" value={fmtRupiah(totalNilai)} />
              <StatCard label="Rata-rata realisasi" value={rataRealisasi} unit="%" />
              <StatCard label="Paket risiko tinggi" value={tinggi} tone={tinggi > 0 ? 'danger' : 'default'} />
            </div>

            <div className={styles.pkgList}>
              <AnimatePresence>
                {filteredPkgs.length > 0 ? filteredPkgs.map((p, i) => (
                    <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className={styles.pkgCard}
                    onClick={() => { setSelectedPkgId(p.id); setIsModalOpen(true); }}
                  >
                    <div className={styles.pkgTop}>
                      <p className={styles.pkgName}>{p.nama}</p>
                      <Badge variant={p.risiko}>Risiko {p.risiko}</Badge>
                    </div>
                    <div className={styles.pkgStats}>
                      <div><span className={styles.statLabel}>Nilai pagu</span><span className={styles.statVal}>{fmtRupiah(p.nilai)}</span></div>
                      <div><span className={styles.statLabel}>Status SPSE</span><span className={styles.statVal}>{p.spse}</span></div>
                      <div>
                        <span className={styles.statLabel}>Kesesuaian SIRUP</span>
                        <span className={styles.statVal} style={{ color: p.sirup ? 'var(--teal-600)' : 'var(--red-600)' }}>{p.sirup ? '✓ sesuai' : '✗ tidak sesuai'}</span>
                      </div>
                      <div><span className={styles.statLabel}>Realisasi</span><span className={styles.statVal}>{p.realisasi}%</span></div>
                      <div><span className={styles.statLabel}>PIC</span><span className={styles.statVal}>{p.pic}</span></div>
                    </div>
                  </motion.div>
                )) : (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.emptyState}>Tidak ada paket pada kategori risiko ini.</motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail Paket">
        {selectedPkgId && <PaketDetail id={selectedPkgId} />}
      </Modal>
    </motion.div>
  );
}
