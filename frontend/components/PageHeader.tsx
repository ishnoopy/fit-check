"use client";

import { motion } from "framer-motion";
import type React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="flex items-start justify-between gap-4"
    >
      <div className="space-y-2">
        <motion.h1
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, delay: 0.06 }}
          className="font-[family-name:var(--font-display)] text-[2.35rem] font-semibold tracking-[-0.06em] text-foreground sm:text-5xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22, delay: 0.1 }}
            className="max-w-md text-sm leading-6 text-muted-foreground sm:text-[0.95rem]"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {action && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, delay: 0.12 }}
          className="shrink-0"
        >
          {action}
        </motion.div>
      )}
    </motion.header>
  );
}
