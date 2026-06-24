"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial HTML attribute
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    setIsDark(isDarkTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className={styles.themeToggle}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180, opacity: isDark ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ position: 'absolute' }}
      >
        <Sun size={18} />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? -180 : 0, opacity: isDark ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        style={{ position: 'absolute' }}
      >
        <Moon size={18} />
      </motion.div>
    </motion.button>
  );
}
