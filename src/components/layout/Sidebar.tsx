"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Sidebar.module.css';
import { ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useSession } from '@/components/auth/SessionProvider';
import { navGroupsFor } from '@/lib/nav';

const COLLAPSE_KEY = 'dewa-pbj:sidebar-collapsed';
const CLOSED_GROUPS_KEY = 'dewa-pbj:sidebar-closed-groups';

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    try {
      const stored = JSON.parse(localStorage.getItem(CLOSED_GROUPS_KEY) ?? '[]');
      setClosedGroups(Array.isArray(stored) ? stored : []);
    } catch {
      setClosedGroups([]);
    }
    setHydrated(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setClosedGroups((prev) => {
      const next = prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id];
      localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const visibleGroups = navGroupsFor(role);

  return (
    <aside
      className={styles.sidebar}
      data-collapsed={collapsed || undefined}
      data-hydrated={hydrated || undefined}
    >
      <div className={styles.brand}>
        <div className={styles.brandMark} />
        {!collapsed && (
          <div className={styles.brandText}>
            <strong>DEWA-PBJ</strong>
            <span>Digital Early Warning Analytics</span>
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {visibleGroups.map((group) => {
          const isClosed = !collapsed && closedGroups.includes(group.id);
          return (
            <div key={group.id} className={styles.group}>
              {group.label && !collapsed && (
                <button
                  type="button"
                  className={styles.groupLabel}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isClosed}
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={12}
                    className={styles.groupChevron}
                    style={{ transform: isClosed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                  />
                </button>
              )}
              <AnimatePresence initial={false}>
                {!isClosed && (
                  <motion.div
                    className={styles.groupLinks}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {group.links.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`${styles.navBtn} ${isActive ? styles.active : ''}`}
                          title={collapsed ? link.name : undefined}
                        >
                          <span className={styles.navIcon}>{link.icon}</span>
                          {!collapsed && <span className={styles.navLabel}>{link.name}</span>}
                          {isActive && (
                            <motion.span
                              layoutId="sidebarActiveIndicator"
                              className={styles.activeIndicator}
                              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            />
                          )}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        className={styles.collapseBtn}
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
      >
        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        {!collapsed && <span></span>}
      </button>

      {!collapsed && (
        <div className={styles.sidebarFoot}>
          UKPBJ Kementerian Ketenagakerjaan
        </div>
      )}
    </aside>
  );
}
