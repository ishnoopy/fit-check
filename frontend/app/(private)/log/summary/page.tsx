"use client";

import postSessionMascot from "@/assets/hero-post-session.png";
import { Button } from "@/components/ui/button";
import {
  useGetSettings,
  useGetTodayLogs,
} from "@/hooks/query/useLog";
import {
  formatDuration,
  getLastSession,
  summarizeSession,
  type FinishedWorkoutSession,
} from "@/lib/workoutSession";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Dumbbell } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const PROUD_LINES = [
  "You showed up and did the work. Respect.",
  "That session had your name on it. Champion energy.",
  "Stronger is the new baseline. See you tomorrow.",
  "You moved real weight today. Be proud of that.",
  "Another one in the bank. Future you is flexing.",
  "You chose strength. Again. That's the whole game.",
];

function CountUp({
  value,
  durationMs = 1100,
  format,
}: {
  value: number;
  durationMs?: number;
  format?: (value: number) => string;
}) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    let frameId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(value * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, durationMs, reduceMotion]);

  const rounded = Math.round(display);
  return <>{format ? format(rounded) : rounded.toLocaleString()}</>;
}

function StatTile({
  label,
  children,
  delay,
}: {
  label: string;
  children: React.ReactNode;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border-2 border-border bg-card px-4 py-3"
    >
      <div className="font-mono text-2xl font-black tabular-nums leading-none text-foreground">
        {children}
      </div>
      <div className="mt-1.5 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </motion.div>
  );
}

export default function SessionSummaryPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [session, setSession] = useState<FinishedWorkoutSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { data: settings } = useGetSettings();

  useEffect(() => {
    setSession(getLastSession());
    setIsReady(true);
  }, []);

  const userTimezone =
    settings?.settings?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const dateRange = useMemo(() => {
    const reference = session ? new Date(session.finishedAt) : new Date();
    const zoned = toZonedTime(reference, userTimezone);
    const startOfDay = new Date(zoned);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(zoned);
    endOfDay.setHours(23, 59, 59, 999);
    return {
      startOfDay: fromZonedTime(startOfDay, userTimezone),
      endOfDay: fromZonedTime(endOfDay, userTimezone),
    };
  }, [session, userTimezone]);

  const { data: todayLogs } = useGetTodayLogs(
    {
      activePlanId: session?.planId ?? "",
      activeWorkoutId: session?.workoutId ?? "",
      startOfDay: dateRange.startOfDay,
      endOfDay: dateRange.endOfDay,
    },
    { enabled: !!session },
  );

  const logs = useMemo(() => todayLogs ?? [], [todayLogs]);

  const stats = useMemo(() => {
    if (!session) return null;
    const durationSeconds = (session.finishedAt - session.startedAt) / 1000;
    return summarizeSession(logs, durationSeconds);
  }, [session, logs]);

  const proudLine = session
    ? PROUD_LINES[session.finishedAt % PROUD_LINES.length]
    : PROUD_LINES[0];

  if (isReady && !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-black">No recent session</h1>
        <p className="max-w-xs text-sm font-medium text-muted-foreground">
          Finish a workout from the log to see your session summary here.
        </p>
        <Button
          onClick={() => router.push("/log")}
          className="h-11 rounded-full px-6 font-black"
        >
          Go to log
        </Button>
      </div>
    );
  }

  if (!stats) {
    return <div className="min-h-screen bg-background" />;
  }

  const fadeUp = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto max-w-md px-5 pt-10">
        {/* Hero: a champion-gold ring drawing itself around the mascot */}
        <div className="relative mx-auto h-56 w-56">
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full -rotate-90"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              className="fill-none stroke-muted"
              strokeWidth="3"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              className="fill-none stroke-primary"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: reduceMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: 1.4,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.15,
              }}
            />
          </svg>

          <motion.div
            className="absolute inset-0 flex items-center justify-center p-8"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 22, scale: 0.86 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative h-full w-full">
              <Image
                src={postSessionMascot}
                alt="TUFF mascot celebrating"
                fill
                sizes="224px"
                className="object-contain drop-shadow-[0_18px_24px_rgb(29_26_20_/_0.22)]"
                priority
              />
            </div>
          </motion.div>
        </div>

        <motion.p
          {...fadeUp(0.35)}
          className="mt-6 text-center text-[11px] font-black uppercase tracking-[0.18em] text-accent"
        >
          Workout complete
        </motion.p>
        <motion.h1
          {...fadeUp(0.42)}
          className="mt-1 text-center text-3xl font-black leading-tight"
        >
          {proudLine}
        </motion.h1>

        {/* Stat tiles count up as they land */}
        <div className="mt-7 grid grid-cols-2 gap-3">
          <StatTile label="Total volume" delay={0.5}>
            <CountUp value={stats.totalVolume} />
            <span className="ml-1 text-sm font-black text-muted-foreground">
              kg
            </span>
          </StatTile>
          <StatTile label="Sets" delay={0.58}>
            <CountUp value={stats.totalSets} />
          </StatTile>
          <StatTile label="Time" delay={0.66}>
            {formatDuration(stats.durationSeconds)}
          </StatTile>
          <StatTile label="Exercises" delay={0.74}>
            <CountUp value={stats.exerciseCount} />
          </StatTile>
        </div>

        <motion.p
          {...fadeUp(0.82)}
          className="mt-3 text-center text-xs font-medium text-muted-foreground"
        >
          {stats.totalReps.toLocaleString()} total reps
          {stats.averageRpe !== null && (
            <> · avg effort RPE {stats.averageRpe}</>
          )}
        </motion.p>

        {/* Per-exercise cascade */}
        {logs.length > 0 && (
          <div className="mt-7 space-y-1.5">
            {logs.map((log, index) => {
              const sets = log.sets ?? [];
              const volume = Math.round(
                sets.reduce((sum, set) => sum + set.reps * set.weight, 0),
              );
              return (
                <motion.div
                  key={log.id}
                  initial={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.9 + index * 0.07,
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <Dumbbell className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate text-sm font-black">
                    {log.exerciseId?.name ?? "Exercise"}
                  </span>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                    {sets.length} {sets.length === 1 ? "set" : "sets"} ·{" "}
                    {volume.toLocaleString()} kg
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div {...fadeUp(1.0 + logs.length * 0.07)} className="mt-8">
          <Button
            onClick={() => router.push("/dashboard")}
            className="h-12 w-full rounded-full text-base font-black"
          >
            See you tomorrow
            <ArrowRight className="h-5 w-5" />
          </Button>
          <button
            onClick={() => router.push("/log")}
            className="mt-3 w-full text-xs font-black text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to log
          </button>
        </motion.div>
      </div>
    </div>
  );
}
