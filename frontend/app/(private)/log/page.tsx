"use client";

import { AppGuide } from "@/components/AppGuide";
import { PageHeader } from "@/components/PageHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  cn,
  getItemFromLocalStorage,
  getRpeEmoji,
  getRpeLabel,
} from "@/lib/utils";
import { ILog } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  AlertCircleIcon,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HistoryIcon,
  ImageIcon,
  InfoIcon,
  Loader2,
  Pause,
  Play,
  PlusIcon,
  Square,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getExerciseHistory,
  useCreateLog,
  useGetLatestLogs,
  useGetSettings,
  useGetTodayLogs,
} from "@/hooks/query/useLog";
import { useGetAllWorkouts } from "@/hooks/query/useWorkout";

const formSchema = z.object({
  planId: z.string().min(1, { message: "Plan is required" }),
  workoutId: z.string().min(1, { message: "Workout is required" }),
  exerciseId: z.string(),
  sets: z
    .array(
      z.object({
        setNumber: z.number(),
        reps: z.number(),
        weight: z.number(),
        notes: z.string().optional(),
      }),
    )
    .min(1, { message: "At least one set is required" })
    .refine((sets) => sets.every((set) => set.reps > 0 && set.weight > -1), {
      message: "Please fill in reps and weight for all sets",
    }),
  rateOfPerceivedExertion: z.number().min(6).max(10).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Default empty sets structure
const DEFAULT_SETS = [
  {
    setNumber: 1,
    reps: 0,
    weight: 0,
    notes: "",
  },
  {
    setNumber: 2,
    reps: 0,
    weight: 0,
    notes: "",
  },
  {
    setNumber: 3,
    reps: 0,
    weight: 0,
    notes: "",
  },
];

// Exercise Image Component with error handling
function ExerciseImage({
  src,
  alt,
  onClick,
}: {
  src: string;
  alt: string;
  onClick?: () => void;
}) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted/30 rounded-lg border border-border/40">
        <div className="text-center space-y-2 p-4">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-xs text-muted-foreground/60">Image unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-48 bg-muted/30 rounded-lg overflow-hidden border border-border/40",
        onClick && "cursor-pointer hover:border-primary/50 transition-colors",
      )}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain p-2"
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}

interface ExerciseHistoryDialogProps {
  exerciseName: string;
  restTime?: number;
  notes?: string;
  historyData?: ILog[];
  isLoading: boolean;
  userTimezone: string;
  exerciseDescription?: string;
  exerciseImages?: string[];
  exerciseUserId?: string | null;
}

