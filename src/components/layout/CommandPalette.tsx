"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import styles from './CommandPalette.module.css';
import { NAV_GROUPS } from '@/lib/nav';
import { useSession } from '@/components/auth/SessionProvider';
import { canAccess } from '@/lib/auth/access';

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { role } = useSession();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = NAV_GROUPS.flatMap((group) =>
      group.links
        .filter((link) => canAccess(role, link.href))
        .map((link) => ({ ...link, groupLabel: group.label }))
    );
    if (!q) return all;
    return all.filter((link) => link.name.toLowerCase().includes(q));
  }, [query, role]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const link = results[activeIndex];
      if (link) go(link.href);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.palette}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
          >
            <div className={styles.inputRow}>
              <Search size={16} className={styles.inputIcon} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari halaman… (mis. Tender, PPK, Swakelola)"
                className={styles.input}
              />
              <kbd className={styles.esc}>Esc</kbd>
            </div>
            <div className={styles.results}>
              {results.length === 0 && <p className={styles.empty}>Tidak ada halaman yang cocok.</p>}
              {results.map((link, i) => (
                <button
                  key={link.href}
                  type="button"
                  className={`${styles.result} ${i === activeIndex ? styles.resultActive : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => go(link.href)}
                >
                  <span className={styles.resultIcon}>{link.icon}</span>
                  <span className={styles.resultName}>{link.name}</span>
                  {link.groupLabel && <span className={styles.resultGroup}>{link.groupLabel}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
