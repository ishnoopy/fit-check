"use client";

import { AppGuide } from "@/components/AppGuide";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetStats } from "@/hooks/query/useStats";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { getDayName } from "@/lib/store";
import { motion } from "framer-motion";
import {
  AlertCircleIcon,
  CalendarIcon,
  CalendarPlus,
  FlameIcon,
  Shield,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "../../providers";

const patchNotesDetails = [
  {
    date: "2026-03-22",
    label: "Dashboard redesign ✨.",
  },
  {
    date: "2026-03-22",
    label: "Haptic feedback in log and navbar."
  }
];

const PATCH_NOTE_VERSION = "2026-03-22";

const statPalette = [
  {
    label: "Streak",
    tone: "bg-[rgba(248,207,145,0.68)] dark:bg-[rgba(24,24,28,0.96)] dark:border dark:dark:border-white/8",
    iconTone:
      "bg-[rgba(255,255,255,0.5)] text-[rgb(111,70,28)] dark:bg-white/6 dark:text-[rgb(255,214,160)]",
    textTone: "text-[rgb(78,51,24)] dark:text-white",
    icon: FlameIcon,
  },
  {
    label: "Today",
    tone: "bg-[rgba(237,205,202,0.82)] dark:bg-[rgba(24,24,28,0.96)] dark:border dark:dark:border-white/8",
    iconTone:
      "bg-[rgba(255,255,255,0.45)] text-[rgb(121,47,52)] dark:bg-primary/14 dark:text-primary",
    textTone: "text-[rgb(105,39,45)] dark:text-white",
    icon: TargetIcon,
  },
  {
    label: "Week",
    tone: "bg-[rgba(226,214,238,0.82)] dark:bg-[rgba(24,24,28,0.96)] dark:border dark:dark:border-white/8",
    iconTone:
      "bg-[rgba(255,255,255,0.45)] text-[rgb(81,64,102)] dark:bg-white/6 dark:text-white/82",
    textTone: "text-[rgb(72,58,91)] dark:text-white",
    icon: TrendingUpIcon,
  },
];

export default function DashboardPage() {
  const { user } = useUser();
  const dayName = getDayName(new Date().getDay());
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);
  const [isAcknowledgingPatchNotes, setIsAcknowledgingPatchNotes] =
    useState(false);

  const { data: statsData } = useGetStats({ queryKey: ["stats"] });

  useEffect(() => {
    if (!user) return;
    setIsPatchNotesOpen(
      user.acknowledgedPatchNoteVersion !== PATCH_NOTE_VERSION,
    );
  }, [user]);

  const handleClosePatchNotes = async () => {
    setIsAcknowledgingPatchNotes(true);
    try {
      await api.patch("/api/auth/patch-notes/ack", {
        version: PATCH_NOTE_VERSION,
      });
      queryClient.setQueryData<{ data?: { acknowledgedPatchNoteVersion?: string } }>(
        ["user"],
        (previous) => {
          if (!previous?.data) return previous;
          return {
            ...previous,
            data: {
              ...previous.data,
              acknowledgedPatchNoteVersion: PATCH_NOTE_VERSION,
            },
          };
        },
      );
      setIsPatchNotesOpen(false);
    } finally {
      setIsAcknowledgingPatchNotes(false);
    }
  };

  if (!statsData) {
    return <LoadingState message="Loading your dashboard" />;
  }

  const totalLogs = statsData.totalLogs || 0;
  const exercisesToday = statsData.exercisesToday || 0;
  const exercisesThisWeek = statsData.exercisesThisWeek || 0;
  const streak = statsData.streak || 0;
  const bufferDaysUsed = statsData.bufferDaysUsed || 0;
  const restDaysBuffer = statsData.restDaysBuffer || 0;
  const datesWithWorkouts = statsData.datesWithWorkouts || [];

  const isBufferActive = bufferDaysUsed > 0;
  const isBufferUsedUp =
    bufferDaysUsed === restDaysBuffer && bufferDaysUsed > 0;
  const today = new Date();
  const workoutDates = datesWithWorkouts.map(
    (dateStr) => new Date(`${dateStr}T00:00:00`),
  );
  const isTodayWorkout = workoutDates.some(
    (date) =>
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate(),
  );
  const stats = [
    {
      value: streak,
      helper: isBufferActive
        ? `${bufferDaysUsed}/${restDaysBuffer} buffer used`
        : "Current rhythm",
    },
    {
      value: exercisesToday,
      helper: isTodayWorkout ? "Logged today" : "Nothing logged yet",
    },
    {
      value: exercisesThisWeek,
      helper: `${datesWithWorkouts.length} active days total`,
    },
  ];

  const helperMessage = isBufferUsedUp
    ? `Your rest-day buffer is fully used. Log today to protect your ${streak}-day streak.`
    : totalLogs === 0
      ? "Open the guide and set up your first plan before logging."
      : isTodayWorkout
        ? "Good job doing your workout today!"
        : "A short session today keeps the weekly curve moving.";

  return (
    <div className="min-h-screen pb-28">
      <Dialog
        open={isPatchNotesOpen}
        onOpenChange={(open) => {
          if (!open) return;
          setIsPatchNotesOpen(open);
        }}
      >
        <DialogContent
          className="max-w-md rounded-[1.75rem] border-border/60 bg-card/95 shadow-xl dark:border-white/8 dark:bg-[rgba(30,32,38,0.96)]"
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="space-y-3 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/16 text-primary">
              <AlertCircleIcon className="size-6" />
            </div>
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em]">
              What&apos;s new in FitCheck
            </DialogTitle>
            <DialogDescription>Effective March 22, 2026.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            {patchNotesDetails.map((patchNote) => (
              <div
                key={patchNote.date}
                className="rounded-[1.25rem] border border-border/50 bg-background/80 px-4 py-3"
              >
                {patchNote.label}
              </div>
            ))}
          </div>
          <div className="rounded-[1.25rem] border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
            Thank you for being part of the FitCheck community.
          </div>
          <DialogFooter>
            <Button
              onClick={handleClosePatchNotes}
              disabled={isAcknowledgingPatchNotes}
              className="w-full rounded-full"
            >
              {isAcknowledgingPatchNotes ? "Saving..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-8 pt-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title=""
            subtitle={`${dayName}, ${new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}`}
          />
          <div className="mt-1 shrink-0">
            <AppGuide />
          </div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="space-y-5"
        >
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Daily overview
              </p>
              <h2 className="max-w-sm text-3xl font-semibold tracking-[-0.05em] text-foreground">
                {user?.firstName ? `Hi ${user.firstName}!` : "Hi there!"}
              </h2>
            </div>
            {isBufferUsedUp && (
              <div className="hidden rounded-full border border-primary/25 bg-primary/12 px-4 py-2 text-xs font-medium text-primary sm:flex">
                Buffer exhausted
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat, index) => {
              const palette = statPalette[index];
              const Icon = palette.icon;
              return (
                <motion.div
                  key={stat.helper}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * index, duration: 0.3 }}
                  whileHover={{ y: -4 }}
                  className={`min-h-[11rem] rounded-[2rem] p-4 ${palette.tone}`}
                >
                  <div
                    className={`flex size-11 items-center justify-center rounded-full ${palette.iconTone}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="mt-8 space-y-1">
                    <p className={`text-4xl font-semibold ${palette.textTone}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs leading-5 text-foreground/60 dark:text-white/68">
                      {stat.helper}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="overflow-hidden rounded-[2.4rem] bg-[rgb(24,26,21)] p-6 text-[rgb(245,242,235)] shadow-xl dark:border dark:border-white/6 dark:bg-[linear-gradient(180deg,rgba(15,15,17,0.98),rgba(8,8,10,0.98))]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-xs space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-[rgba(245,242,235,0.58)]">
                Weekly performance
              </p>
              <h3 className="text-3xl font-semibold tracking-[-0.05em]">
                Your consistency is the metric that matters most.
              </h3>
              <p className="text-sm leading-6 text-[rgba(245,242,235,0.68)]">
                {helperMessage}
              </p>
            </div>
            <div
              className="relative flex size-36 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(rgb(239, 206, 214) 0 ${100}%, rgba(255,255,255,0.14) ${100}% 100%)`,
              }}
            >
              <div className="absolute inset-[14px] rounded-full bg-[rgb(24,26,21)]" />
              <div className="relative text-center">
                <div className="text-4xl font-semibold tracking-[-0.06em]">
                  100%
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[rgba(245,242,235,0.56)]">

                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Workouts
              </p>
              <p className="mt-2 text-2xl font-semibold">{totalLogs}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Today
              </p>
              <p className="mt-2 text-2xl font-semibold">{exercisesToday}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Buffer
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {bufferDaysUsed}/{restDaysBuffer}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Days logged
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {datesWithWorkouts.length}
              </p>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-5 sm:grid-cols-[1.2fr_0.8fr]">
          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.3 }}
            className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/8 dark:bg-[rgba(30,32,38,0.9)]"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-secondary/55 text-secondary-foreground">
                <CalendarIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.04em]">
                  Workout calendar
                </h3>
                <p className="text-sm text-muted-foreground">
                  Logged days stay highlighted for quick scanning.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                onSelect={() => undefined}
                modifiers={{
                  todayHighlight: isTodayWorkout ? [] : [today],
                  workout: workoutDates,
                }}
                modifiersClassNames={{
                  todayHighlight: "[&>button]:opacity-100 bg-primary/35 rounded-full",
                  workout:
                    "[&>button]:opacity-100 bg-[rgba(224,190,195,0.9)] text-[rgb(100,34,42)] rounded-full",
                }}
                className="rounded-[1.5rem] border-0 bg-transparent p-0"
              />
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.3 }}
            className="space-y-4"
          >
            <div className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/8 dark:bg-[rgba(30,32,38,0.9)]">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/55 text-accent-foreground">
                  {isBufferUsedUp ? (
                    <Shield className="size-5" />
                  ) : (
                    <CalendarPlus className="size-5" />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Focus
                  </p>
                  <h3 className="text-lg font-semibold tracking-[-0.04em]">
                    {isBufferUsedUp
                      ? "Protect your streak"
                      : totalLogs === 0
                        ? "Start your first cycle"
                        : "Stay in rhythm"}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {helperMessage}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/8 dark:bg-[rgba(30,32,38,0.9)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Next move
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em]">
                    Choose your working surface.
                  </h3>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <Button asChild className="h-11 rounded-full">
                  <Link href="/log">Log today&apos;s session</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-full border-border/70 bg-background/75"
                >
                  <Link href="/plans">Review workout plans</Link>
                </Button>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
