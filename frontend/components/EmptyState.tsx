"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  image?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  image,
  title,
  description,
  action,
}: EmptyStateProps) {
  const hasVisual = Icon || image;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="rounded-[2rem] border border-border/60 bg-card/80 px-6 py-12 text-center shadow-sm backdrop-blur-sm sm:px-10"
    >
      {hasVisual && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.12, type: "spring", stiffness: 180 }}
          className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-secondary/65 via-card to-accent/45 shadow-sm"
        >
          {image ? (
            <Image
              src={image}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 object-contain text-muted-foreground/70"
            />
          ) : Icon ? (
            <Icon className="h-10 w-10 text-foreground/75" />
          ) : null}
        </motion.div>
      )}
      <div className="mx-auto mt-6 max-w-md space-y-2">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="text-2xl font-semibold tracking-[-0.04em] text-foreground"
        >
          {title}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="text-sm leading-6 text-muted-foreground"
        >
          {description}
        </motion.p>
      </div>
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-6"
        >
          <Button
            onClick={action.onClick}
            size="lg"
            className="rounded-full px-6 shadow-sm"
          >
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
