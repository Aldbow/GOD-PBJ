"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Package } from '@/types'; // we can reuse Badge/styles

export function EPurchasingView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch realisasi
        const { data: realisasi, error: err1 } = await supabase.from('realisasi_inaproc').select('*').limit(1000);
        if (err1) throw err1;

        if (!realisasi || realisasi.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // 2. Extract RUPs to join
        const rups = realisasi.map(r => r['Kode RUP']).filter(Boolean);

        // 3. Fetch matching paket_penyedia to get PAGU
        let paketMap: Record<string, any> = {};
        if (rups.length > 0) {
          // split into chunks if rups is too large, but 397 is fine for Supabase IN clause
          const { data: paket, error: err2 } = await supabase
            .from('api_paket_penyedia_terumumkan')
            .select('kd_rup, pagu, tgl_pengumuman_paket, status_aktif_rup, nama_ppk')
            .in('kd_rup', rups);
            
          if (err2) throw err2;
          
          if (paket) {
            paket.forEach(p => {
              paketMap[p.kd_rup] = p;
            });
          }
        }

        // 4. Join them
        const combined = realisasi.map(r => {
          const p = paketMap[r['Kode RUP']];
          return {
            ...r,
            pagu: p?.pagu || 0,
            tgl_pengumuman_paket: p?.tgl_pengumuman_paket,
            status_aktif_rup: p?.status_aktif_rup,
            nama_ppk: p?.nama_ppk,
          };
        });

        setData(combined);
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Gagal memuat data dari Supabase.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const fmtRupiah = (m: number) => {
    if (!m) return 'Rp 0';
    if (m >= 1e9) return 'Rp ' + (m / 1e9).toFixed(2).replace('.', ',') + ' M';
    if (m >= 1e6) return 'Rp ' + (m / 1e6).toFixed(2).replace('.', ',') + ' Jt';
    return 'Rp ' + m.toLocaleString('id-ID');
  };

  const totalPaket = data.length;
  const totalPagu = data.reduce((s, d) => s + (d.pagu || 0), 0);
  const totalRealisasi = data.reduce((s, d) => s + (d['Total Nilai (Rp)'] || 0), 0);
  const persentase = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : 0;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>Realisasi E-Purchasing V6</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Data langsung dari Supabase Database (Gabungan INAPROC & SIRUP)</p>
      </div>

      {error && (
        <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          {error}. Pastikan URL dan KEY Supabase di .env.local valid.
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat data dari Supabase...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
            <Card>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Jumlah Paket</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{totalPaket}</p>
            </Card>
            <Card>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Total Nilai Pagu</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{fmtRupiah(totalPagu)}</p>
            </Card>
            <Card>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Total Realisasi</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0, color: 'var(--teal-600)' }}>{fmtRupiah(totalRealisasi)}</p>
            </Card>
            <Card>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Persentase Realisasi</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 500, margin: 0 }}>{persentase}<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span></p>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentData.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, borderColor: 'var(--info-600)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                transition={{ duration: 0.15 }}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', willChange: 'transform' }}
                onClick={() => { setSelectedItem(p); setIsModalOpen(true); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: 0, lineHeight: 1.4 }}>{p['Nama Paket']}</p>
                  <Badge variant={p['Status Paket'] === 'COMPLETED' ? 'rendah' : 'sedang'}>{p['Status Paket']}</Badge>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, fontSize: 12 }}>
                  <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Penyedia</span><span style={{ fontFamily: 'var(--font-mono)' }}>{p['Nama Penyedia']}</span></div>
                  <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Nilai Pagu</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtRupiah(p.pagu)}</span></div>
                  <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Realisasi</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtRupiah(p['Total Nilai (Rp)'])}</span></div>
                  <div><span style={{ color: 'var(--text-tertiary)', display: 'block', marginBottom: 2, fontSize: 11 }}>Persentase</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--teal-600)' }}>{p.pagu > 0 ? ((p['Total Nilai (Rp)'] / p.pagu) * 100).toFixed(1) : 0}%</span></div>
                </div>
              </motion.div>
            ))}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1}
                  style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: currentPage === 1 ? 'var(--gray-100)' : 'var(--surface)', border: '1px solid var(--border)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
                >
                  Sebelumnya
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Halaman <strong style={{ color: 'var(--text-primary)' }}>{currentPage}</strong> dari {totalPages}
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', background: currentPage === totalPages ? 'var(--gray-100)' : 'var(--surface)', border: '1px solid var(--border)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail E-Purchasing">
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.4 }}>{selectedItem['Nama Paket']}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Penyedia: <strong style={{ color: 'var(--text-primary)' }}>{selectedItem['Nama Penyedia']}</strong>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--bg-page)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Kode RUP</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{selectedItem['Kode RUP']}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Metode Pengadaan</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{selectedItem['Metode Pengadaan']}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Pagu</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{fmtRupiah(selectedItem.pagu)}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Realisasi</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--teal-600)' }}>{fmtRupiah(selectedItem['Total Nilai (Rp)'])}</span></div>
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Informasi Instansi & Satker</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Instansi: {selectedItem['Nama Instansi']}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Satuan Kerja: {selectedItem['Nama Satuan Kerja']}</p>
              {selectedItem.nama_ppk && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>PPK: {selectedItem.nama_ppk}</p>}
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Detail Status</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Paket INAPROC: <strong style={{ color: 'var(--info-600)' }}>{selectedItem['Status Paket']}</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Aktif RUP: {selectedItem.status_aktif_rup === true ? 'Aktif' : 'Tidak / N/A'}</p>
              {selectedItem.tgl_pengumuman_paket && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Tanggal Pengumuman: {new Date(selectedItem.tgl_pengumuman_paket).toLocaleDateString('id-ID')}</p>}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
