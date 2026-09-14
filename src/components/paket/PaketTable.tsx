"use client";

import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import styles from './PaketTable.module.css';

export interface PaketColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortAccessor?: (row: T) => number | string;
  /** Set to false to make this column non-sortable. Defaults to sortable. */
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
}

/** Recursively extract plain text from a rendered ReactNode for sorting. */
function extractText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (React.isValidElement(node)) return extractText((node.props as { children?: React.ReactNode }).children);
  return '';
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

  // Kembali ke halaman 1 begitu kumpulan barisnya berganti (hasil pencarian
  // atau filter baru). Disetel saat render, bukan lewat useEffect: versi efek
  // berjalan setelah commit, jadi React sempat melukis halaman lama di atas
  // data baru lalu meralatnya — satu render tambahan dan satu kedipan per
  // pencarian. Pola ini yang direkomendasikan React untuk state turunan prop.
  const [rowsSeen, setRowsSeen] = useState(rows);
  if (rowsSeen !== rows) {
    setRowsSeen(rows);
    setPage(1);
  }

  const sortColumn = columns.find((c) => c.key === sortKey);
  const isSortable = (col: PaketColumn<T>) => col.sortable !== false;

  const sortedRows = useMemo(() => {
    if (!sortColumn || !isSortable(sortColumn)) return rows;
    const accessor = sortColumn.sortAccessor ?? ((row: T) => extractText(sortColumn.render(row)));
    // Precompute sort values once per row to avoid re-rendering on every comparison.
    const decorated = rows.map((row) => ({ row, value: accessor(row) }));
    decorated.sort((a, b) => {
      const va = a.value;
      const vb = b.value;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return sortDir === 'asc'
        ? sa.localeCompare(sb, 'id', { sensitivity: 'base', numeric: true })
        : sb.localeCompare(sa, 'id', { sensitivity: 'base', numeric: true });
    });
    return decorated.map((d) => d.row);
  }, [rows, sortColumn, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = sortedRows.slice(startIndex, startIndex + pageSize);

  const handleSort = (col: PaketColumn<T>) => {
    if (!isSortable(col)) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('desc');
    }
  };

  return (
    <Card variant="flush" className={styles.wrap}>
      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.th} ${col.align === 'right' ? styles.alignRight : col.align === 'center' ? styles.alignCenter : ''} ${isSortable(col) ? styles.sortable : ''}`}
                  onClick={() => handleSort(col)}
                >
                  <span className={styles.thInner}>
                    {col.label}
                    {isSortable(col) && sortKey === col.key && (
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

      {sortedRows.length === 0 && <Card.Body className={styles.empty}>{emptyMessage}</Card.Body>}

      {sortedRows.length > 0 && (
        <Card.Footer className={styles.footer}>
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
        </Card.Footer>
      )}
    </Card>
  );
}
