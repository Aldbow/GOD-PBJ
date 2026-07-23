"use client";

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PaketDetail } from '@/features/paket/components/PaketDetail';
import { MetodePengadaanChart } from './MetodePengadaanChart';
import { motion, AnimatePresence } from 'framer-motion';
import { PPK, Package } from '@/types';
import styles from './PPKView.module.css';

export function PPKView() {
  const [roster, setRoster] = useState<PPK[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [ppkData, setPpkData] = useState<{ ppk: PPK, packages: Package[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch roster
  useEffect(() => {
    fetch('/api/ppk')
      .then(res => res.json())
      .then((data: PPK[]) => {
        setRoster(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      });
  }, []);

  // Fetch details when selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/ppk?id=${selectedId}`)
      .then(res => res.json())
      .then(data => {
        setPpkData(data);
        setLoading(false);
      });
  }, [selectedId]);

  if (!roster.length) return <div style={{ padding: 20 }}>Loading...</div>;

  const fmtRupiah = (m: number) => 'Rp ' + m.toFixed(2).replace('.', ',') + ' M';
  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const pkgs = ppkData?.packages || [];
  const jumlah = pkgs.length;
  const tinggi = pkgs.filter(p => p.risiko === 'tinggi').length;
  const totalNilai = pkgs.reduce((s, p) => s + p.nilai, 0);
  const rataRealisasi = jumlah ? Math.round(pkgs.reduce((s, p) => s + p.realisasi, 0) / jumlah) : 0;

  const needsAction = pkgs.find(p => p.risiko !== 'rendah' || !p.sirup);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className={styles.identity}>
        <motion.div
          key={ppkData?.ppk?.name}
          initial={{ scale: 0.5, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className={styles.avatar}
        >
          {ppkData?.ppk ? initials(ppkData.ppk.name) : '...'}
        </motion.div>
        <div>
          <p className={styles.idName}>{ppkData?.ppk?.name} — PPK</p>
          <p className={styles.idSub}>{ppkData?.ppk?.satkerName}</p>
        </div>
        <div className={styles.idSelect}>
          <Select
            options={roster.map(r => ({ value: r.id, label: `${r.name} — ${r.satkerName}` }))}
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <p className={styles.loading}>Memuat data PPK...</p>
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.statGrid}>
              <StatCard label="Paket ditangani" value={jumlah} />
              <StatCard label="Risiko tinggi" value={tinggi} tone={tinggi > 0 ? 'danger' : 'default'} />
              <StatCard label="Total nilai pagu" value={fmtRupiah(totalNilai)} />
              <StatCard label="Rata-rata realisasi" value={rataRealisasi} unit="%" />
            </div>

            <MetodePengadaanChart packages={pkgs} />

            <SectionHeader title="Paket di bawah tanggung jawab saya" />
            <div className={styles.pkgList}>
              {pkgs.length > 0 ? pkgs.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ delay: i * 0.05 }}
                  className={styles.pkgRow}
                  onClick={() => { setSelectedPkgId(p.id); setIsModalOpen(true); }}
                >
                  <Badge variant={p.risiko}>Risiko {p.risiko}</Badge>
                  <div className={styles.pkgBody}>
                    <p className={styles.pkgName}>{p.nama}</p>
                    <p className={styles.pkgMeta}>Status SPSE: {p.spse} · SIRUP: {p.sirup ? 'sesuai' : 'tidak sesuai'} · realisasi {p.realisasi}%</p>
                  </div>
                </motion.div>
              )) : (
                <p className={styles.emptyState}>Tidak ada paket aktif untuk PIC ini.</p>
              )}
            </div>

            {needsAction && (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.actionBox}>
                <p className={styles.actionText}>
                  <strong>Tindakan diperlukan:</strong> {needsAction.nama} berstatus risiko {needsAction.risiko} {!needsAction.sirup ? 'dan belum sesuai SIRUP' : ''}.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail Paket">
        {selectedPkgId && <PaketDetail id={selectedPkgId} />}
      </Modal>
    </motion.div>
  );
}
