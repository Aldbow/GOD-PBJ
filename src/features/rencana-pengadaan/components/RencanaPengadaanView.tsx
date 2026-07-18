"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Select } from '@/components/ui/Select';
import styles from './RencanaPengadaanView.module.css';

const SORT_OPTIONS = [
  { value: 'NAMA_ASC', label: 'Nama Satuan Kerja (A-Z)' },
  { value: 'NAMA_DESC', label: 'Nama Satuan Kerja (Z-A)' },
  { value: 'BELANJA_DESC', label: 'Belanja Pengadaan (Tertinggi)' },
  { value: 'BELANJA_ASC', label: 'Belanja Pengadaan (Terendah)' },
];

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
      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}

      {loading ? (
        <p className={styles.loading}>Memuat data dari Supabase...</p>
      ) : (
        <>
          <div className={styles.toolbar}>
            <input
              type="text"
              placeholder="Cari nama satuan kerja..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.search}
            />

            <div className={styles.sortWrap}>
              <span className={styles.sortLabel}>Urutkan:</span>
              <Select
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.thead}>
                  <th className={styles.th}>No</th>
                  <th className={styles.th}>Nama Satuan Kerja</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Belanja Pengadaan</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length > 0 ? (
                  currentData.map((item, index) => (
                    <tr key={index} className={styles.row}>
                      <td className={styles.cellNo}>{startIndex + index + 1}</td>
                      <td className={styles.cellName}>{item.nama_satuan_kerja || '-'}</td>
                      <td className={styles.cellVal}>
                        {fmtRupiah(Number(item.belanja_pengadaan))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className={styles.empty}>
                      Tidak ada data yang ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={styles.pageBtn}
              >
                Sebelumnya
              </button>
              <span className={styles.pageInfo}>
                Halaman <strong style={{ color: 'var(--text-primary)' }}>{currentPage}</strong> dari {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={styles.pageBtn}
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
