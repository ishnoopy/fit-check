"use client";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Calendar } from "@/components/ui/calendar";
import { useGetStats } from "@/hooks/query/useStats";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarIcon,
  FlameIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

const statTiles = [
  {
    label: "Streak",
    tone: "bg-[rgba(248,207,145,0.68)] dark:bg-[rgba(24,24,28,0.96)] dark:border dark:dark:border-white/8",
    iconTone:
      "bg-[rgba(255,255,255,0.52)] text-[rgb(111,70,28)] dark:bg-white/6 dark:text-[rgb(255,214,160)]",
    textTone: "text-[rgb(78,51,24)] dark:text-white",
    icon: FlameIcon,
  },
  {
    label: "Total",
    tone: "bg-[rgba(237,205,202,0.82)] dark:bg-[rgba(24,24,28,0.96)] dark:border dark:dark:border-white/8",
    iconTone:
      "bg-[rgba(255,255,255,0.45)] text-[rgb(121,47,52)] dark:bg-primary/14 dark:text-primary",
    textTone: "text-[rgb(105,39,45)] dark:text-white",
    icon: TargetIcon,
  },
  {
    label: "This week",
    tone: "bg-[rgba(226,214,238,0.82)] dark:bg-[rgba(24,24,28,0.96)] dark:border dark:dark:border-white/8",
    iconTone:
      "bg-[rgba(255,255,255,0.45)] text-[rgb(81,64,102)] dark:bg-white/6 dark:text-white/82",
    textTone: "text-[rgb(72,58,91)] dark:text-white",
    icon: TrendingUpIcon,
  },
];

export default function StatsPage() {
  const router = useRouter();
  const { data: statsData, isLoading, error } = useGetStats({
    queryKey: ["stats"],
  });

  const totalLogs = statsData?.totalLogs || 0;
  const exercisesThisWeek = statsData?.exercisesThisWeek || 0;
  const datesWithWorkouts = statsData?.datesWithWorkouts || [];
  const streak = statsData?.streak || 0;
  const workoutDates = datesWithWorkouts.map(
    (dateStr) => new Date(`${dateStr}T00:00:00`),
  );
  const averagePerWeek =
    datesWithWorkouts.length === 0
      ? 0
      : Math.round((totalLogs / Math.max(datesWithWorkouts.length / 7, 1)) * 10) /
        10;

  if (isLoading) {
    return <LoadingState message="Loading your stats" />;
  }

  if (statsData && totalLogs === 0) {
    return (
      <div className="min-h-screen pb-28">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-8 pt-6 sm:px-6">
          <PageHeader
            title="Stats"
            subtitle="Your workout history becomes useful once sessions start landing here."
          />
          <EmptyState
            icon={CalendarIcon}
            title="No workouts logged"
            description="Log the first session and this space will turn into your training archive."
            action={{
              label: "Log a workout",
              onClick: () => router.push("/log"),
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pb-28">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-8 pt-6 sm:px-6">
          <PageHeader
            title="Stats"
            subtitle="This section could not be loaded right now."
          />
          <div className="rounded-[2rem] border border-destructive/30 bg-destructive/10 p-5 text-destructive shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <p className="text-sm leading-6">
                {error instanceof Error ? error.message : "Failed to load stats"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-8 pt-6 sm:px-6">
        <PageHeader
          title="Stats"
          subtitle="A clear read on consistency, session volume, and active training days."
        />

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="overflow-hidden rounded-[2.4rem] bg-[rgb(24,26,21)] p-6 text-[rgb(245,242,235)] shadow-xl dark:border dark:border-white/6 dark:bg-[linear-gradient(180deg,rgba(15,15,17,0.98),rgba(8,8,10,0.98))]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-md space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-[rgba(245,242,235,0.55)]">
                Performance archive
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.05em]">
                Your training pattern is getting easier to read.
              </h2>
              <p className="text-sm leading-6 text-[rgba(245,242,235,0.68)]">
                Total output, current streak, and recent weekly volume all sit
                here in one place.
              </p>
            </div>
            <div className="rounded-full border border-[rgba(245,242,235,0.14)] bg-[rgba(245,242,235,0.08)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(245,242,235,0.7)]">
              {datesWithWorkouts.length} active days
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Total workouts
              </p>
              <p className="mt-2 text-2xl font-semibold">{totalLogs}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Current streak
              </p>
              <p className="mt-2 text-2xl font-semibold">{streak}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                This week
              </p>
              <p className="mt-2 text-2xl font-semibold">{exercisesThisWeek}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Weekly average
              </p>
              <p className="mt-2 text-2xl font-semibold">{averagePerWeek}</p>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: streak, helper: "days in a row" },
            { value: totalLogs, helper: "sessions recorded" },
            { value: exercisesThisWeek, helper: "logged this week" },
          ].map((stat, index) => {
            const tile = statTiles[index];
            const Icon = tile.icon;
            return (
              <motion.div
                key={tile.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * index, duration: 0.28 }}
                whileHover={{ y: -4 }}
                className={`min-h-[11rem] rounded-[2rem] p-4 ${tile.tone}`}
              >
                <div
                  className={`flex size-11 items-center justify-center rounded-full ${tile.iconTone}`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="mt-8 space-y-1">
                  <p className={`text-4xl font-semibold ${tile.textTone}`}>
                    {stat.value}
                  </p>
                  <p className={`text-sm font-medium ${tile.textTone}`}>
                    {tile.label}
                  </p>
                  <p className="text-xs leading-5 text-foreground/60 dark:text-white/68">
                    {stat.helper}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.28 }}
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
                Logged days stay visible so gaps and bursts are easy to spot.
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <Calendar
              mode="multiple"
              onSelect={() => undefined}
              modifiers={{
                workout: workoutDates,
              }}
              modifiersClassNames={{
                workout:
                  "[&>button]:opacity-100 bg-[rgba(224,190,195,0.9)] text-[rgb(100,34,42)] rounded-full",
              }}
              className="rounded-[1.5rem] border-0 bg-transparent p-0"
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.28 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <div className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/8 dark:bg-[rgba(30,32,38,0.9)]">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Coverage
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              {datesWithWorkouts.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Days with at least one logged workout.
            </p>
          </div>
          <div className="rounded-[2rem] border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/8 dark:bg-[rgba(30,32,38,0.9)]">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Average load
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
              {averagePerWeek}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Approximate workouts completed per week.
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
