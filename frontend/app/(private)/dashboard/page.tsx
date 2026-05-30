"use client";

import { AppGuide } from "@/components/AppGuide";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetRecentLogs } from "@/hooks/query/useLog";
import { useGetStats } from "@/hooks/query/useStats";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { getDayName } from "@/lib/store";
import { motion } from "framer-motion";
import { AlertCircleIcon, FlameIcon, Shield, TargetIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "../../providers";
import hero from "@/assets/hero.png"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const patchNotesDetails = [
  {
    date: "2026-03-30",
    element: (
      <p className="text-sm text-muted-foreground">
        You can now create posts and share your progress with the community
        using the Feed (see navbar).
      </p>
    ),
  },
  {
    date: "2026-03-30",
    element: (
      <p className="text-sm text-muted-foreground">
        Follow other users and see their posts in the Feed.
      </p>
    ),
  },
  {
    date: "2026-03-30",
    element: (
      <p className="text-sm text-muted-foreground">
        Update Profile Picture to your own.
      </p>
    ),
  },
  {
    date: "2026-03-30",
    element: (
      <p className="text-sm text-muted-foreground">Revamped profile page.</p>
    ),
  },
];
const PATCH_NOTE_VERSION = "2026-03-30";
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ACTIVITY_TILE_SIZE = 14;
const ACTIVITY_TILE_GAP = 4;

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getActivityTileClass(exerciseCount: number) {
  if (exerciseCount === 0) return "bg-muted/90";
  if (exerciseCount <= 2) return "bg-green-500";
  if (exerciseCount <= 4) return "bg-green-600";
  if (exerciseCount <= 6) return "bg-green-700";
  return "bg-green-800";
}

function getWorkoutActivityDays(
  year: number,
  dailyExerciseCounts: { date: string; exerciseCount: number }[],
  datesWithWorkouts: string[],
) {
  const countByDate = new Map(
    dailyExerciseCounts.map(({ date, exerciseCount }) => [date, exerciseCount]),
  );

  for (const date of datesWithWorkouts) {
    if (!countByDate.has(date)) {
      countByDate.set(date, 1);
    }
  }

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  const daysInYear =
    Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;

  return Array.from({ length: daysInYear }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateKey = formatDateKey(date);

    return {
      date,
      dateKey,
      exerciseCount: countByDate.get(dateKey) ?? 0,
    };
  });
}

function getActivityYears(
  dailyExerciseCounts: { date: string }[],
  datesWithWorkouts: string[],
) {
  const currentYear = new Date().getFullYear();
  const years = new Set<number>([currentYear]);

  for (const { date } of dailyExerciseCounts) {
    years.add(Number(date.slice(0, 4)));
  }

  for (const date of datesWithWorkouts) {
    years.add(Number(date.slice(0, 4)));
  }

  return Array.from(years)
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => b - a);
}

function formatRecentWorkoutDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString("en-CA");
}

