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
      transition={{ duration: 0.1 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4"
    >
      {hasVisual && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="bg-muted/50 p-6"
        >
          {image ? (
            <Image
              src={image}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 object-contain text-muted-foreground/50"
            />
          ) : Icon ? (
            <Icon className="h-12 w-12 text-muted-foreground/50" />
          ) : null}
        </motion.div>
      )}
      <div className="space-y-2 max-w-md">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-semibold text-foreground"
        >
          {title}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground"
        >
          {description}
        </motion.p>
      </div>
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Button onClick={action.onClick} size="lg">
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
