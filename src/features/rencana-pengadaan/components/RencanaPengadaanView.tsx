"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export function RencanaPengadaanView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NAMA_ASC');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    async function fetchData() {
      try {
        let allData: any[] = [];
        let offset = 0;
        const limit = 1000;

        while (true) {
          const { data, error } = await supabase
            .from('data_afirmasi_pdn_perencanaan')
            .select('nama_satuan_kerja, belanja_pengadaan')
            .range(offset, offset + limit - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;

          allData = [...allData, ...data];
          if (data.length < limit) break;
          offset += limit;
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

  // Filter
  const filteredData = data.filter((p) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = p.nama_satuan_kerja && p.nama_satuan_kerja.toLowerCase().includes(query);
    return matchesSearch;
  });

  // Sort
  const sortedData = [...filteredData].sort((a, b) => {
    const namaA = a.nama_satuan_kerja || '';
    const namaB = b.nama_satuan_kerja || '';
    const belanjaA = Number(a.belanja_pengadaan) || 0;
    const belanjaB = Number(b.belanja_pengadaan) || 0;

    switch (sortBy) {
      case 'NAMA_ASC': return namaA.localeCompare(namaB);
      case 'NAMA_DESC': return namaB.localeCompare(namaA);
      case 'BELANJA_DESC': return belanjaB - belanjaA;
      case 'BELANJA_ASC': return belanjaA - belanjaB;
      default: return namaA.localeCompare(namaB);
    }
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>Rencana Umum Pengadaan</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Data Rencana Umum Pengadaan</p>
      </div>

      {error && (
        <div style={{ background: 'var(--red-100)', color: 'var(--red-600)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Memuat data dari Supabase...</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Cari nama satuan kerja..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: '1 1 300px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
              />

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
                >
                  <option value="NAMA_ASC">Nama Satuan Kerja (A-Z)</option>
                  <option value="NAMA_DESC">Nama Satuan Kerja (Z-A)</option>
                  <option value="BELANJA_DESC">Belanja Pengadaan (Tertinggi)</option>
                  <option value="BELANJA_ASC">Belanja Pengadaan (Terendah)</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>No</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nama Satuan Kerja</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Belanja Pengadaan</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length > 0 ? (
                  currentData.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>{startIndex + index + 1}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.nama_satuan_kerja || '-'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {fmtRupiah(Number(item.belanja_pengadaan))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      Tidak ada data yang ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '10px 0' }}>
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
        </>
      )}
    </motion.div>
  );
}
