"use client";

import { useUser } from "@/app/providers";
import {
  useEstablishBuddy,
  useMutuals,
  useNudgeBuddy,
} from "@/hooks/query/useBuddies";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LoaderCircleIcon, PlusIcon, UserIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

// ─── Buddy Avatar (existing gym buddy) ─────────────────────────────────

function BuddyAvatar({
  buddyId,
  partner,
  streak,
  nudgeStatus,
  onNudge,
  isNudging,
}: {
  buddyId: string;
  partner: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
  };
  streak: { currentCount: number };
  nudgeStatus?: { iNudgedToday: boolean; theyNudgedToday: boolean };
  onNudge: (buddyId: string) => void;
  isNudging: boolean;
}) {
  const iNudged = nudgeStatus?.iNudgedToday ?? false;
  const theyNudged = nudgeStatus?.theyNudgedToday ?? false;
  const bothNudged = iNudged && theyNudged;
  const needsReply = theyNudged && !iNudged;

  const ringClass = bothNudged
    ? "bg-primary shadow-[0_0_14px] shadow-primary/40"
    : needsReply
      ? "bg-accent/70"
      : iNudged
        ? "bg-muted-foreground/25"
        : "bg-border/40";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-1 shrink-0 w-[72px]"
    >
      <button
        type="button"
        onClick={() => onNudge(buddyId)}
        disabled={isNudging}
        className="relative group outline-none disabled:opacity-70"
        aria-label={`Nudge ${partner.firstName || partner.username}`}
      >
        <div
          className={cn(
            "h-[68px] w-[68px] rounded-full p-[3px] transition-all duration-300",
            "group-hover:scale-105 group-active:scale-95",
            ringClass,
          )}
        >
          <div className="h-full w-full rounded-full border-2 border-background bg-muted overflow-hidden flex items-center justify-center">
            {partner.avatar ? (
              <Image
                src={partner.avatar}
                alt={partner.username}
                width={64}
                height={64}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <UserIcon className="h-6 w-6 text-muted-foreground/60" />
            )}
          </div>
        </div>

        {needsReply && (
          <span className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-accent border-2 border-background flex items-center justify-center">
            <span className="text-[9px] font-black text-accent-foreground leading-none">
              !
            </span>
          </span>
        )}

        {bothNudged && (
          <span className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-primary border-2 border-background flex items-center justify-center">
            <span className="text-[10px] font-black text-primary-foreground leading-none">
              ✓
            </span>
          </span>
        )}

        {isNudging && (
          <span className="absolute inset-0 flex items-center justify-center">
            <LoaderCircleIcon className="h-5 w-5 animate-spin text-foreground" />
          </span>
        )}
      </button>

      <p className="text-[11px] font-semibold text-foreground leading-tight text-center truncate w-full max-w-[72px]">
        {partner.firstName || `@${partner.username}`}
      </p>

      <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-black text-muted-foreground leading-none">
        <span className="text-[11px]">🔥</span>
        {streak.currentCount}
      </span>
    </motion.div>
  );
}

// ─── Add Buddy Avatar (mutual not yet a gym buddy) ─────────────────────

