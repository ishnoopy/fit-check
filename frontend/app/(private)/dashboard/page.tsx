"use client";

import { AppGuide } from "@/components/AppGuide";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
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
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "../../providers";

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
    date: "2026-03-11",
    element: <p className="text-sm text-muted-foreground">
      Workout Calendar added to dashboard.
    </p>,
  },
];
const PATCH_NOTE_VERSION = "2026-03-11";

export default function DashboardPage() {
  const { user } = useUser();
  const dayName = getDayName(new Date().getDay());
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);
  const [isAcknowledgingPatchNotes, setIsAcknowledgingPatchNotes] = useState(false);

  const { data: statsData } = useGetStats({ queryKey: ["stats"] });

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

  const totalLogs = statsData?.totalLogs || 0;
  const exercisesToday = statsData?.exercisesToday || 0;
  const exercisesThisWeek = statsData?.exercisesThisWeek || 0;
  const streak = statsData?.streak || 0;
  const bufferDaysUsed = statsData?.bufferDaysUsed || 0;
  const restDaysBuffer = statsData?.restDaysBuffer || 0;
  const datesWithWorkouts = statsData?.datesWithWorkouts || [];

  // Check if buffer is being used
  const isBufferActive = bufferDaysUsed > 0;

  // Check if buffer is fully used up (reminder to log workout today)
  const isBufferUsedUp =
    bufferDaysUsed === restDaysBuffer && bufferDaysUsed > 0;

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
    {
      icon: TrendingUpIcon,
      value: exercisesThisWeek.toString(),
      label: "Exercises This Week",
      color: "text-green-500",
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
          onEscapeKeyDown={e => e.preventDefault()}
          onInteractOutside={e => e.preventDefault()}
        >
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold text-center">
              <AlertCircleIcon className="size-6" /> What&apos;s new in FitCheck?
            </DialogTitle>
            <DialogDescription className="text-center">
              Effective March 11, 2026:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            {patchNotesDetails.map((patchNote, index) => (
              <div key={`${patchNote.date}-${index}`}>
                <p className="text-sm text-muted-foreground">
                  {patchNote.element}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/10 px-4 py-3 mt-4 text-sm text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 flex items-center gap-2">
            <span role="img" aria-label="gratitude">
              🙏
            </span>
            <span>
              Thank you for being a part of the FitCheck community. Your support, feedback, and dedication means a lot to us!
            </span>
          </div>
          <DialogFooter>
            <Button onClick={handleClosePatchNotes} disabled={isAcknowledgingPatchNotes}>
              {isAcknowledgingPatchNotes ? "Saving..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="FitCheck"
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
            <div className="space-y-1">
              <p className="text-lg text-foreground">
                Welcome back
                <strong>
                  {user.firstName ? `, ${user.firstName}` : ""}
                </strong>{" "}
                👋
              </p>

            </div>

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
                          Reminder 💪
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

            {/* Show guide hint for new users */}
            {totalLogs === 0 && (
              <Card className="border-primary/30 bg-primary/5 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 shrink-0">
                      <CalendarPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-sm">
                        Getting Started Guide
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        New to FitCheck? Click the info button (
                        <span className="inline-flex items-center mx-1">ⓘ</span>
                        ) in the top right to see a step-by-step guide on how to
                        set up your workout plans and start logging! 🎯
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Quick Stats */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-4"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <Card
                className={`bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-sm transition-colors duration-200 group h-full flex flex-col ${stat.classNames} ${stat.showBuffer && isBufferUsedUp ? "border-accent/30" : ""
                  }`}
              >
                <CardContent className="p-6 text-center space-y-3 flex flex-col flex-1">
                  <div
                    className={`inline-flex items-center justify-center p-3 group-hover:scale-110 transition-transform ${stat.color}`}
                  >
                    {typeof stat.icon === "string" ? (
                      <Image src={stat.icon} alt="" width={25} height={25} className="size-6 object-contain" />
                    ) : (
                      <stat.icon className="size-6" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-3xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {stat.label}
                      </p>
                    </div>
                    {/* Buffer indicator inside streak card */}
                    {stat.showBuffer && isBufferActive && streak > 0 ? (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-center gap-1.5 text-xs">
                          <Shield
                            className={`h-3.5 w-3.5 ${isBufferUsedUp ? "text-accent" : "text-accent"}`}
                          />
                          <span className="text-muted-foreground">
                            {bufferDaysUsed}/{restDaysBuffer} rest days used
                          </span>
                        </div>
                        {isBufferUsedUp && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <span className="text-xs text-accent font-medium">
                              <Link href="/log" className="underline">
                                Log workout today
                              </Link>
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-transparent">
                        <div className="h-6"></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Calendar View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="rounded-(--radius) bg-primary/10 p-2">
                  <CalendarIcon className="size-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {streak > 0
                    ? `You're on a ${streak}-day streak! Keep it up! 🔥`
                    : "Workout Calendar"}
                </p>
              </CardTitle>
              <CardDescription>

              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="multiple"
                onSelect={() => {
                  return;
                }}
                modifiers={{
                  workout: datesWithWorkouts.map(dateStr => new Date(dateStr + 'T00:00:00')),
                }}
                modifiersClassNames={{
                  workout: "[&>button]:opacity-100 bg-accent rounded [--cell-size:--spacing(10)]",
                }}
                className="rounded-(--radius) border-0"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