function ExerciseHistoryDialog({
  exerciseName,
  restTime,
  notes,
  historyData,
  isLoading,
  userTimezone,
  exerciseDescription,
  exerciseImages,
  exerciseUserId,
}: ExerciseHistoryDialogProps) {
  const [exerciseInfoExpanded, setExerciseInfoExpanded] = useState(false);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(
    null,
  );
  const past3Logs = historyData?.slice(0, 3) || [];

  const progressionData = React.useMemo(() => {
    if (!historyData || historyData.length === 0) return null;

    const calculateVolume = (log: ILog): number => {
      if (!log.sets || log.sets.length === 0) return 0;
      return log.sets.reduce((total, set) => total + set.reps * set.weight, 0);
    };

    const calculateMaxWeight = (log: ILog): number => {
      if (!log.sets || log.sets.length === 0) return 0;
      return Math.max(...log.sets.map((set) => set.weight));
    };

    const calculateMaxReps = (log: ILog): number => {
      if (!log.sets || log.sets.length === 0) return 0;
      return Math.max(...log.sets.map((set) => set.reps));
    };

    const calculateAvgWeight = (log: ILog): number => {
      if (!log.sets || log.sets.length === 0) return 0;
      const totalWeight = log.sets.reduce((sum, set) => sum + set.weight, 0);
      return totalWeight / log.sets.length;
    };

    const sessions = historyData
      .map((log) => ({
        log,
        volume: calculateVolume(log),
        maxWeight: calculateMaxWeight(log),
        maxReps: calculateMaxReps(log),
        avgWeight: calculateAvgWeight(log),
        date: new Date(log.createdAt),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const latest = sessions[0];
    const previous = sessions[1];

    const bestVolume = Math.max(...sessions.map((s) => s.volume));
    const bestWeight = Math.max(...sessions.map((s) => s.maxWeight));
    const bestReps = Math.max(...sessions.map((s) => s.maxReps));

    const volumeChange =
      previous && latest
        ? ((latest.volume - previous.volume) / previous.volume) * 100
        : null;

    const weightChange =
      previous && latest
        ? ((latest.maxWeight - previous.maxWeight) / previous.maxWeight) * 100
        : null;

    const isVolumePR = latest.volume === bestVolume && sessions.length > 1;
    const isWeightPR = latest.maxWeight === bestWeight && sessions.length > 1;
    const isRepsPR = latest.maxReps === bestReps && sessions.length > 1;

    return {
      latest,
      previous,
      bestVolume,
      bestWeight,
      bestReps,
      volumeChange,
      weightChange,
      isVolumePR,
      isWeightPR,
      isRepsPR,
      totalSessions: sessions.length,
    };
  }, [historyData]);

  return (
    <DialogContent
      className="max-w-[90vw] sm:max-w-[500px] p-4 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
      showCloseButton={true}
      onInteractOutside={(e) => {
        e.stopPropagation();
      }}
      onPointerDownOutside={(e) => {
        e.stopPropagation();
      }}
      onEscapeKeyDown={(e) => {
        e.stopPropagation();
      }}
      onCloseClick={(e) => {
        e.stopPropagation();
      }}
      onOverlayClick={(e) => {
        e.stopPropagation();
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-sm font-medium flex items-center gap-2">
          <InfoIcon className="h-4 w-4 text-muted-foreground" />
          {exerciseName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {restTime && `Rest time: ${restTime} seconds. `}
          {notes && `Notes: ${notes}`}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {(restTime || notes) && (
          <div className="space-y-2 pb-2 border-b">
            {restTime && (
              <div className="font-medium leading-tight">Rest: {restTime}s</div>
            )}
            {notes && (
              <div className="text-muted-foreground/90 leading-snug">
                {notes}
              </div>
            )}
          </div>
        )}

        {/* Exercise Info Accordion */}
        <div className="pb-2 border-b">
          <button
            onClick={(e) => {
              setExerciseInfoExpanded(!exerciseInfoExpanded);
              e.stopPropagation();
            }}
            className="w-full flex items-center justify-between py-2 text-left hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
          >
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Exercise Info
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                exerciseInfoExpanded && "rotate-180",
              )}
            />
          </button>
          {exerciseInfoExpanded && (
            <div className="pt-3 space-y-3">
              {exerciseDescription ||
              (exerciseImages &&
                exerciseImages.length > 0 &&
                !exerciseUserId) ? (
                <>
                  {exerciseDescription && (
                    <p className="text-xs text-muted-foreground/90 leading-relaxed">
                      {exerciseDescription}
                    </p>
                  )}
                  {exerciseImages &&
                    exerciseImages.length > 0 &&
                    !exerciseUserId && (
                      <div className="grid grid-cols-2 gap-2">
                        {exerciseImages.map((image, imgIndex) => (
                          <ExerciseImage
                            key={imgIndex}
                            src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${image}`}
                            alt={`${exerciseName} - ${imgIndex + 1}`}
                            onClick={() => setExpandedImageIndex(imgIndex)}
                          />
                        ))}
                      </div>
                    )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">
                  No description added
                </p>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading history...
          </div>
        ) : (
          <>
            {past3Logs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Past 3 Logs
                </h3>
                <div className="space-y-1">
                  {past3Logs.map((log: ILog, idx: number) => {
                    const logDate = formatInTimeZone(
                      new Date(log.createdAt),
                      userTimezone,
                      "MMM d",
                    );
                    return (
                      <div
                        key={log.id || idx}
                        className="flex items-start gap-2.5 py-2 px-2 border-b border-border/30 last:border-0 hover:bg-muted/20 rounded-md transition-colors"
                      >
                        <span className="text-muted-foreground font-medium text-[11px] min-w-14 pt-0.5">
                          {logDate}
                        </span>
                        <div className="flex flex-wrap gap-1.5 flex-1 items-center">
                          {log.sets?.map(
                            (
                              set: { reps: number; weight: number },
                              setIdx: number,
                            ) => (
                              <span
                                key={setIdx}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 border border-border/40 text-foreground font-semibold text-[10px]"
                              >
                                {set.reps}×{set.weight}kg
                              </span>
                            ),
                          )}
                        </div>
                        {log.rateOfPerceivedExertion && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-base leading-none">
                              {getRpeEmoji(log.rateOfPerceivedExertion)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {getRpeLabel(log.rateOfPerceivedExertion)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {progressionData && (
              <div className="space-y-3 pt-2 border-t">
                <h3 className="text-xs font-semibold text-foreground">
                  Progression
                </h3>
                <div className="space-y-2.5">
                  {/* Latest Session Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/30 rounded-(--radius) border border-border/50">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        Volume
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">
                          {Math.round(progressionData.latest.volume)} kg
                        </span>
                        {progressionData.isVolumePR && (
                          <Trophy className="h-3 w-3 text-accent" />
                        )}
                        {progressionData.volumeChange !== null && (
                          <span
                            className={cn(
                              "text-[10px] font-medium flex items-center gap-0.5",
                              progressionData.volumeChange > 0
                                ? "text-accent"
                                : progressionData.volumeChange < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                            )}
                          >
                            {progressionData.volumeChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : progressionData.volumeChange < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            {progressionData.volumeChange > 0 ? "+" : ""}
                            {Math.round(progressionData.volumeChange)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/30 rounded-(--radius) border border-border/50">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        Max Weight
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">
                          {progressionData.latest.maxWeight} kg
                        </span>
                        {progressionData.isWeightPR && (
                          <Trophy className="h-3 w-3 text-accent" />
                        )}
                        {progressionData.weightChange !== null && (
                          <span
                            className={cn(
                              "text-[10px] font-medium flex items-center gap-0.5",
                              progressionData.weightChange > 0
                                ? "text-accent"
                                : progressionData.weightChange < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                            )}
                          >
                            {progressionData.weightChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : progressionData.weightChange < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            {progressionData.weightChange > 0 ? "+" : ""}
                            {Math.round(progressionData.weightChange)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Personal Records */}
                  <div className="p-2 bg-muted/20 rounded-(--radius) border border-border/50">
                    <div className="text-[10px] text-muted-foreground mb-2">
                      Personal Records
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className="text-muted-foreground">Best Volume</div>
                        <div className="font-semibold text-xs">
                          {Math.round(progressionData.bestVolume)} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Best Weight</div>
                        <div className="font-semibold text-xs">
                          {progressionData.bestWeight} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Best Reps</div>
                        <div className="font-semibold text-xs">
                          {progressionData.bestReps} reps
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Count */}
                  <div className="text-[10px] text-muted-foreground text-center pt-1">
                    {progressionData.totalSessions}{" "}
                    {progressionData.totalSessions === 1
                      ? "session"
                      : "sessions"}{" "}
                    tracked
                  </div>
                </div>
              </div>
            )}

            {!isLoading && past3Logs.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-xs">
                No history available for this exercise yet.
              </div>
            )}
          </>
        )}
      </div>

      {/* Expanded Image Dialog */}
      {expandedImageIndex !== null &&
        exerciseImages &&
        exerciseImages.length > 0 && (
          <div
            className="fixed inset-0 z-100 bg-background/95 flex items-center justify-center"
            onClick={() => setExpandedImageIndex(null)}
          >
            <button
              onClick={() => setExpandedImageIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-(--radius) bg-background border border-border hover:bg-muted transition-colors shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>

            {exerciseImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImageIndex(
                      expandedImageIndex === 0
                        ? exerciseImages.length - 1
                        : expandedImageIndex - 1,
                    );
                  }}
                  className="absolute left-4 z-10 p-2 rounded-(--radius) bg-background/70 border border-border hover:bg-muted transition-colors shadow-sm"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImageIndex(
                      (expandedImageIndex + 1) % exerciseImages.length,
                    );
                  }}
                  className="absolute right-4 z-10 p-2 rounded-(--radius) bg-background/70 border border-border hover:bg-muted transition-colors shadow-sm"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div
              className="relative w-full max-w-4xl h-[80vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exerciseImages[expandedImageIndex]}`}
                alt={`${exerciseName} - ${expandedImageIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>

            {exerciseImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted-foreground bg-background border border-border px-3 py-1.5 rounded-(--radius) shadow-sm">
                {expandedImageIndex + 1} / {exerciseImages.length}
              </div>
            )}
          </div>
        )}
    </DialogContent>
  );
}

export default function LogPage() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activePlanId] = useState<string>(
    getItemFromLocalStorage("activePlanId") || "",
  );
  const [activeWorkoutId, setActiveWorkoutId] = useState<string>(
    getItemFromLocalStorage("activeWorkoutId") || "",
  );
  const [activeExerciseId, setActiveExerciseId] = useState<string>(
    getItemFromLocalStorage("activeExerciseId") || "",
  );
  const [countdown, setCountdown] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [exerciseHistoryCache, setExerciseHistoryCache] = useState<
    Record<string, ILog[]>
  >({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>(
    {},
  );
  const [showRpeDialog, setShowRpeDialog] = useState<boolean>(false);
  const [pendingFormValues, setPendingFormValues] = useState<FormValues | null>(
    null,
  );

  const { data: settings } = useGetSettings();

  const userTimezone =
    settings?.settings?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planId: activePlanId || "",
      workoutId: activeWorkoutId || "",
      exerciseId: activeExerciseId || "",
      sets: DEFAULT_SETS,
      rateOfPerceivedExertion: undefined,
      notes: "",
    },
  });

  const { data: workouts } = useGetAllWorkouts({
    planId: activePlanId,
    queryKey: ["workouts", activePlanId],
  });

  const workoutData = workouts?.find(
    (workout) => workout.id === activeWorkoutId,
  );

  const activeExercisesList =
    workoutData?.exercises?.filter((exercise) => exercise.isActive) || [];
  const activeExerciseDetails = activeExercisesList.find(
    (exercise) => exercise.exercise.id === activeExerciseId,
  );

  useEffect(() => {
    const restTime = activeExerciseDetails?.restTime || 0;
    setCountdown(restTime);

    // Clear any running timer when exercise changes
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTimerRunning(false);
  }, [activeExerciseDetails]);

  const startRestTime = (e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent accordion from toggling

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Resume from current countdown if paused, otherwise start from rest time
    const initialCountdown = activeExerciseDetails?.restTime || 0;
    const currentCountdown =
      countdown > 0 && countdown < initialCountdown
        ? countdown
        : initialCountdown;

    if (currentCountdown <= 0) {
      toast.error("No rest time set for this exercise");
      return;
    }

    setCountdown(currentCountdown);
    setIsTimerRunning(true);

    let countdownInSeconds = currentCountdown;

    intervalRef.current = setInterval(() => {
      countdownInSeconds -= 1;
      setCountdown(countdownInSeconds);

      if (countdownInSeconds <= 0) {
        setIsTimerRunning(false);
        setCountdown(initialCountdown);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (audioRef.current) {
          audioRef.current.play();
        }
        toast.success("Rest time complete! 💪");
      }
    }, 1000);
  };

  const pauseRestTime = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTimerRunning(false);
  };

  // clean up
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stopRestTime = (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTimerRunning(false);
    setCountdown(activeExerciseDetails?.restTime || 0);
  };

  const getTodayDateRange = () => {
    const nowInUserTz = toZonedTime(new Date(), userTimezone);
    const startOfDay = new Date(nowInUserTz);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(nowInUserTz);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
  };

  const { startOfDay, endOfDay } = getTodayDateRange();

  const { data: todayLogs } = useGetTodayLogs({
    activePlanId,
    activeWorkoutId,
    startOfDay,
    endOfDay,
  });

  const { data: latestLogs } = useGetLatestLogs({
    exerciseIds: activeExercisesList.map((exercise) => exercise.exercise.id),
  });

  const progress = todayLogs
    ? Math.round((todayLogs.length / activeExercisesList.length) * 100)
    : 0;

  const createLogMutation = useCreateLog({
    onSuccess: () => {
      // Clear exercise history cache for the active exercise so it refetches when info icon is clicked
      if (activeExerciseId) {
        setExerciseHistoryCache((prev) => {
          const updated = { ...prev };
          delete updated[activeExerciseId];
          return updated;
        });
      }

      toast.success("Log created successfully");

      // remove the key from the local storage
      const draftDocumentCollection = getItemFromLocalStorage("logFormDrafts")
        ? JSON.parse(getItemFromLocalStorage("logFormDrafts") || "")
        : {};
      delete draftDocumentCollection[activeExerciseId];
      localStorage.setItem(
        "logFormDrafts",
        JSON.stringify(draftDocumentCollection),
      );

      form.reset();
    },
    onError: (error: Error) => {
      console.error("Failed to create log", error);
      toast.error("Failed to create log. Please try again.");
    },
  });

  const handleExerciseChange = (value: string) => {
    setActiveExerciseId(value);
    localStorage.setItem("activeExerciseId", value);
  };

  const handleWorkoutChange = (value: string) => {
    setActiveWorkoutId(value);
    localStorage.setItem("activeWorkoutId", value);
  };

  // Save form draft to local storage on change
  const formValues = form.watch();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const DRAFT_SAVE_DELAY_MS = 800;

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      try {
        if (!activeExerciseId) return;

        const draftDocumentCollection = getItemFromLocalStorage("logFormDrafts")
          ? JSON.parse(getItemFromLocalStorage("logFormDrafts") || "")
          : {};
        const draftData = formValues;
        draftDocumentCollection[activeExerciseId] = draftData;
        localStorage.setItem(
          "logFormDrafts",
          JSON.stringify(draftDocumentCollection),
        );
      } catch (error) {
        console.log("Failed to save draft: ", error);
      }
    }, DRAFT_SAVE_DELAY_MS);

    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, [formValues, form, activeExerciseId]);

  // Update form values when exercise changes or when log data is available for the day.
  useEffect(() => {
    if (!activeExerciseId) return;

    // Find log data for the current exercise
    const todayLogForExercise = todayLogs?.find(
      (log) => log.exerciseId?.id === activeExerciseId,
    );

    const draftFormData = (() => {
      try {
        const draftDocumentCollection = getItemFromLocalStorage("logFormDrafts")
          ? JSON.parse(getItemFromLocalStorage("logFormDrafts") || "")
          : {};
        return draftDocumentCollection[activeExerciseId] || null;
      } catch (error) {
        console.log("Failed to load draft: ", error);
        return null;
      }
    })();

    const previousLogForExercise = latestLogs?.find(
      (log) => log.exerciseId?.id === activeExerciseId,
    );

    // Update form with log data if available
    if (todayLogForExercise) {
      form.setValue("exerciseId", activeExerciseId);
      form.setValue("planId", activePlanId || "");
      form.setValue("workoutId", activeWorkoutId || "");
      form.setValue("sets", todayLogForExercise.sets || DEFAULT_SETS);
      form.setValue(
        "rateOfPerceivedExertion",
        todayLogForExercise.rateOfPerceivedExertion,
      );
      form.setValue("notes", todayLogForExercise.notes || "");
    } else if (draftFormData) {
      // Load draft data if available for the active exercise
      form.setValue("exerciseId", draftFormData.exerciseId);
      form.setValue("planId", draftFormData.planId);
      form.setValue("workoutId", draftFormData.workoutId);
      form.setValue("sets", draftFormData.sets || DEFAULT_SETS);
      form.setValue(
        "rateOfPerceivedExertion",
        draftFormData.rateOfPerceivedExertion,
      );
      form.setValue("notes", draftFormData.notes || "");
    } else {
      const DEFAULT_NUMBER_OF_SETS = 3;
      const numberOfSetsToResetTo =
        previousLogForExercise?.sets?.length || DEFAULT_NUMBER_OF_SETS;

      const createEmptySets = (
        numberOfSets: number = DEFAULT_NUMBER_OF_SETS,
      ) => {
        return Array.from({ length: numberOfSets }, (_, index) => ({
          setNumber: index + 1,
          reps: 0,
          weight: 0,
          notes: "",
        }));
      };

      // Reset to defaults if no log data exists
      form.setValue("exerciseId", activeExerciseId);
      form.setValue("planId", activePlanId || "");
      form.setValue("workoutId", activeWorkoutId || "");
      form.setValue("sets", createEmptySets(numberOfSetsToResetTo));
      form.setValue("rateOfPerceivedExertion", undefined);
      form.setValue("notes", "");
    }
  }, [
    activeExerciseId,
    todayLogs,
    latestLogs,
    activePlanId,
    activeWorkoutId,
    form,
  ]);

  const onSubmit = (values: FormValues) => {
    setPendingFormValues(values);
    setShowRpeDialog(true);
  };

  const handleRpeSelection = (rpe: number) => {
    if (!pendingFormValues) return;

    const payload = {
      ...pendingFormValues,
      planId: activePlanId,
      workoutId: activeWorkoutId,
      exerciseId: activeExerciseId,
      rateOfPerceivedExertion: rpe,
    };
    createLogMutation.mutate(payload);
    setShowRpeDialog(false);
    setPendingFormValues(null);
  };

  if (activePlanId === "") {
    return (
      <div className="min-h-screen pb-24">
        <div className="p-4 max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <PageHeader title="Log" subtitle="Log your workouts" />
            <AppGuide />
          </div>
          <Card className="border-dashed">
            <CardContent className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3">
                <AlertCircleIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-base mb-1">No Active Plan</h3>
              <p className="text-xs text-muted-foreground mb-2 max-w-xs mx-auto">
                You must set a plan as active to start logging workouts.
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                Go to{" "}
                <Link
                  href="/plans"
                  className="text-primary underline font-medium"
                >
                  Plans
                </Link>{" "}
                to set an active plan.
              </p>
              <Button size="sm" asChild>
                <Link href="/plans">Go to Plans</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Hidden audio element */}
      <audio ref={audioRef} src="/notif-sound.mp3" />

      <div className="p-4 max-w-xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <PageHeader title="Log" subtitle="Log your workouts" />
          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 absolute right-3 top-3 sm:relative sm:top-0 sm:right-0 z-10">
            <AppGuide />
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href="/logs/archive">
                <HistoryIcon className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Select
          onValueChange={handleWorkoutChange}
          value={activeWorkoutId || ""}
        >
          <SelectTrigger className="h-9 cursor-pointer">
            <SelectValue placeholder="Select workout" />
          </SelectTrigger>
          <SelectContent>
            {workouts?.map((workout) => (
              <SelectItem key={workout.id} value={workout.id}>
                {workout.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Progress</span>
          <Progress value={progress} className="flex-1 h-1.5" />
          <span className="text-muted-foreground font-medium min-w-10 text-right">
            {progress}%
          </span>
        </div>
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={activeExerciseId ?? ""}
          onValueChange={(value) => {
            if (value) {
              handleExerciseChange(value);
              return;
            }
            setActiveExerciseId("");
          }}
        >
          {activeExercisesList.map((exerciseItem) => {
            const exercise = exerciseItem.exercise;
            const isLogged = todayLogs?.some(
              (log) => log.exerciseId?.id === exercise.id,
            );

            const logData = todayLogs?.find(
              (log) => log.exerciseId?.id === exercise.id,
            );

            const latestExerciseLog = latestLogs?.find(
              (log) => log.exerciseId?.id === exercise.id,
            );

            const isActiveExercise = activeExerciseId === exercise.id;
            const isCurrentExerciseTimer =
              isActiveExercise &&
              (isTimerRunning || countdown < (exerciseItem.restTime || 0));
            const displayCountdown = isCurrentExerciseTimer
              ? countdown
              : exerciseItem.restTime || 0;

            return (
              <AccordionItem
                key={exercise.id}
                value={exercise.id}
                className="border-b"
              >
                <AccordionTrigger
                  className={`cursor-pointer py-2.5 px-3 hover:no-underline ${
                    isLogged ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    {isLogged && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span
                      className={`flex-1 text-left text-sm ${
                        isLogged ? "font-medium" : ""
                      } ${isActiveExercise ? "font-bold text-primary" : ""}`}
                    >
                      {exercise.name}
                    </span>
                    {isLogged && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Done
                      </span>
                    )}
                    {/* Rest Timer */}
                    {exerciseItem.restTime !== undefined &&
                      isActiveExercise &&
                      !isLogged && (
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors",
                              isTimerRunning
                                ? "bg-primary/10 border-primary/20 text-primary"
                                : "bg-muted/30 border-border/50 text-muted-foreground",
                            )}
                          >
                            <Timer className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs font-mono font-semibold tabular-nums min-w-8 text-center">
                              {displayCountdown}s
                            </span>
                            {isTimerRunning ? (
                              <div
                                role="button"
                                tabIndex={0}
                                className="h-5 w-5 shrink-0 hover:bg-primary/20 rounded-md flex items-center justify-center cursor-pointer transition-colors"
                                onClick={pauseRestTime}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    pauseRestTime();
                                  }
                                }}
                              >
                                <Pause className="h-3 w-3" />
                              </div>
                            ) : (
                              <div
                                role="button"
                                tabIndex={0}
                                className="h-5 w-5 shrink-0 hover:bg-primary/20 rounded-md flex items-center justify-center cursor-pointer transition-colors"
                                onClick={startRestTime}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    startRestTime();
                                  }
                                }}
                              >
                                <Play className="h-3 w-3" />
                              </div>
                            )}
                            {countdown < (exerciseItem.restTime || 0) && (
                              <div
                                role="button"
                                tabIndex={0}
                                className="h-5 w-5 shrink-0 hover:bg-destructive/20 text-destructive rounded-md flex items-center justify-center cursor-pointer transition-colors"
                                onClick={stopRestTime}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    stopRestTime();
                                  }
                                }}
                              >
                                <Square className="h-2.5 w-2.5 fill-current" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    <Dialog
                      onOpenChange={(open) => {
                        if (
                          open &&
                          !exerciseHistoryCache[exercise.id] &&
                          !loadingHistory[exercise.id]
                        ) {
                          setLoadingHistory((prev) => ({
                            ...prev,
                            [exercise.id]: true,
                          }));
                          getExerciseHistory(exercise.id)
                            .then((response) => {
                              setExerciseHistoryCache((prev) => ({
                                ...prev,
                                [exercise.id]: response.data,
                              }));
                            })
                            .catch((error) => {
                              console.error(
                                "Failed to fetch exercise history",
                                error,
                              );
                            })
                            .finally(() => {
                              setLoadingHistory((prev) => ({
                                ...prev,
                                [exercise.id]: false,
                              }));
                            });
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <span
                          className="shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <InfoIcon className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                        </span>
                      </DialogTrigger>
                      <ExerciseHistoryDialog
                        exerciseName={exercise.name}
                        restTime={exerciseItem.restTime}
                        notes={exercise.notes}
                        historyData={exerciseHistoryCache[exercise.id]}
                        isLoading={loadingHistory[exercise.id] || false}
                        userTimezone={userTimezone}
                        exerciseDescription={exercise.description}
                        exerciseImages={exercise.images}
                        exerciseUserId={exercise.userId}
                      />
                    </Dialog>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 py-3 space-y-2.5">
                  {/* Last Performance */}
                  {latestExerciseLog && !isLogged && (
                    <div className="text-[11px] text-muted-foreground space-y-1 pb-2 border-b">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <HistoryIcon className="h-3 w-3 shrink-0 opacity-60" />
                        <span className="font-medium">
                          {formatInTimeZone(
                            new Date(latestExerciseLog.createdAt),
                            userTimezone,
                            "MMM d",
                          )}
                        </span>
                        <span className="opacity-40">•</span>
                        {latestExerciseLog.sets
                          ?.slice(0, 3)
                          .map(
                            (
                              s: { reps: number; weight: number },
                              idx: number,
                            ) => (
                              <span
                                key={idx}
                                className="inline-flex px-1 py-0.5 rounded bg-muted text-foreground font-medium"
                              >
                                {s.reps}×{s.weight}kg
                              </span>
                            ),
                          )}
                        {latestExerciseLog.sets &&
                          latestExerciseLog.sets.length > 3 && (
                            <span className="opacity-40">
                              +{latestExerciseLog.sets.length - 3}
                            </span>
                          )}
                      </div>
                      {latestExerciseLog.notes && (
                        <p className="text-[11px] text-muted-foreground/70 italic truncate pl-4">
                          &ldquo;{latestExerciseLog.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {isLogged && logData ? (
                    <div className="space-y-2.5">
                      {/* Sets Display */}
                      <div className="space-y-1.5">
                        <div className="space-y-1">
                          {logData.sets &&
                            logData.sets.length > 0 &&
                            logData.sets.map((set, idx) => (
                              <div
                                key={idx}
                                className="flex gap-2 items-center py-1.5 px-2 bg-muted/30 rounded border border-border/50"
                              >
                                <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-foreground font-semibold text-[10px] shrink-0">
                                  {idx + 1}
                                </div>
                                <span className="text-xs font-medium text-foreground w-12 text-center">
                                  {set.reps}×
                                </span>
                                <span className="text-xs font-medium text-foreground w-14 text-center">
                                  {set.weight}kg
                                </span>
                                {set.notes && (
                                  <span className="text-[11px] text-muted-foreground flex-1 truncate">
                                    {set.notes}
                                  </span>
                                )}
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Notes Display */}
                      {logData.notes && (
                        <div className="flex gap-2 pt-1 border-t">
                          <div className="text-[11px] text-muted-foreground flex-1 truncate">
                            {logData.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Form {...form} key={exercise.id}>
                      <fieldset disabled={isLogged} className="space-y-2.5">
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-2.5"
                        >
                          <FormField
                            control={form.control}
                            name="sets"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="space-y-1.5">
                                    {field.value &&
                                      Array.isArray(field.value) &&
                                      field.value.length > 0 &&
                                      field.value.map((set, idx) => (
                                        <div
                                          key={idx}
                                          className="flex gap-1.5 items-center p-1.5 bg-muted/20 border border-border/50 rounded hover:bg-muted/30 transition-colors"
                                        >
                                          <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-foreground font-semibold text-[10px] shrink-0">
                                            {idx + 1}
                                          </div>
                                          <Input
                                            type="number"
                                            placeholder="R"
                                            value={set.reps || ""}
                                            min={0}
                                            onChange={(e) => {
                                              const sets =
                                                field.value?.slice() || [];
                                              sets[idx] = {
                                                ...sets[idx],
                                                setNumber: idx + 1,
                                                reps:
                                                  Number(e.target.value) || 0,
                                              };
                                              field.onChange(sets);
                                            }}
                                            className="w-14 h-8 text-center text-xs font-medium p-0"
                                          />
                                          <span className="text-[10px] text-muted-foreground">
                                            ×
                                          </span>
                                          <Input
                                            type="number"
                                            step="0.5"
                                            min={0}
                                            placeholder="W"
                                            value={set.weight ?? ""}
                                            onFocus={(e) => {
                                              if (e.target.value === "0") {
                                                e.target.value = "";
                                              }
                                            }}
                                            onBlur={(e) => {
                                              // remove leading zeros
                                              e.target.value =
                                                e.target.value.replace(
                                                  /^0+/,
                                                  "",
                                                );
                                              if (e.target.value === "") {
                                                e.target.value = "0";
                                              }
                                            }}
                                            onChange={(e) => {
                                              const sets =
                                                field.value?.slice() || [];
                                              sets[idx] = {
                                                ...sets[idx],
                                                weight:
                                                  Number(e.target.value) || 0,
                                              };
                                              field.onChange(sets);
                                            }}
                                            className="w-16 h-8 text-center text-xs font-medium p-0"
                                          />
                                          <span className="text-[10px] text-muted-foreground">
                                            kg
                                          </span>
                                          <Input
                                            placeholder="Notes"
                                            value={set.notes || ""}
                                            onChange={(e) => {
                                              const sets =
                                                field.value?.slice() || [];
                                              sets[idx] = {
                                                ...sets[idx],
                                                notes: e.target.value,
                                              };
                                              field.onChange(sets);
                                            }}
                                            className="flex-1 min-w-0 h-8 text-[11px]"
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => {
                                              const sets =
                                                field.value?.slice() || [];
                                              sets.splice(idx, 1);
                                              sets.forEach((s, i) => {
                                                s.setNumber = i + 1;
                                              });
                                              field.onChange(sets);
                                            }}
                                          >
                                            <XIcon className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ))}

                                    {/* Notes */}
                                    <div className="pt-1">
                                      <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormControl>
                                              <Textarea
                                                placeholder="Notes"
                                                {...field}
                                                rows={2}
                                                className="text-xs resize-none"
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>

                                    {!isLogged && (
                                      <div className="space-y-2 pt-1">
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-8 text-xs border-dashed"
                                            onClick={() => {
                                              const currentSets = Array.isArray(
                                                field.value,
                                              )
                                                ? field.value.slice()
                                                : [];
                                              field.onChange([
                                                ...currentSets,
                                                {
                                                  setNumber:
                                                    currentSets.length + 1,
                                                  reps: 0,
                                                  weight: 0,
                                                  notes: "",
                                                },
                                              ]);
                                            }}
                                          >
                                            <PlusIcon className="h-3.5 w-3.5 mr-1" />
                                            Add Set
                                          </Button>
                                          <Button
                                            type="submit"
                                            size="sm"
                                            className="flex-1 h-8 text-xs"
                                          >
                                            Submit
                                          </Button>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="w-full h-8 text-xs text-muted-foreground hover:text-destructive"
                                          onClick={() => {
                                            const DEFAULT_NUMBER_OF_SETS = 3;
                                            const previousLogForExercise =
                                              latestLogs?.find(
                                                (log) =>
                                                  log.exerciseId?.id ===
                                                  activeExerciseId,
                                              );
                                            const numberOfSetsToResetTo =
                                              previousLogForExercise?.sets
                                                ?.length ||
                                              DEFAULT_NUMBER_OF_SETS;

                                            const createEmptySets = (
                                              numberOfSets: number = DEFAULT_NUMBER_OF_SETS,
                                            ) => {
                                              return Array.from(
                                                { length: numberOfSets },
                                                (_, index) => ({
                                                  setNumber: index + 1,
                                                  reps: 0,
                                                  weight: 0,
                                                  notes: "",
                                                }),
                                              );
                                            };

                                            form.setValue(
                                              "sets",
                                              createEmptySets(
                                                numberOfSetsToResetTo,
                                              ),
                                            );
                                            form.setValue(
                                              "rateOfPerceivedExertion",
                                              undefined,
                                            );
                                            form.setValue("notes", "");

                                            // Remove draft from local storage
                                            const draftDocumentCollection =
                                              getItemFromLocalStorage(
                                                "logFormDrafts",
                                              )
                                                ? JSON.parse(
                                                    getItemFromLocalStorage(
                                                      "logFormDrafts",
                                                    ) || "",
                                                  )
                                                : {};
                                            delete draftDocumentCollection[
                                              activeExerciseId
                                            ];
                                            localStorage.setItem(
                                              "logFormDrafts",
                                              JSON.stringify(
                                                draftDocumentCollection,
                                              ),
                                            );

                                            toast.success("Form reset");
                                          }}
                                        >
                                          Reset
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </form>
                      </fieldset>
                    </Form>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* RPE Selection Dialog */}
      <Dialog open={showRpeDialog} onOpenChange={setShowRpeDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-[640px] p-4 sm:p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center">
              How did that feel?
            </DialogTitle>
            <DialogDescription className="text-xs text-center text-muted-foreground">
              Select your effort level
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {[
              {
                rpe: 10,
                emoji: "🔥",
                label: "Max Effort",
                description: "0 reps left",
              },
              {
                rpe: 9,
                emoji: "😤",
                label: "Very Hard",
                description: "≈1 rep left",
              },
              {
                rpe: 8,
                emoji: "😮‍💨",
                label: "Hard",
                description: "≈2 reps left",
              },
              {
                rpe: 7,
                emoji: "🙂",
                label: "Challenging",
                description: "≈3 reps left",
              },
              {
                rpe: 6,
                emoji: "😌",
                label: "Easy",
                description: "4+ reps left",
              },
            ].map(({ rpe, emoji, label, description }) => (
              <button
                key={rpe}
                onClick={() => handleRpeSelection(rpe)}
                className="cursor-pointer group w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-border/60 bg-background hover:bg-muted/30 hover:border-primary/40 transition-colors"
                aria-label={`RPE ${rpe}: ${label}`}
              >
                <span className="text-2xl leading-none shrink-0">{emoji}</span>
                <div className="min-w-0 flex-1 text-left">
                  <div className="font-semibold text-sm leading-tight truncate">
                    {label}
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight truncate">
                    {description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              setShowRpeDialog(false);
              setPendingFormValues(null);
            }}
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
