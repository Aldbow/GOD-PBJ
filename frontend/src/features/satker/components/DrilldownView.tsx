"use client";

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PaketDetail } from '@/features/paket/components/PaketDetail';
import { motion, AnimatePresence } from 'framer-motion';
import { Satker, Package, RiskLevel } from '@/types';

export function DrilldownView() {
  const [satkers, setSatkers] = useState<{ value: string, label: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string>('binapenta');
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
        setSatkers(data.map(s => ({ value: s.id, label: s.name })));
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

  const filterButtonStyle = (isActive: boolean) => ({
    fontSize: 12,
    padding: '5px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: isActive ? 'var(--info-100)' : 'var(--surface)',
    color: isActive ? 'var(--info-600)' : 'var(--text-secondary)',
    cursor: 'pointer',
    borderColor: isActive ? 'var(--info-600)' : 'var(--border)',
    transition: 'all 0.2s ease'
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>Pilih satuan kerja</p>
          <Select
            options={satkers}
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ width: 250 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={filterButtonStyle(riskFilter === 'semua')} onClick={() => setRiskFilter('semua')}>Semua</button>
          <button style={filterButtonStyle(riskFilter === 'tinggi')} onClick={() => setRiskFilter('tinggi')}>Tinggi</button>
          <button style={filterButtonStyle(riskFilter === 'sedang')} onClick={() => setRiskFilter('sedang')}>Sedang</button>
          <button style={filterButtonStyle(riskFilter === 'rendah')} onClick={() => setRiskFilter('rendah')}>Rendah</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat data satuan kerja...</p>
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 22 }}>
              <Card>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Jumlah paket</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{jumlah}</p>
              </Card>
              <Card>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Total nilai pagu</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{fmtRupiah(totalNilai)}</p>
              </Card>
              <Card>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Rata-rata realisasi</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{rataRealisasi}<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span></p>
              </Card>
              <Card variant={tinggi > 0 ? 'danger' : 'default'}>
                <p style={{ fontSize: 12, color: tinggi > 0 ? 'var(--red-600)' : 'var(--text-secondary)', margin: '0 0 8px' }}>Paket risiko tinggi</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0, color: tinggi > 0 ? 'var(--red-600)' : 'inherit' }}>{tinggi}</p>
              </Card>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AnimatePresence>
                {filteredPkgs.length > 0 ? filteredPkgs.map((p, i) => (
                    <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    whileHover={{ y: -2, borderColor: 'var(--info-600)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 8, cursor: 'pointer' }}
                    onClick={() => { setSelectedPkgId(p.id); setIsModalOpen(true); }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{p.nama}</p>
                      <Badge variant={p.risiko}>Risiko {p.risiko}</Badge>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, fontSize: 12, marginBottom: 14 }}>
                      <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Nilai pagu</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtRupiah(p.nilai)}</span></div>
                      <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Status SPSE</span><span style={{ fontFamily: 'var(--font-mono)' }}>{p.spse}</span></div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Kesesuaian SIRUP</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: p.sirup ? 'var(--teal-600)' : 'var(--red-600)' }}>{p.sirup ? '✓ sesuai' : '✗ tidak sesuai'}</span>
                      </div>
                      <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Realisasi</span><span style={{ fontFamily: 'var(--font-mono)' }}>{p.realisasi}%</span></div>
                      <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>PIC</span><span style={{ fontFamily: 'var(--font-mono)' }}>{p.pic}</span></div>
                    </div>
                  </motion.div>
                )) : (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tidak ada paket pada kategori risiko ini.</motion.p>
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
