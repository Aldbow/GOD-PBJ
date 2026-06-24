"use client";

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { PPK, Package } from '@/types';
import Link from 'next/link';

export function PPKView() {
  const [roster, setRoster] = useState<PPK[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [ppkData, setPpkData] = useState<{ ppk: PPK, packages: Package[] } | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 18, flexWrap: 'wrap' }}>
        <motion.div
          key={ppkData?.ppk?.name}
          initial={{ scale: 0.5, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--info-100)', color: 'var(--info-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 }}
        >
          {ppkData?.ppk ? initials(ppkData.ppk.name) : '...'}
        </motion.div>
        <div>
          <p style={{ fontWeight: 500, fontSize: 14, margin: 0 }}>{ppkData?.ppk?.name} — PPK</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{ppkData?.ppk?.satkerName}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
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
             <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat data PPK...</p>
          </motion.div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 22 }}>
              <Card>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Paket ditangani</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{jumlah}</p>
              </Card>
              <Card variant={tinggi > 0 ? 'danger' : 'default'}>
                <p style={{ fontSize: 12, color: tinggi > 0 ? 'var(--red-600)' : 'var(--text-secondary)', margin: '0 0 8px' }}>Risiko tinggi</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0, color: tinggi > 0 ? 'var(--red-600)' : 'inherit' }}>{tinggi}</p>
              </Card>
              <Card>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Total nilai pagu</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{fmtRupiah(totalNilai)}</p>
              </Card>
              <Card>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Rata-rata realisasi</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{rataRealisasi}<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span></p>
              </Card>
            </div>

            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>Paket di bawah tanggung jawab saya</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {pkgs.length > 0 ? pkgs.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <Badge variant={p.risiko}>Risiko {p.risiko}</Badge>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{p.nama}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '3px 0 0' }}>Status SPSE: {p.spse} · SIRUP: {p.sirup ? 'sesuai' : 'tidak sesuai'} · realisasi {p.realisasi}%</p>
                  </div>
                </motion.div>
              )) : (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tidak ada paket aktif untuk PIC ini.</p>
              )}
            </div>

            {needsAction && (
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'var(--amber-100)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--amber-600)' }}>
                  <strong>Tindakan diperlukan:</strong> {needsAction.nama} berstatus risiko {needsAction.risiko} {!needsAction.sirup ? 'dan belum sesuai SIRUP' : ''}.
                </p>
                <Link href="/drilldown">
                  <Button variant="secondary" size="md">Lihat detail paket →</Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
