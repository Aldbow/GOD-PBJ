"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Component } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: 'Ringkasan', href: '/', icon: <LayoutDashboard size={18} /> },
    { name: 'Tampilan PPK', href: '/ppk', icon: <Users size={18} /> },
    { name: 'Drill-down satker', href: '/drilldown', icon: <Component size={18} /> },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark} />
        <div className={styles.brandText}>
          <strong>DEWA-PBJ</strong>
          <span>Early warning pengadaan</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={`${styles.navBtn} ${isActive ? styles.active : ''}`}>
              {link.icon}
              {link.name}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className={styles.activeIndicator}
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFoot}>
        Prototipe v0.1<br />Aksi perubahan — Kemnaker<br />Data ilustratif, 22 Jun 2026
      </div>
    </aside>
  );
}
