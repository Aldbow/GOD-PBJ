"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Wallet, TrendingUp, ListTodo, Search, CheckCircle2, Clock } from 'lucide-react';

export function PengadaanLangsungView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        let allData: any[] = [];
        let offset = 0;
        const limit = 1000;
        
        while (true) {
          const { data, error } = await supabase
            .from('view_dashboard_pengadaan_langsung')
            .select('*')
            .range(offset, offset + limit - 1);
            
          if (error) throw error;
          if (!data || data.length === 0) break;
          
          allData = [...allData, ...data];
          if (data.length < limit) break;
          offset += limit;
        }

        if (allData.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        setData(allData);
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

  const filteredData = data.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (p.rup_name && p.rup_name.toLowerCase().includes(query)) ||
      (p.kd_rup && String(p.kd_rup).toLowerCase().includes(query)) ||
      (p.kode_penyedia && p.kode_penyedia.toLowerCase().includes(query)) ||
      (p.satker && p.satker.toLowerCase().includes(query)) ||
      (p.nama_ppk && p.nama_ppk.toLowerCase().includes(query));
    return matchesSearch;
  });

  const totalPagu = data.reduce((s, d) => s + (Number(d.pagu) || 0), 0);
  const totalRealisasi = data.reduce((s, d) => s + (Number(d.total) || 0), 0);
  const totalBelumRealisasi = Math.max(0, totalPagu - totalRealisasi);

  const persentase = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : '0.0';
  const persentaseBelumRealisasi = totalPagu > 0 ? ((totalBelumRealisasi / totalPagu) * 100).toFixed(1) : '0.0';

  const totalPaket = data.length;
  const paketSelesai = data.filter(p => (Number(p.total) || 0) > 0).length;
  const paketBelumSelesai = totalPaket - paketSelesai;

  // Pagination for Paket view
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const sortedPackages = [...filteredData].sort((a, b) => (Number(b.pagu) || 0) - (Number(a.pagu) || 0));

  const totalPages = Math.ceil(sortedPackages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = sortedPackages.slice(startIndex, startIndex + itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>Realisasi Pengadaan Langsung</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Data dari pencatatan Non-Tender Pengadaan Langsung (SIRUP & SIKaP)</p>
      </div>

      {error && (
        <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          {error}. Pastikan View SQL sudah dieksekusi di Supabase.
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat data dari Supabase...</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={18} color="var(--info-600)" />
                Ringkasan Keuangan
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                
                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderLeft: '4px solid var(--info-600)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--info-100)', color: 'var(--info-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Total Anggaran (Pagu)</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(totalPagu)}</p>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderLeft: '4px solid var(--teal-600)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--teal-100)', color: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Total Realisasi</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(totalRealisasi)}</p>
                      <Badge variant="default" style={{ background: 'var(--teal-100)', color: 'var(--teal-700)', border: 'none', padding: '2px 8px' }}>{persentase}%</Badge>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', borderLeft: '4px solid var(--amber-600)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--amber-100)', color: 'var(--amber-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ListTodo size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Sisa Anggaran</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fmtRupiah(totalBelumRealisasi)}</p>
                      <Badge variant="default" style={{ background: 'var(--amber-100)', color: 'var(--amber-700)', border: 'none', padding: '2px 8px' }}>{persentaseBelumRealisasi}%</Badge>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* Section: Status Paket */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Package size={18} color="var(--info-600)" />
                Status Paket Pengadaan Langsung
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                
                {/* Total Paket */}
                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-page)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                    <Package size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>Total Seluruh Paket</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{totalPaket}</p>
                  </div>
                </motion.div>

                {/* Selesai */}
                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--teal-100)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--teal-100)', color: 'var(--teal-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--teal-700)', margin: '0 0 4px', fontWeight: 500 }}>Terdapat Realisasi</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--teal-700)' }}>{paketSelesai}</p>
                  </div>
                </motion.div>

                {/* Belum Selesai */}
                <motion.div whileHover={{ y: -2 }} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--amber-100)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--amber-100)', color: 'var(--amber-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--amber-700)', margin: '0 0 4px', fontWeight: 500 }}>Belum Terealisasi</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--amber-700)' }}>{paketBelumSelesai}</p>
                  </div>
                </motion.div>

              </div>
            </div>
            
            {/* Visual Progress Bar */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Progres Penyerapan Anggaran</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Pagu: {fmtRupiah(totalPagu)}</span>
              </div>
              <div style={{ height: 12, background: 'var(--bg-page)', borderRadius: 6, overflow: 'hidden', display: 'flex', border: '1px solid var(--border)' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(persentase))}%` }} transition={{ duration: 1 }} style={{ background: 'var(--teal-600)', height: '100%' }} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Number(persentaseBelumRealisasi))}%` }} transition={{ duration: 1 }} style={{ background: 'var(--amber-600)', height: '100%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--teal-600)' }}/> Terealisasi ({persentase}%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber-600)' }}/> Sisa ({persentaseBelumRealisasi}%)</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Cari nama paket, kode RUP, penyedia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: '1 1 300px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            />
          </div>

          {/* Vertical Cards for Pakets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentData.map((p, i) => (
              <motion.div
                key={p.kd_rup || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, borderColor: 'var(--info-600)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                transition={{ duration: 0.15 }}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', willChange: 'transform', display: 'flex', flexDirection: 'column', gap: 6 }}
                onClick={() => { setSelectedItem(p); setIsModalOpen(true); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }} title={p.rup_name}>{p.rup_name}</p>
                  <Badge variant={(Number(p.total) || 0) > 0 ? 'rendah' : 'sedang'} style={{ padding: '2px 6px', fontSize: 9 }}>
                    {(Number(p.total) || 0) > 0 ? 'SUDAH REALISASI' : 'BELUM REALISASI'}
                  </Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-page)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }} title="Kode RUP">RUP: {p.kd_rup || '-'}</span>
                    <span>Pagu: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmtRupiah(Number(p.pagu))}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>Realisasi: <strong style={{ fontFamily: 'var(--font-mono)', color: ((Number(p.total) || 0) > (Number(p.pagu) || 0)) ? 'var(--red-600)' : 'var(--text-primary)' }}>{fmtRupiah(Number(p.total))}</strong></span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: ((Number(p.total) || 0) > (Number(p.pagu) || 0)) ? 'var(--red-600)' : 'var(--teal-700)', background: ((Number(p.total) || 0) > (Number(p.pagu) || 0)) ? 'var(--red-100)' : 'var(--teal-100)', padding: '2px 6px', borderRadius: 4 }}>
                      {Number(p.pagu) > 0 ? ((Number(p.total) / Number(p.pagu)) * 100).toFixed(1) : 0}%
                    </strong>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {sortedPackages.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                Tidak ada data ditemukan
              </div>
            )}
            
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

      {/* Detail Card Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detail Pengadaan Langsung">
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.4 }}>{selectedItem.rup_name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Penyedia: <strong style={{ color: 'var(--text-primary)' }}>{selectedItem.kode_penyedia || '-'}</strong>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'var(--bg-page)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Kode RUP</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{selectedItem.kd_rup}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Metode Pengadaan</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>Pengadaan Langsung</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Pagu</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{fmtRupiah(Number(selectedItem.pagu))}</span></div>
              <div><span style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Nilai Realisasi</span><span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--teal-600)' }}>{fmtRupiah(Number(selectedItem.total))}</span></div>
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Informasi Instansi & Satker</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Satuan Kerja: {selectedItem.satker || '-'}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>PPK: {selectedItem.nama_ppk || '-'}</p>
            </div>

            <div>
              <h4 style={{ fontSize: 14, margin: '0 0 8px', color: 'var(--text-primary)' }}>Detail Status</h4>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Paket: <strong style={{ color: 'var(--info-600)' }}>{(Number(selectedItem.total) || 0) > 0 ? 'Terdapat Realisasi' : 'Belum Ada Realisasi'}</strong></p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>Status Aktif RUP: {selectedItem.status_aktif_rup === true ? 'Aktif' : 'Tidak / N/A'}</p>
            </div>
            
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
