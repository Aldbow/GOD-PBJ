"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from './PaketTable.module.css';

export interface PaketColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortAccessor?: (row: T) => number | string;
  render: (row: T) => React.ReactNode;
}

interface PaketTableProps<T> {
  columns: PaketColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyMessage?: string;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
}

export function PaketTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  pageSize = 20,
  emptyMessage = 'Tidak ada data ditemukan',
  defaultSortKey,
  defaultSortDir = 'desc',
}: PaketTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const sortColumn = columns.find((c) => c.key === sortKey);

  const sortedRows = useMemo(() => {
    if (!sortColumn?.sortAccessor) return rows;
    const accessor = sortColumn.sortAccessor;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return sortDir === 'asc' ? sa.localeCompare(sb, 'id') : sb.localeCompare(sa, 'id');
    });
    return copy;
  }, [rows, sortColumn, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = sortedRows.slice(startIndex, startIndex + pageSize);

  const handleSort = (col: PaketColumn<T>) => {
    if (!col.sortAccessor) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('desc');
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.th} ${col.align === 'right' ? styles.alignRight : col.align === 'center' ? styles.alignCenter : ''} ${col.sortAccessor ? styles.sortable : ''}`}
                  onClick={() => handleSort(col)}
                >
                  <span className={styles.thInner}>
                    {col.label}
                    {col.sortAccessor && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={getRowKey(row, startIndex + i)}
                className={onRowClick ? styles.rowClickable : undefined}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${styles.td} ${col.align === 'right' ? styles.alignRight : col.align === 'center' ? styles.alignCenter : ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedRows.length === 0 && <div className={styles.empty}>{emptyMessage}</div>}

      {sortedRows.length > 0 && (
        <div className={styles.footer}>
          <span className={styles.footerCount}>
            Menampilkan {startIndex + 1}–{Math.min(startIndex + pageSize, sortedRows.length)} dari {sortedRows.length} paket
          </span>
          {totalPages > 1 && (
            <div className={styles.pager}>
              <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <span className={styles.pageInfo}>
                Halaman <strong>{currentPage}</strong> dari {totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((p) => p + 1)}>
                Selanjutnya
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
