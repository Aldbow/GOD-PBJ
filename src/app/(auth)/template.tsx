"use client";

import { motion } from "framer-motion";
import React from "react";

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Dark overlay to prevent white flash from body background when transitioning from dark landing page */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{ 
          position: 'fixed', 
          inset: 0, 
          background: '#060911', 
          zIndex: 9999, 
          pointerEvents: 'none' 
        }}
      />
      <motion.div
        initial={{ x: -30, filter: 'blur(8px)' }}
        animate={{ x: 0, filter: 'blur(0px)' }}
        transition={{ 
          duration: 0.8, 
          ease: [0.22, 1, 0.36, 1]
        }}
        style={{ width: "100%" }}
      >
        {children}
      </motion.div>
    </>
  );
}