export default function DashboardPage() {
  const { user } = useUser();
  const dayName = getDayName(new Date().getDay());
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);
  const [isAcknowledgingPatchNotes, setIsAcknowledgingPatchNotes] =
    useState(false);
  const [selectedActivityYear, setSelectedActivityYear] = useState(() =>
    new Date().getFullYear(),
  );

  const { data: statsData } = useGetStats({ queryKey: ["stats"] });
  const { data: recentLogs = [] } = useGetRecentLogs({ limit: 5 });

  useEffect(() => {
    if (!user) return;
    const hasAcknowledgedCurrentPatchNote =
      user.acknowledgedPatchNoteVersion === PATCH_NOTE_VERSION;
    setIsPatchNotesOpen(!hasAcknowledgedCurrentPatchNote);
  }, [user]);

  const handleClosePatchNotes = async () => {
    setIsAcknowledgingPatchNotes(true);
    try {
      await api.patch("/api/auth/patch-notes/ack", {
        version: PATCH_NOTE_VERSION,
      });
      queryClient.setQueryData<{
        data?: { acknowledgedPatchNoteVersion?: string };
      }>(["user"], (previous) => {
        if (!previous?.data) return previous;
        return {
          ...previous,
          data: {
            ...previous.data,
            acknowledgedPatchNoteVersion: PATCH_NOTE_VERSION,
          },
        };
      });
      setIsPatchNotesOpen(false);
    } finally {
      setIsAcknowledgingPatchNotes(false);
    }
  };

  const totalLogs = statsData?.totalLogs || 0;
  const exercisesToday = statsData?.exercisesToday || 0;
  const streak = statsData?.streak || 0;
  const bufferDaysUsed = statsData?.bufferDaysUsed || 0;
  const restDaysBuffer = statsData?.restDaysBuffer || 0;
  const datesWithWorkouts = statsData?.datesWithWorkouts || [];
  const dailyExerciseCounts = statsData?.dailyExerciseCounts || [];
  const activityYears = getActivityYears(
    dailyExerciseCounts,
    datesWithWorkouts,
  );
  const workoutActivityDays = getWorkoutActivityDays(
    selectedActivityYear,
    dailyExerciseCounts,
    datesWithWorkouts,
  );
  const activityCells = [
    ...Array(workoutActivityDays[0]?.date.getDay() ?? 0).fill(null),
    ...workoutActivityDays,
  ];
  const activityColumnCount = Math.ceil(activityCells.length / 7);
  const activityMonthLabels = Array.from(
    { length: activityColumnCount },
    (_, columnIndex) => {
      const week = activityCells.slice(columnIndex * 7, columnIndex * 7 + 7);
      const firstDayOfMonth = week.find(
        (activity) => activity && activity.date.getDate() === 1,
      );

      return firstDayOfMonth
        ? {
            month: firstDayOfMonth.date.toLocaleDateString("en-US", {
              month: "short",
            }),
            column: columnIndex + 1,
          }
        : null;
    },
  ).filter((label): label is { month: string; column: number } =>
    Boolean(label),
  );
  const activityGridStyle = {
    gridTemplateColumns: `repeat(${activityColumnCount}, ${ACTIVITY_TILE_SIZE}px)`,
    columnGap: `${ACTIVITY_TILE_GAP}px`,
  };
  const activityRowsStyle = {
    gridTemplateRows: `repeat(7, ${ACTIVITY_TILE_SIZE}px)`,
    rowGap: `${ACTIVITY_TILE_GAP}px`,
  };

  // Check if buffer is being used
  const isBufferActive = bufferDaysUsed > 0;

  // Check if buffer is fully used up (reminder to log workout today)
  const isBufferUsedUp =
    bufferDaysUsed === restDaysBuffer && bufferDaysUsed > 0;
  const heroName = user?.firstName || "Athlete";
  const heroHeadline =
    exercisesToday > 0
      ? `You showed up, ${heroName}.`
      : streak > 0
        ? `Keep the streak hot, ${heroName}.`
        : `Keep moving, ${heroName}.`;
  const heroMessage =
    exercisesToday > 0
      ? "That training grid is alive today. Add another lift if you're still hungry."
      : totalLogs === 0
        ? "Start with one program exercise today and the training grid lights up automatically."
        : "Log one program exercise today and give future you something to build on.";

  const stats = [
    {
      icon: FlameIcon,
      value: streak.toString(),
      label: "Day Streak",
      color: "text-red-500",
      showBuffer: true,
      classNames: "",
    },
    {
      icon: TargetIcon,
      value: exercisesToday.toString(),
      label: "Exercises Today",
      color: "text-primary",
      classNames: "",
    },
  ];

  if (!statsData) {
    // or use isLoading from useGetStats
    return <LoadingState message="Loading your stats..." />;
  }

  return (
    <div className="min-h-screen pb-24">
      <Dialog
        open={isPatchNotesOpen}
        onOpenChange={(open) => {
          if (!open) return;
          setIsPatchNotesOpen(open);
        }}
      >
        <DialogContent
          className="max-w-md"
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold text-center">
              <AlertCircleIcon className="size-6" /> What&apos;s new in TUFF?
            </DialogTitle>
            <DialogDescription className="text-center">
              Effective March 11, 2026:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            {patchNotesDetails.map((patchNote, index) => (
              <div key={`${patchNote.date}-${index}`}>{patchNote.element}</div>
            ))}
          </div>
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/10 px-4 py-3 mt-4 text-sm text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 flex items-center gap-2">
            <span role="img" aria-label="gratitude">
              🙏
            </span>
            <span>
              Thank you for being a part of the TUFF community. Your support,
              feedback, and dedication means a lot to us!
            </span>
          </div>
          <DialogFooter>
            <Button
              onClick={handleClosePatchNotes}
              disabled={isAcknowledgingPatchNotes}
            >
              {isAcknowledgingPatchNotes ? "Saving..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="TUFF"
            subtitle={`${dayName}, ${new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}`}
          />
          <div className="shrink-0 mt-1 flex items-center">
            <AppGuide />
          </div>
        </div>

        {user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <section className="relative min-h-[230px] rounded-xl sm:min-h-[190px]">
              <div className="absolute inset-0 overflow-hidden rounded-xl bg-accent shadow-lg">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,247,232,0.22),transparent_28%),linear-gradient(135deg,rgba(255,247,232,0.08),transparent_50%)]" />
              </div>
              <div className="absolute -bottom-10 -left-8 z-20 h-[240px] w-[48%] sm:-bottom-12 sm:-left-8 sm:h-[260px]">
                <Image
                  src={hero}
                  alt="TUFF coach mascot"
                  width={420}
                  height={560}
                  priority
                  className="h-full w-full object-contain object-bottom drop-shadow-[0_18px_0_rgba(29,26,20,0.18)]"
                />
              </div>

              <div
                id="hero-message"
                className="relative z-10 ml-auto flex min-h-[230px] w-[70%] items-center p-4 sm:min-h-[190px] sm:p-6"
              >
                <div className="w-full rounded-[24px] bg-chart-3 p-4 text-accent-foreground shadow-sm sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-accent-foreground/90">
                    Today Training
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-none tracking-tighter sm:text-3xl">
                    {heroHeadline}
                  </h2>
                  <p className="mt-2 text-xs font-semibold leading-snug text-accent-foreground/90 sm:text-sm">
                    {heroMessage}
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/log">Log today</Link>
                  </Button>
                </div>
              </div>
            </section>

            {/* Reminder: Buffer used up */}
            {isBufferUsedUp && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="border-accent/30 bg-accent/5 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-accent/10 shrink-0">
                        <Shield className="h-5 w-5 text-accent" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-sm text-accent">
                          Rest buffer used
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          You&apos;ve used all your rest days buffer. Log a
                          workout today to maintain your {streak}-day streak!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Quick Stats */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item} className="h-full">
              <Card
                className={`h-full bg-secondary border-secondary text-secondary-foreground shadow-sm transition-transform duration-200 group rounded-[28px] py-0 gap-0 hover:-translate-y-0.5 ${stat.classNames} ${
                  stat.showBuffer && isBufferUsedUp ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="h-full p-4 text-left space-y-2">
                  <div className="inline-flex items-center justify-start p-2 text-primary group-hover:scale-110 transition-transform">
                    {typeof stat.icon === "string" ? (
                      <Image
                        src={stat.icon}
                        alt=""
                        width={25}
                        height={25}
                        className="size-6 object-contain"
                      />
                    ) : (
                      <stat.icon className="size-6" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div>
                      <p className="text-4xl font-black leading-none tracking-tight text-primary">
                        {stat.value}
                      </p>
                      <p className="mt-3 text-sm font-extrabold text-secondary-foreground">
                        {stat.label.toLowerCase()}
                      </p>
                    </div>
                    {/* Buffer indicator inside streak card */}
                    {stat.showBuffer && isBufferActive && streak > 0 && (
                      <div className="mt-4 pt-3 border-t border-secondary-foreground/15">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-secondary-foreground/80">
                            {bufferDaysUsed}/{restDaysBuffer} rest days used
                          </span>
                        </div>
                        {isBufferUsedUp && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-primary font-bold">
                              <Link href="/log" className="underline">
                                Log workout today
                              </Link>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Workout Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-border bg-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">Training Grid</h2>
                  </CardTitle>
                </div>
                <Select
                  value={selectedActivityYear.toString()}
                  onValueChange={(value) =>
                    setSelectedActivityYear(Number(value))
                  }
                >
                  <SelectTrigger size="sm" className="w-24 shrink-0">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {activityYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto pb-1">
                <div className="w-max space-y-1">
                  <div className="grid grid-cols-[2.5rem_auto] gap-2">
                    <div />
                    <div
                      className="grid text-xs font-medium text-muted-foreground"
                      style={activityGridStyle}
                    >
                      {activityMonthLabels.map(({ month, column }) => (
                        <div
                          key={`${month}-${column}`}
                          className="leading-none"
                          style={{ gridColumn: `${column} / span 4` }}
                        >
                          {month}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-[2.5rem_auto] gap-2">
                    <div
                      className="grid text-xs text-muted-foreground"
                      style={activityRowsStyle}
                    >
                      {WEEKDAY_LABELS.map((day) => (
                        <div
                          key={day}
                          className="flex items-center leading-none"
                        >
                          {day === "Mon" || day === "Wed" || day === "Fri"
                            ? day
                            : ""}
                        </div>
                      ))}
                    </div>
                    <div
                      className="grid grid-flow-col grid-rows-7"
                      style={{ ...activityGridStyle, ...activityRowsStyle }}
                    >
                      {activityCells.map((activity, index) => {
                        if (!activity) {
                          return (
                            <div
                              key={`empty-${index}`}
                              className="shrink-0"
                              style={{
                                width: ACTIVITY_TILE_SIZE,
                                height: ACTIVITY_TILE_SIZE,
                              }}
                            />
                          );
                        }

                        return (
                          <div
                            key={activity.dateKey}
                            title={`${activity.date.toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}: ${activity.exerciseCount} exercise${activity.exerciseCount === 1 ? "" : "s"}`}
                            aria-label={`${activity.dateKey}: ${activity.exerciseCount} exercise${activity.exerciseCount === 1 ? "" : "s"}`}
                            className={`shrink-0 rounded-[3px] border border-black ${getActivityTileClass(
                              activity.exerciseCount,
                            )}`}
                            style={{
                              width: ACTIVITY_TILE_SIZE,
                              height: ACTIVITY_TILE_SIZE,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span></span>
                <div className="flex items-center gap-1">
                  <span>Less</span>
                  {[0, 1, 3, 5, 7].map((count) => (
                    <span
                      key={count}
                      className={`rounded-[3px] border border-black ${getActivityTileClass(count)}`}
                      style={{
                        width: ACTIVITY_TILE_SIZE,
                        height: ACTIVITY_TILE_SIZE,
                      }}
                    />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Workouts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="gap-4 overflow-hidden border-border bg-card py-5">
            <CardHeader className="px-5 pb-0">
              <CardTitle>
                <h2 className="text-xl font-black tracking-tight">
                  Recent Workouts
                </h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              {recentLogs.length > 0 ? (
                <div className="divide-y divide-border border-t border-border">
                  {recentLogs.map((log) => {
                    const exerciseName = log.exerciseId?.name ?? "Workout";
                    const workoutName = log.workoutId?.title ?? "Workout";
                    const loggedDate = formatRecentWorkoutDate(log.createdAt);
                    const setCount = log.sets.length;

                    return (
                      <div
                        key={log.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 last:pb-0"
                      >
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-black leading-tight text-card-foreground">
                            {exerciseName}
                          </h3>
                          <p className="mt-0.5 truncate text-sm font-medium leading-tight text-muted-foreground">
                            {workoutName}
                            {loggedDate ? ` - ${loggedDate}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-black leading-none text-green-700">
                          {setCount} set{setCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">
                  No workouts logged yet.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
