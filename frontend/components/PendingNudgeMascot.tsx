"use client";

import { useUser } from "@/app/providers";
import postSessionMascot from "@/assets/hero-post-session.png";
import { useMutuals } from "@/hooks/query/useBuddies";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

export function PendingNudgeMascot() {
  const { user } = useUser();
  const { data: mutuals } = useMutuals(user?.username);
  const shouldReduceMotion = useReducedMotion();

  // Get buddies who have nudged today but haven't been nudged back
  const pendingBuddies =
    mutuals?.filter(
      (m) => m.isBuddy && m.nudgeStatus?.theyNudgedToday && !m.nudgeStatus?.iNudgedToday,
    ) ?? [];

  // Don't render anything if no pending nudges
  if (pendingBuddies.length === 0) return null;

  const message =
    pendingBuddies.length === 1
      ? `Don't keep ${pendingBuddies[0].user.firstName || pendingBuddies[0].user.username} hangin'! Nudge back`
      : "Don't keep your gym bros hangin'! Nudge back";

  const handleBubbleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      <motion.div
        key="pending-nudge-mascot"
        className="pointer-events-none fixed left-1 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-60 flex max-w-[calc(100vw-0.5rem)] items-end gap-1 sm:left-5 sm:bottom-5 sm:gap-3"
        initial={
          shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, x: -76, y: 28, rotate: -8, scale: 0.88 }
        }
        animate={
          shouldReduceMotion
            ? { opacity: 1 }
            : {
                opacity: 1,
                x: 0,
                y: [0, -6, 0],
                rotate: [-3, 2, 0],
              }
        }
        exit={
          shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, x: -62, y: 34, rotate: -10, scale: 0.9 }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0.18 }
            : {
                duration: 0.72,
                ease: [0.16, 1, 0.3, 1],
                y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
              }
        }
      >
        {/* Mascot image */}
        <div className="relative h-[48vw] max-h-64 min-h-44 w-[34vw] min-w-32 max-w-48 shrink-0 pointer-events-auto">
          <Image
            src={postSessionMascot}
            alt="TUFF mascot"
            fill
            sizes="(max-width: 640px) 34vw, 192px"
            className="object-contain drop-shadow-[0_22px_28px_rgb(29_26_20/0.26)]"
            priority={false}
          />
        </div>

        {/* Speech bubble */}
        <motion.button
          type="button"
          onClick={handleBubbleClick}
          className="pointer-events-auto mb-10 max-w-64 cursor-pointer rounded-2xl border-2 border-secondary bg-card px-3 py-2.5 shadow-lg sm:mb-14 sm:max-w-72 sm:px-4 sm:py-3.5"
          initial={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82 }
          }
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: [1, 1.04, 1] }
          }
          exit={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }
          }
          transition={{
            delay: shouldReduceMotion ? 0 : 0.14,
            duration: 0.3,
          }}
        >
          <p className="text-sm font-black leading-tight text-foreground sm:text-base">
            {message}
          </p>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
