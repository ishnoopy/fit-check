"use client";

import postSessionMascot from "@/assets/hero-post-session.png";
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
  formatSecondsToMinutesSeconds,
  getItemFromLocalStorage,
} from "@/lib/utils";
import { ILog, ISetData } from "@/types";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircleIcon,
  Check,
  CheckCircle2,
  GripVertical,
  HistoryIcon,
  InfoIcon,
  Pencil,
  Play,
  PlusIcon,
  Timer,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { WebHaptics } from "web-haptics";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTimer } from "@/contexts/TimerContext";
import {
  getExerciseHistory,
  useCreateLog,
  useGetLatestLogs,
  useGetSettings,
  useGetTodayLogs,
  useUpdateLog,
} from "@/hooks/query/useLog";
import {
  useGetAllWorkouts,
  useReorderWorkoutExercises,
} from "@/hooks/query/useWorkout";
import ExerciseHistoryDialog from "./ExerciseHistoryDialog";
import { DrumPicker } from "@/components/DrumPicker";
import {
  finishSession,
  formatDuration,
  getActiveSession,
  startSession,
  summarizeSession,
  type WorkoutSession,
} from "@/lib/workoutSession";

const REP_ITEMS = Array.from({ length: 51 }, (_, repIndex) => repIndex);
const WEIGHT_ITEMS = Array.from(
  { length: 501 },
  (_, weightIndex) => Math.round(weightIndex * 0.5 * 10) / 10,
);

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

const CHEER_MESSAGES = [
  "Set logged. You chose strength today.",
  "You moved the needle. Stronger is the new baseline.",
  "That lift had your name on it. Respect.",
  "You showed up and did the work. Champion energy.",
  "Another rep in the bank. Future you is flexing.",
  "That was clean. Be proud of that effort.",
  "You didn't just train, you leveled up.",
  "Own that finish. You earned it.",
];

type CheerMoment = {
  id: number;
  message: string;
};

function PostSessionCheer({ cheer }: { cheer: CheerMoment | null }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {cheer && (
        <motion.div
          key={cheer.id}
          data-testid="post-session-cheer"
          className="pointer-events-none fixed left-1 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex max-w-[calc(100vw-0.5rem)] items-end gap-1 sm:left-5 sm:bottom-5 sm:gap-3"
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
                  y: [0, -8, 0],
                  rotate: [-4, 2, 0],
                  scale: [1, 1.035, 1],
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
                  y: { duration: 1.1, repeat: 3, ease: "easeInOut" },
                  scale: { duration: 0.7, ease: "easeOut" },
                }
          }
        >
          <div className="relative h-[54vw] max-h-72 min-h-52 w-[38vw] min-w-36 max-w-52 shrink-0">
            <Image
              src={postSessionMascot}
              alt="TUFF mascot celebrating"
              fill
              sizes="(max-width: 640px) 38vw, 208px"
              className="object-contain drop-shadow-[0_22px_28px_rgb(29_26_20_/_0.26)]"
              priority={false}
            />
          </div>

          <motion.div
            className="mb-14 max-w-[17rem] rounded-2xl border-2 border-secondary bg-card px-3 py-2.5 shadow-lg sm:mb-20 sm:max-w-[19rem] sm:px-4 sm:py-3.5"
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82 }
            }
            animate={
              shouldReduceMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: [1, 1.06, 1] }
            }
            exit={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }
            }
            transition={{ delay: shouldReduceMotion ? 0 : 0.14, duration: 0.3 }}
          >
            <p className="text-base font-black leading-tight text-foreground sm:text-lg">
              {cheer.message}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SortableExerciseItem({
  id,
  children,
}: {
  id: string;
  children: (
    dragHandleProps: Pick<
      ReturnType<typeof useSortable>,
      "attributes" | "listeners" | "setActivatorNodeRef" | "isDragging"
    >,
  ) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "z-20 opacity-80")}
    >
      {children({
        attributes,
        listeners,
        setActivatorNodeRef,
        isDragging,
      })}
    </div>
  );
}