function AddBuddyAvatar({
  user,
  onAdd,
  isAdding,
}: {
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
  };
  onAdd: (userId: string) => void;
  isAdding: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-1 shrink-0 w-[72px]"
    >
      <button
        type="button"
        onClick={() => onAdd(user.id)}
        disabled={isAdding}
        className="relative group outline-none disabled:opacity-70"
        aria-label={`Add ${user.firstName || user.username} as gym buddy`}
      >
        {/* Dashed-style ring */}
        <div
          className={cn(
            "h-[68px] w-[68px] rounded-full p-[3px] transition-all duration-300",
            "group-hover:scale-105 group-active:scale-95",
            "ring-2 ring-dashed ring-border/50",
            "bg-transparent",
          )}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='50%25' ry='50%25' stroke='%23d4d4d4' stroke-width='3' stroke-dasharray='4%2c4' stroke-linecap='round' /%3e%3c/svg%3e\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "100% 100%",
          }}
        >
          <div className="h-full w-full rounded-full border-2 border-transparent bg-muted/50 overflow-hidden flex items-center justify-center">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.username}
                width={64}
                height={64}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <UserIcon className="h-6 w-6 text-muted-foreground/40" />
            )}
          </div>
        </div>

        {/* Plus icon */}
        <span className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-primary/80 border-2 border-background flex items-center justify-center">
          <PlusIcon className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
        </span>

        {isAdding && (
          <span className="absolute inset-0 flex items-center justify-center">
            <LoaderCircleIcon className="h-5 w-5 animate-spin text-foreground" />
          </span>
        )}
      </button>

      <p className="text-[11px] font-semibold text-foreground leading-tight text-center truncate w-full max-w-[72px]">
        {user.firstName || `@${user.username}`}
      </p>

      {/* "Add" badge */}
      <span className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border/50 bg-transparent px-2 py-0.5 text-[9px] font-black text-muted-foreground/50 leading-none">
        ADD
      </span>
    </motion.div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────

function BuddyRowSkeleton() {
  return (
    <section className="pb-2">
      <p className="text-[11px] font-black text-muted-foreground/60 px-1 mb-3 tracking-wider uppercase">
        Gym Buddies
      </p>
      <div className="flex gap-3 px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 shrink-0 w-[72px]"
          >
            <div className="h-[68px] w-[68px] rounded-full bg-muted/60 animate-pulse" />
            <div className="h-3 w-14 rounded-full bg-muted/40 animate-pulse mt-1" />
            <div className="h-4 w-10 rounded-full bg-muted/30 animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main component ────────────────────────────────────────────────────

export function BuddyRow() {
  const { user } = useUser();
  const { data: mutuals, isLoading } = useMutuals(user?.username);
  const nudgeMutation = useNudgeBuddy(user?.username);
  const establishBuddyMutation = useEstablishBuddy(user?.username);

  // Track which items are currently being mutated (by buddyId or userId)
  const [nudgingIds, setNudgingIds] = useState<Set<string>>(new Set());
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  const handleNudge = (buddyId: string) => {
    setNudgingIds((prev) => new Set(prev).add(buddyId));
    nudgeMutation.mutate(buddyId, {
      onSettled: () => {
        setNudgingIds((prev) => {
          const next = new Set(prev);
          next.delete(buddyId);
          return next;
        });
      },
    });
  };

  const handleAddBuddy = (userId: string) => {
    setAddingIds((prev) => new Set(prev).add(userId));
    establishBuddyMutation.mutate(userId, {
      onSettled: () => {
        setAddingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      },
    });
  };

  if (isLoading) {
    return <BuddyRowSkeleton />;
  }

  if (!mutuals || mutuals.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: 0.08 }}
      className="pb-3"
    >
      {/* Section label */}
      <p className="text-[11px] font-black text-muted-foreground/60 px-1 mb-3 tracking-wider uppercase">
        Gym Buddies
      </p>

      {/* Horizontal scroll container */}
      <div className="overflow-x-auto scrollbar-none -mx-1">
        <div className="flex gap-3 px-1 w-max">
          {mutuals.map((item) =>
            item.isBuddy && item.buddyId ? (
              <BuddyAvatar
                key={item.buddyId}
                buddyId={item.buddyId}
                partner={item.user}
                streak={item.streak ?? { currentCount: 0 }}
                nudgeStatus={item.nudgeStatus}
                onNudge={handleNudge}
                isNudging={nudgingIds.has(item.buddyId)}
              />
            ) : (
              <AddBuddyAvatar
                key={item.user.id}
                user={item.user}
                onAdd={handleAddBuddy}
                isAdding={addingIds.has(item.user.id)}
              />
            ),
          )}
        </div>
      </div>
    </motion.section>
  );
}
