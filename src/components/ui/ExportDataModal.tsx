import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from './Portal';
import { X, FileSpreadsheet, FileText, FileDown, CheckSquare, Square, Download, Lock } from 'lucide-react';
import { exportToExcel, exportToPDF, exportToCSV, ExportColumn } from '@/lib/utils/exportUtils';
import styles from './ExportDataModal.module.css';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  columns: any[];
  allData: any[]; // Total raw data available
  filteredData: any[]; // Data currently matching filters
  /**
   * Cakupan data sudah ditentukan oleh kebijakan akses, bukan oleh pengguna —
   * pilihan Terfilter/Semua disembunyikan dan `filteredData` selalu dipakai.
   * Tanpa ini, dua radio dengan jumlah baris identik akan tampak seperti
   * pilihan padahal bukan.
   */
  scopeLocked?: boolean;
  /** Alasan penguncian, ditampilkan di tempat grup radio. */
  scopeNotice?: string;
}

export function ExportDataModal({
  isOpen,
  onClose,
  title,
  filename,
  columns,
  allData,
  filteredData,
  scopeLocked = false,
  scopeNotice
}: ExportDataModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [dataScope, setDataScope] = useState<'filtered' | 'all'>('filtered');
  
  // Track selected columns (default all selected)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(c => c.key));
  
  const [isExporting, setIsExporting] = useState(false);

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleSelectAllColumns = () => {
    if (selectedColumns.length === columns.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(columns.map(c => c.key));
    }
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      alert("Pilih setidaknya satu kolom untuk diexport!");
      return;
    }

    setIsExporting(true);
    
    // Allow UI to update to show loading state
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const activeColumns = columns.filter(c => selectedColumns.includes(c.key));
      const activeData = !scopeLocked && dataScope === 'all' ? allData : filteredData;

      const exportOptions = {
        filename,
        title,
        columns: activeColumns,
        data: activeData
      };

      if (selectedFormat === 'excel') {
        await exportToExcel(exportOptions);
      } else if (selectedFormat === 'pdf') {
        exportToPDF(exportOptions);
      } else {
        exportToCSV(exportOptions);
      }
      
      onClose();
    } catch (err) {
      console.error("Export failed:", err);
      alert("Terjadi kesalahan saat meng-export data.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div key="export-modal" className={styles.overlay}>
            <motion.div 
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <Download size={20} className={styles.headerIcon} />
              <h3>Export Data</h3>
            </div>
            <button onClick={onClose} className={styles.closeBtn} disabled={isExporting}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.content}>
            {/* Format Selection */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Pilih Format</h4>
              <div className={styles.formatGrid}>
                <button 
                  className={`${styles.formatBtn} ${selectedFormat === 'excel' ? styles.activeFormat : ''}`}
                  onClick={() => setSelectedFormat('excel')}
                >
                  <FileSpreadsheet size={24} className={styles.formatIcon} style={{ color: '#10b981' }} />
                  <span>Excel (.xlsx)</span>
                </button>
                <button 
                  className={`${styles.formatBtn} ${selectedFormat === 'pdf' ? styles.activeFormat : ''}`}
                  onClick={() => setSelectedFormat('pdf')}
                >
                  <FileText size={24} className={styles.formatIcon} style={{ color: '#ef4444' }} />
                  <span>PDF Report</span>
                </button>
                <button 
                  className={`${styles.formatBtn} ${selectedFormat === 'csv' ? styles.activeFormat : ''}`}
                  onClick={() => setSelectedFormat('csv')}
                >
                  <FileDown size={24} className={styles.formatIcon} style={{ color: '#6366f1' }} />
                  <span>CSV Mentah</span>
                </button>
              </div>
            </div>

            {/* Data Scope Selection */}
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Cakupan Data</h4>
              {scopeLocked ? (
                <div className={styles.scopeLocked}>
                  <Lock size={15} className={styles.scopeLockedIcon} />
                  <div>
                    <p className={styles.scopeLockedValue}>{filteredData.length} baris</p>
                    {scopeNotice && <p className={styles.scopeLockedNote}>{scopeNotice}</p>}
                  </div>
                </div>
              ) : (
                <div className={styles.scopeOptions}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="dataScope"
                      value="filtered"
                      checked={dataScope === 'filtered'}
                      onChange={() => setDataScope('filtered')}
                    />
                    <span>Data Terfilter ({filteredData.length} baris)</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="dataScope"
                      value="all"
                      checked={dataScope === 'all'}
                      onChange={() => setDataScope('all')}
                    />
                    <span>Semua Data ({allData.length} baris)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Column Selection */}
            <div className={styles.section}>
              <div className={styles.columnHeader}>
                <h4 className={styles.sectionTitle}>Pilih Kolom</h4>
                <button className={styles.selectAllBtn} onClick={handleSelectAllColumns}>
                  {selectedColumns.length === columns.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>
              <div className={styles.columnGrid}>
                {columns.map(col => (
                  <div 
                    key={col.key} 
                    className={`${styles.columnItem} ${selectedColumns.includes(col.key) ? styles.columnItemActive : ''}`}
                    onClick={() => toggleColumn(col.key)}
                  >
                    {selectedColumns.includes(col.key) ? (
                      <CheckSquare size={16} className={styles.checkboxIconActive} />
                    ) : (
                      <Square size={16} className={styles.checkboxIcon} />
                    )}
                    <span className={styles.columnLabel}>{col.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={isExporting}>
              Batal
            </button>
            <button 
              className={styles.exportBtn} 
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
            >
              {isExporting ? (
                <span className={styles.loadingWrapper}>
                  <span className={styles.spinner}></span>
                  Memproses...
                </span>
              ) : (
                <>
                  <Download size={16} />
                  Download
                </>
              )}
            </button>
          </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