export default function LogPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { isTimerRunning, timerExerciseId, startRestTime, stopRestTime } = useTimer();
  const [checkedSets, setCheckedSets] = useState<Record<string, number[]>>({});
  const hapticsRef = useRef<WebHaptics | null>(null);
  const cheerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cheer, setCheer] = useState<CheerMoment | null>(null);
  const [activePlanId] = useState<string>(
    getItemFromLocalStorage("activePlanId") || "",
  );
  const [activeWorkoutId, setActiveWorkoutId] = useState<string>(
    getItemFromLocalStorage("activeWorkoutId") || "",
  );
  const [activeExerciseId, setActiveExerciseId] = useState<string>(
    getItemFromLocalStorage("activeExerciseId") || "",
  );
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
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(
    null,
  );
  const [editSets, setEditSets] = useState<ISetData[]>([]);
  const [editNotes, setEditNotes] = useState<string>("");
  const [invalidSets, setInvalidSets] = useState<Record<string, number[]>>({});
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(
    null,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const { data: settings } = useGetSettings();


  useEffect(() => {
    hapticsRef.current = new WebHaptics();

    return () => {
      hapticsRef.current?.destroy();
      hapticsRef.current = null;
      if (cheerTimeoutRef.current) {
        clearTimeout(cheerTimeoutRef.current);
      }
    };
  }, []);

  // Restore an in-progress workout session for the selected workout.
  useEffect(() => {
    const active = getActiveSession();
    setWorkoutSession(
      active && active.workoutId === activeWorkoutId ? active : null,
    );
  }, [activeWorkoutId]);

  // Tick the live workout duration while a session is running.
  useEffect(() => {
    if (!workoutSession || workoutSession.workoutId !== activeWorkoutId) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () =>
      setElapsedSeconds(
        Math.floor((Date.now() - workoutSession.startedAt) / 1000),
      );

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);
    return () => clearInterval(intervalId);
  }, [workoutSession, activeWorkoutId]);

  const showPostSessionCheer = () => {
    const message =
      CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)];

    setCheer({
      id: Date.now(),
      message,
    });

    if (cheerTimeoutRef.current) {
      clearTimeout(cheerTimeoutRef.current);
    }

    cheerTimeoutRef.current = setTimeout(() => {
      setCheer(null);
      cheerTimeoutRef.current = null;
    }, 6000);
  };

  const triggerErrorHapticFeedback = () => {
    void hapticsRef.current?.trigger("error");
  };

  const triggerSuccessHapticFeedback = () => {
    void hapticsRef.current?.trigger([
      { duration: 30 },
      { delay: 60, duration: 40, intensity: 1 },
    ]);
  };

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

  const activeExercisesList = useMemo(() => {
    const activeExercises =
      workoutData?.exercises?.filter((exercise) => exercise.isActive) || [];

    return [...activeExercises].sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }, [workoutData?.exercises]);

  const activeExerciseIds = useMemo(
    () => activeExercisesList.map((exercise) => exercise.exercise.id),
    [activeExercisesList],
  );

  const [orderedExerciseIds, setOrderedExerciseIds] = useState<string[]>([]);

  useEffect(() => {
    setOrderedExerciseIds(
      activeExercisesList.map((exerciseItem) => exerciseItem.exercise.id),
    );
  }, [activeWorkoutId, activeExercisesList]);

  const orderedActiveExercisesList = useMemo(() => {
    if (activeExercisesList.length === 0) {
      return [];
    }

    if (orderedExerciseIds.length === 0) {
      return activeExercisesList;
    }

    const exercisesById = new Map(
      activeExercisesList.map((exerciseItem) => [
        exerciseItem.exercise.id,
        exerciseItem,
      ]),
    );

    const ordered = orderedExerciseIds
      .map((exerciseId) => exercisesById.get(exerciseId))
      .filter((exerciseItem) => exerciseItem !== undefined);

    const missing = activeExercisesList.filter(
      (exerciseItem) => !orderedExerciseIds.includes(exerciseItem.exercise.id),
    );

    return [...ordered, ...missing];
  }, [activeExercisesList, orderedExerciseIds]);

  const reorderWorkoutExercisesMutation = useReorderWorkoutExercises({
    workoutId: activeWorkoutId,
    enableToast: false,
    queryKey: ["workouts", activePlanId],
    onError: (error) => {
      triggerErrorHapticFeedback();
      toast.error(
        error instanceof Error ? error.message : "Failed to reorder exercises",
      );
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
  );

  const getTodayDateRange = () => {
    const nowInUserTz = toZonedTime(new Date(), userTimezone);
    const startOfDay = new Date(nowInUserTz);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(nowInUserTz);
    endOfDay.setHours(23, 59, 59, 999);
    return {
      startOfDay: fromZonedTime(startOfDay, userTimezone),
      endOfDay: fromZonedTime(endOfDay, userTimezone),
    };
  };

  const { startOfDay, endOfDay } = getTodayDateRange();

  const { data: todayLogs, refetch: refetchTodayLogs } = useGetTodayLogs(
    {
      activePlanId,
      activeWorkoutId,
      startOfDay,
      endOfDay,
    },
    {
      refetchOnMount: "always",
    },
  );

  useEffect(() => {
    if (pathname !== "/log" || !activePlanId || !activeWorkoutId) {
      return;
    }

    void refetchTodayLogs();
  }, [pathname, activePlanId, activeWorkoutId, refetchTodayLogs]);

  const { data: latestLogs } = useGetLatestLogs({
    exerciseIds: activeExerciseIds,
  });

  const formValues = form.watch();
  const watchedSets = formValues.sets;

  const progress = useMemo(() => {
    if (activeExerciseIds.length === 0) {
      return 0;
    }

    const activeExerciseIdSet = new Set(activeExerciseIds);
    const loggedExerciseIds = new Set(
      (todayLogs ?? [])
        .map((log) => log.exerciseId?.id)
        .filter((exerciseId): exerciseId is string => Boolean(exerciseId))
        .filter((exerciseId) => activeExerciseIdSet.has(exerciseId)),
    );

    let completedExercises = 0;
    for (const exerciseId of activeExerciseIds) {
      if (loggedExerciseIds.has(exerciseId)) {
        completedExercises += 1;
        continue;
      }

      // Partial credit for sets marked done on the exercise being worked on.
      if (
        exerciseId === activeExerciseId &&
        Array.isArray(watchedSets) &&
        watchedSets.length > 0
      ) {
        const doneSetCount = Math.min(
          (checkedSets[exerciseId] ?? []).length,
          watchedSets.length,
        );
        completedExercises += doneSetCount / watchedSets.length;
      }
    }

    return Math.min(
      100,
      Math.round((completedExercises / activeExerciseIds.length) * 100),
    );
  }, [todayLogs, activeExerciseIds, activeExerciseId, checkedSets, watchedSets]);

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

      // Clear the per-set "done" marks now that the exercise is logged.
      setCheckedSets((prev) => {
        const updated = { ...prev };
        delete updated[activeExerciseId];
        return updated;
      });

      toast.success("Log created successfully");
      showPostSessionCheer();

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
      triggerErrorHapticFeedback();
      toast.error("Failed to create log. Please try again.");
    },
  });

  const updateLogMutation = useUpdateLog({
    onSuccess: () => {
      triggerSuccessHapticFeedback();
      toast.success("Log updated");
      setEditingExerciseId(null);
      setEditSets([]);
      setEditNotes("");
    },
    onError: (error: Error) => {
      console.error("Failed to update log", error);
      triggerErrorHapticFeedback();
      toast.error("Failed to update log. Please try again.");
    },
  });

  const startEditingLog = (log: ILog) => {
    setEditingExerciseId(log.exerciseId?.id ?? null);
    setEditSets(
      (log.sets ?? []).map((set, index) => ({
        setNumber: index + 1,
        reps: set.reps,
        weight: set.weight,
        notes: set.notes ?? "",
      })),
    );
    setEditNotes(log.notes ?? "");
  };

  const cancelEditingLog = () => {
    setEditingExerciseId(null);
    setEditSets([]);
    setEditNotes("");
  };

  const saveEditedLog = (logId: string) => {
    updateLogMutation.mutate({
      id: logId,
      sets: editSets.map((set, index) => ({
        setNumber: index + 1,
        reps: set.reps,
        weight: set.weight,
        notes: set.notes,
      })),
      notes: editNotes,
    });
  };

  const handleExerciseChange = (value: string) => {
    setActiveExerciseId(value);
    localStorage.setItem("activeExerciseId", value);
  };

  const handleWorkoutChange = (value: string) => {
    setActiveWorkoutId(value);
    localStorage.setItem("activeWorkoutId", value);
  };

  const isSessionActive =
    workoutSession !== null && workoutSession.workoutId === activeWorkoutId;

  const hasLoggedToday = (todayLogs?.length ?? 0) > 0;
  const isWorkoutCompletedToday = progress === 100;
  const completedStats = useMemo(
    () => summarizeSession(todayLogs ?? [], 0),
    [todayLogs],
  );

  const handleStartWorkout = () => {
    if (!activeWorkoutId || activeExerciseIds.length === 0) return;
    setWorkoutSession(startSession(activePlanId, activeWorkoutId));
    triggerSuccessHapticFeedback();
  };

  const handleFinishWorkout = () => {
    finishSession();
    setWorkoutSession(null);
    triggerSuccessHapticFeedback();
    router.push("/log/summary");
  };

  // Save form draft to local storage on change
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
        console.warn("Failed to save draft: ", error);
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
        console.warn("Failed to load draft: ", error);
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
      const previousSets = previousLogForExercise?.sets;
      const numberOfSetsToResetTo =
        previousSets?.length || DEFAULT_NUMBER_OF_SETS;

      const prefillSets = Array.from(
        { length: numberOfSetsToResetTo },
        (_, index) => ({
          setNumber: index + 1,
          reps: previousSets?.[index]?.reps ?? 0,
          weight: previousSets?.[index]?.weight ?? 0,
          notes: "",
        }),
      );

      form.setValue("exerciseId", activeExerciseId);
      form.setValue("planId", activePlanId || "");
      form.setValue("workoutId", activeWorkoutId || "");
      form.setValue("sets", prefillSets);
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
    triggerSuccessHapticFeedback();
    setShowRpeDialog(true);
  };

  const onSubmitInvalid = () => {
    triggerErrorHapticFeedback();
    flagInvalidSets(activeExerciseId);
  };

  /**
   * Marks the sets blocking completion (reps still 0) so they can be shown in
   * red instead of a generic error message. A set with reps > 0 is always valid,
   * even at 0kg (bodyweight).
   */
  const flagInvalidSets = (exerciseId: string) => {
    if (!exerciseId) return;

    const currentSets = form.getValues("sets") ?? [];
    const invalidIndices = currentSets
      .map((set, index) => (set.reps <= 0 ? index : -1))
      .filter((index) => index >= 0);

    setInvalidSets((prev) => {
      const updated = { ...prev };
      if (invalidIndices.length > 0) {
        updated[exerciseId] = invalidIndices;
      } else {
        delete updated[exerciseId];
      }
      return updated;
    });
  };

  const clearInvalidSet = (exerciseId: string, setIndex: number) => {
    setInvalidSets((prev) => {
      const current = prev[exerciseId];
      if (!current || !current.includes(setIndex)) return prev;

      const remaining = current.filter((index) => index !== setIndex);
      const updated = { ...prev };
      if (remaining.length > 0) {
        updated[exerciseId] = remaining;
      } else {
        delete updated[exerciseId];
      }
      return updated;
    });
  };

  const clearInvalidSetsForExercise = (exerciseId: string) => {
    setInvalidSets((prev) => {
      if (!prev[exerciseId]) return prev;
      const updated = { ...prev };
      delete updated[exerciseId];
      return updated;
    });
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
    triggerSuccessHapticFeedback();
    createLogMutation.mutate(payload);
    setShowRpeDialog(false);
    setPendingFormValues(null);
  };

  const handleExerciseReorder = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !activeWorkoutId) {
      return;
    }

    const previousExerciseIds = orderedExerciseIds;
    const oldIndex = orderedExerciseIds.indexOf(String(active.id));
    const newIndex = orderedExerciseIds.indexOf(String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextExerciseIds = arrayMove(orderedExerciseIds, oldIndex, newIndex);
    setOrderedExerciseIds(nextExerciseIds);

    reorderWorkoutExercisesMutation.mutate(
      { exerciseIds: nextExerciseIds },
      {
        onError: () => {
          setOrderedExerciseIds(previousExerciseIds);
        },
      },
    );
  };

  if (activePlanId === "") {
    return (
      <div className="min-h-screen pb-24">
        <div className="p-4 max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <PageHeader title="Log" subtitle="Pick a plan before you train" />
          </div>
          <Card className="border-dashed border-border bg-card">
            <CardContent className="text-center py-10">
              <div className="w-14 h-14 bg-secondary text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircleIcon className="h-6 w-6" />
              </div>
              <h3 className="font-black text-2xl mb-2">No active plan</h3>
              <p className="text-sm font-medium text-muted-foreground mb-5 max-w-xs mx-auto">
                Set a plan active so this screen knows what workout to log.
              </p>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                <Link
                  href="/plans"
                  className="text-accent underline font-black underline-offset-2"
                >
                  Open Plans
                </Link>{" "}
                and choose the routine you are training.
              </p>
              <Button asChild>
                <Link href="/plans">Choose plan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <PostSessionCheer cheer={cheer} />

      <div className="p-4 max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <PageHeader title="Log" subtitle="Finish one exercise at a time" />
          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 absolute right-3 top-3 sm:relative sm:top-0 sm:right-0 z-10">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link href="/logs/archive">
                <HistoryIcon className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Select
          onValueChange={handleWorkoutChange}
          value={activeWorkoutId || ""}
          disabled={isSessionActive}
        >
          <SelectTrigger className="h-11 cursor-pointer rounded-full border-border bg-card px-4 font-black disabled:opacity-100">
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

        {!isSessionActive && !hasLoggedToday ? (
          <div className="space-y-3">
            <div className="rounded-[24px] border-2 border-border bg-card p-6 text-center shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Ready to train
              </p>
              <h2 className="mt-1.5 text-2xl font-black leading-tight">
                {workoutData?.title ?? "Your workout"}
              </h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {activeExerciseIds.length}{" "}
                {activeExerciseIds.length === 1 ? "exercise" : "exercises"}
              </p>
              <Button
                onClick={handleStartWorkout}
                disabled={!activeWorkoutId || activeExerciseIds.length === 0}
                className="mt-5 h-12 w-full rounded-full text-base font-black"
              >
                <Play className="h-5 w-5" />
                Start workout
              </Button>
            </div>

            {orderedActiveExercisesList.length > 0 && (
              <div className="space-y-1.5 select-none opacity-55">
                {orderedActiveExercisesList.map((exerciseItem, previewIndex) => (
                  <div
                    key={exerciseItem.exercise.id}
                    className="flex items-center gap-2 rounded-[24px] border-2 border-border bg-card px-3 py-3"
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-black text-muted-foreground">
                      {previewIndex + 1}
                    </span>
                    <span className="text-sm font-black">
                      {exerciseItem.exercise.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {isSessionActive ? (
              <div className="sticky top-2 z-20 flex items-center gap-2.5 rounded-full border-2 border-border bg-card px-3 py-2 shadow-sm">
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatDuration(elapsedSeconds)}
                </span>
                <Progress value={progress} className="h-1.5 flex-1" />
                <span className="shrink-0 text-[11px] font-black tabular-nums text-muted-foreground">
                  {progress}%
                </span>
                <Button
                  onClick={handleFinishWorkout}
                  size="sm"
                  className="h-7 shrink-0 rounded-full px-3 text-[11px] font-black"
                >
                  Finish
                </Button>
              </div>
            ) : (
              <div className="rounded-[24px] border-2 border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isWorkoutCompletedToday ? "text-chart-4" : "text-accent",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-tight">
                      {isWorkoutCompletedToday
                        ? "Completed today"
                        : "Workout in progress"}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {completedStats.totalSets}{" "}
                      {completedStats.totalSets === 1 ? "set" : "sets"} ·{" "}
                      {completedStats.totalVolume.toLocaleString()} kg
                      {!isWorkoutCompletedToday && ` · ${progress}%`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 flex-1 rounded-full text-xs font-black"
                    onClick={() => router.push("/log/summary")}
                  >
                    View summary
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 flex-1 rounded-full text-xs font-black"
                    onClick={handleStartWorkout}
                  >
                    {isWorkoutCompletedToday ? "Train again" : "Continue"}
                  </Button>
                </div>
              </div>
            )}
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleExerciseReorder}
          >
            <SortableContext
              items={orderedActiveExercisesList.map(
                (exerciseItem) => exerciseItem.exercise.id,
              )}
              strategy={verticalListSortingStrategy}
            >
              {orderedActiveExercisesList.map((exerciseItem, index) => {
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
                const hasRestTime =
                  exerciseItem.restTime !== undefined &&
                  exerciseItem.restTime > 0;

                return (
                  <SortableExerciseItem key={exercise.id} id={exercise.id}>
                    {({
                      attributes,
                      listeners,
                      setActivatorNodeRef,
                      isDragging,
                    }) => (
                      <AccordionItem
                        value={exercise.id}
                        className={cn(
                          "mb-1.5 overflow-hidden rounded-[24px] border-2 border-border bg-card shadow-sm",
                          isDragging && "bg-muted",
                        )}
                      >
                        <AccordionTrigger
                          className={`cursor-pointer py-3 px-3 hover:no-underline transition-colors ${
                            isLogged ? "bg-muted/40" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            {isLogged && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                            {!isLogged && (
                              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-black text-muted-foreground">
                                {index + 1}
                              </span>
                            )}
                            <span
                              className={`flex-1 text-left text-sm ${
                                isLogged ? "font-medium" : ""
                              } ${isActiveExercise ? "font-black text-accent" : ""}`}
                            >
                              {exercise.name}
                            </span>
                            {isLogged && (
                              <span className="rounded-full bg-chart-4/15 px-2 py-0.5 text-[10px] font-black text-chart-4">
                                Done
                              </span>
                            )}

                            <span
                              ref={setActivatorNodeRef}
                              {...attributes}
                              {...listeners}
                              className="shrink-0 inline-flex items-center justify-center rounded p-0.5 text-muted-foreground/70 cursor-grab active:cursor-grabbing touch-none"
                              aria-hidden
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>

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
                        <AccordionContent className="px-3 py-2.5 space-y-2">
                          {!isLogged &&
                            (latestExerciseLog ||
                              (hasRestTime && isActiveExercise)) && (
                              <div className="flex items-start gap-2">
                                {latestExerciseLog && (
                                  <div className="min-w-0 flex-1 space-y-1 py-1 text-[11px]">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <HistoryIcon className="h-3 w-3 shrink-0" />
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
                                            s: {
                                              reps: number;
                                              weight: number;
                                            },
                                            idx: number,
                                          ) => (
                                            <span
                                              key={idx}
                                              className="inline-flex px-1 py-0.5 rounded bg-chart-4/15 text-chart-4 font-medium"
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
                                      <p className="text-[11px] italic truncate pl-4">
                                        &ldquo;{latestExerciseLog.notes}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                )}

                                {hasRestTime && isActiveExercise && (
                                  <button
                                    onClick={() => {
                                      startRestTime(
                                        exercise.id,
                                        exercise.name,
                                        exerciseItem.restTime || 0,
                                      );
                                    }}
                                    disabled={isTimerRunning}
                                    className={cn(
                                      "ml-auto flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-colors",
                                      isTimerRunning
                                        ? "bg-muted/20 border-border/30 text-muted-foreground/50 cursor-not-allowed"
                                        : "bg-secondary border-secondary text-primary hover:bg-secondary/90 cursor-pointer",
                                    )}
                                    aria-label={`Start ${formatSecondsToMinutesSeconds(exerciseItem.restTime ?? 0)} timer for ${exercise.name}`}
                                  >
                                    <Timer className="h-3.5 w-3.5 shrink-0" />
                                    <span className="text-xs font-mono font-semibold tabular-nums">
                                      {formatSecondsToMinutesSeconds(
                                        exerciseItem.restTime ?? 0,
                                      )}
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}

                          {isLogged && logData ? (
                            editingExerciseId === exercise.id ? (
                              <div className="space-y-1.5">
                                {editSets.map((set, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1 px-2 py-0.5 bg-muted/20 border border-border/50 rounded-2xl"
                                  >
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-[10px] font-black text-muted-foreground shrink-0">
                                      {idx + 1}
                                    </span>

                                    <DrumPicker
                                      className="flex-1"
                                      value={set.reps}
                                      items={REP_ITEMS}
                                      onChange={(val) => {
                                        setEditSets((prev) =>
                                          prev.map((existingSet, setIndex) =>
                                            setIndex === idx
                                              ? { ...existingSet, reps: val }
                                              : existingSet,
                                          ),
                                        );
                                        void hapticsRef.current?.trigger([
                                          { duration: 10 },
                                        ]);
                                      }}
                                    />

                                    <span className="text-muted-foreground/40 text-xs font-black shrink-0">
                                      ×
                                    </span>

                                    <DrumPicker
                                      className="flex-1"
                                      value={set.weight}
                                      items={WEIGHT_ITEMS}
                                      formatValue={(v) =>
                                        Number.isInteger(v)
                                          ? String(v)
                                          : v.toFixed(1)
                                      }
                                      onChange={(val) => {
                                        setEditSets((prev) =>
                                          prev.map((existingSet, setIndex) =>
                                            setIndex === idx
                                              ? { ...existingSet, weight: val }
                                              : existingSet,
                                          ),
                                        );
                                        void hapticsRef.current?.trigger([
                                          { duration: 10 },
                                        ]);
                                      }}
                                    />

                                    <span className="text-muted-foreground/50 text-[10px] font-black shrink-0">
                                      kg
                                    </span>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      disabled={editSets.length <= 1}
                                      onClick={() => {
                                        setEditSets((prev) =>
                                          prev
                                            .filter(
                                              (_, setIndex) => setIndex !== idx,
                                            )
                                            .map((existingSet, setIndex) => ({
                                              ...existingSet,
                                              setNumber: setIndex + 1,
                                            })),
                                        );
                                      }}
                                    >
                                      <XIcon className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}

                                <Textarea
                                  placeholder="Notes"
                                  value={editNotes}
                                  onChange={(event) =>
                                    setEditNotes(event.target.value)
                                  }
                                  rows={2}
                                  className="text-xs resize-none"
                                />

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-8 text-xs border-dashed"
                                  onClick={() => {
                                    setEditSets((prev) => {
                                      const lastSet = prev[prev.length - 1];
                                      return [
                                        ...prev,
                                        {
                                          setNumber: prev.length + 1,
                                          reps: lastSet?.reps ?? 0,
                                          weight: lastSet?.weight ?? 0,
                                          notes: "",
                                        },
                                      ];
                                    });
                                  }}
                                >
                                  <PlusIcon className="h-3.5 w-3.5 mr-1" />
                                  Add Set
                                </Button>

                                <div className="flex gap-2 pt-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={cancelEditingLog}
                                    disabled={updateLogMutation.isPending}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => saveEditedLog(logData.id)}
                                    disabled={
                                      updateLogMutation.isPending ||
                                      editSets.length === 0
                                    }
                                  >
                                    Save changes
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* Sets Display */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-end">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-accent"
                                      onClick={() => startEditingLog(logData)}
                                    >
                                      <Pencil className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  </div>
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
                            )
                          ) : (
                            <Form {...form} key={exercise.id}>
                              <fieldset
                                disabled={isLogged}
                                className="space-y-2"
                              >
                                <form
                                  onSubmit={form.handleSubmit(
                                    onSubmit,
                                    onSubmitInvalid,
                                  )}
                                  className="space-y-2"
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
                                              field.value.map((set, idx) => {
                                                const isThisSetChecked =
                                                  (checkedSets[exercise.id] ?? []).includes(idx);
                                                const isThisSetInvalid =
                                                  (invalidSets[exercise.id] ?? []).includes(idx);
                                                return (
                                                  <div
                                                    key={idx}
                                                    className={cn(
                                                      "flex items-center gap-1 px-2 py-0.5 rounded-2xl border",
                                                      isThisSetInvalid
                                                        ? "border-destructive bg-destructive/10"
                                                        : "border-border/50 bg-muted/20",
                                                    )}
                                                  >
                                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-[10px] font-black text-muted-foreground shrink-0">
                                                      {idx + 1}
                                                    </span>

                                                    <DrumPicker
                                                      className="flex-1"
                                                      value={set.reps}
                                                      items={REP_ITEMS}
                                                      onChange={(val) => {
                                                        const sets = field.value?.slice() || [];
                                                        sets[idx] = { ...sets[idx], setNumber: idx + 1, reps: val };
                                                        field.onChange(sets);
                                                        if (val > 0) {
                                                          clearInvalidSet(exercise.id, idx);
                                                        }
                                                        void hapticsRef.current?.trigger([{ duration: 10 }]);
                                                      }}
                                                    />

                                                    <span className="text-muted-foreground/40 text-xs font-black shrink-0">×</span>

                                                    <DrumPicker
                                                      className="flex-1"
                                                      value={set.weight}
                                                      items={WEIGHT_ITEMS}
                                                      formatValue={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
                                                      onChange={(val) => {
                                                        const sets = field.value?.slice() || [];
                                                        sets[idx] = { ...sets[idx], weight: val };
                                                        field.onChange(sets);
                                                        void hapticsRef.current?.trigger([{ duration: 10 }]);
                                                      }}
                                                    />

                                                    <span className="text-muted-foreground/50 text-[10px] font-black shrink-0">kg</span>

                                                    <button
                                                      type="button"
                                                      disabled={!isThisSetChecked && set.reps <= 0}
                                                      aria-label={isThisSetChecked ? "Mark set not done" : "Mark set done"}
                                                      className={cn(
                                                        "w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                                                        isThisSetChecked
                                                          ? "bg-chart-4 border-chart-4 text-card cursor-pointer"
                                                          : set.reps <= 0
                                                            ? "border-border/40 text-transparent opacity-40 cursor-not-allowed"
                                                            : "border-border text-transparent hover:border-chart-4/50 cursor-pointer",
                                                      )}
                                                      onClick={() => {
                                                        const totalSets = field.value?.length ?? 0;
                                                        const currentChecked = checkedSets[exercise.id] ?? [];
                                                        let nextChecked: number[];

                                                        if (isThisSetChecked) {
                                                          if (isTimerRunning && timerExerciseId === exercise.id) {
                                                            stopRestTime();
                                                          }
                                                          nextChecked = currentChecked.filter((i) => i !== idx);
                                                        } else {
                                                          nextChecked = [...currentChecked, idx];

                                                          // Skip the rest timer on the set that completes the
                                                          // whole workout (100%): there is nothing left to rest for.
                                                          const willCompleteExercise =
                                                            totalSets > 0 &&
                                                            nextChecked.length >= totalSets;
                                                          const loggedExerciseIds = new Set(
                                                            (todayLogs ?? [])
                                                              .map((log) => log.exerciseId?.id)
                                                              .filter((id): id is string => Boolean(id)),
                                                          );
                                                          const otherExercisesAllLogged = activeExerciseIds
                                                            .filter((id) => id !== exercise.id)
                                                            .every((id) => loggedExerciseIds.has(id));
                                                          const willReachFullProgress =
                                                            willCompleteExercise && otherExercisesAllLogged;

                                                          if (hasRestTime && !willReachFullProgress) {
                                                            startRestTime(
                                                              exercise.id,
                                                              exercise.name,
                                                              exerciseItem.restTime || 0,
                                                            );
                                                          }
                                                        }

                                                        setCheckedSets((prev) => ({
                                                          ...prev,
                                                          [exercise.id]: nextChecked,
                                                        }));
                                                        void hapticsRef.current?.trigger([{ duration: 20 }]);

                                                        const sets = field.value ?? [];
                                                        const blockingSets = sets
                                                          .map((s, i) => (s.reps <= 0 ? i : -1))
                                                          .filter((i) => i >= 0);
                                                        const completableSets = sets
                                                          .map((s, i) => (s.reps > 0 ? i : -1))
                                                          .filter((i) => i >= 0);
                                                        const allCompletableDone =
                                                          completableSets.length > 0 &&
                                                          completableSets.every((i) =>
                                                            nextChecked.includes(i),
                                                          );

                                                        if (
                                                          nextChecked.length >= totalSets &&
                                                          totalSets > 0
                                                        ) {
                                                          // Every set is done: log it.
                                                          clearInvalidSetsForExercise(exercise.id);
                                                          void form.handleSubmit(onSubmit, onSubmitInvalid)();
                                                        } else if (
                                                          !isThisSetChecked &&
                                                          allCompletableDone &&
                                                          blockingSets.length > 0
                                                        ) {
                                                          // Done with everything fillable, but empty sets
                                                          // are blocking completion: flag them red.
                                                          setInvalidSets((prev) => ({
                                                            ...prev,
                                                            [exercise.id]: blockingSets,
                                                          }));
                                                          triggerErrorHapticFeedback();
                                                        }
                                                      }}
                                                    >
                                                      <Check className="w-3 h-3" />
                                                    </button>

                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6 shrink-0"
                                                      onClick={() => {
                                                        const sets = field.value?.slice() || [];
                                                        sets.splice(idx, 1);
                                                        sets.forEach((s, i) => { s.setNumber = i + 1; });
                                                        field.onChange(sets);
                                                        clearInvalidSetsForExercise(exercise.id);
                                                      }}
                                                    >
                                                      <XIcon className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                );
                                              })}

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
                                              <div className="flex gap-2 pt-1">
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  className="flex-1 h-8 text-xs border-dashed"
                                                  onClick={() => {
                                                    const currentSets =
                                                      Array.isArray(field.value)
                                                        ? field.value.slice()
                                                        : [];
                                                    const lastSet =
                                                      currentSets[
                                                        currentSets.length - 1
                                                      ];
                                                    field.onChange([
                                                      ...currentSets,
                                                      {
                                                        setNumber:
                                                          currentSets.length + 1,
                                                        reps:
                                                          lastSet?.reps ?? 0,
                                                        weight:
                                                          lastSet?.weight ?? 0,
                                                        notes: "",
                                                      },
                                                    ]);
                                                    clearInvalidSetsForExercise(
                                                      exercise.id,
                                                    );
                                                  }}
                                                >
                                                  <PlusIcon className="h-3.5 w-3.5 mr-1" />
                                                  Add Set
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  className="flex-1 h-8 text-xs text-muted-foreground hover:text-destructive"
                                                  onClick={() => {
                                                    const DEFAULT_NUMBER_OF_SETS = 3;
                                                    const previousLogForExercise =
                                                      latestLogs?.find(
                                                        (log) =>
                                                          log.exerciseId?.id ===
                                                          activeExerciseId,
                                                      );
                                                    const numberOfSetsToResetTo =
                                                      previousLogForExercise
                                                        ?.sets?.length ||
                                                      DEFAULT_NUMBER_OF_SETS;

                                                    const createEmptySets = (
                                                      numberOfSets: number = DEFAULT_NUMBER_OF_SETS,
                                                    ) => {
                                                      return Array.from(
                                                        {
                                                          length: numberOfSets,
                                                        },
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
                                                    clearInvalidSetsForExercise(
                                                      activeExerciseId,
                                                    );
                                                    setCheckedSets((prev) => {
                                                      const updated = { ...prev };
                                                      delete updated[
                                                        activeExerciseId
                                                      ];
                                                      return updated;
                                                    });

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

                                                    triggerErrorHapticFeedback();
                                                    toast.success("Form reset");
                                                  }}
                                                >
                                                  Reset
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </form>
                              </fieldset>
                            </Form>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </SortableExerciseItem>
                );
              })}
            </SortableContext>
          </DndContext>
        </Accordion>
          </>
        )}
      </div>

      {/* RPE Selection Dialog — must pick an effort level, cannot be dismissed */}
      <Dialog open={showRpeDialog}>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="max-w-[95vw] sm:max-w-[640px] p-4 sm:p-5 space-y-4"
        >
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
