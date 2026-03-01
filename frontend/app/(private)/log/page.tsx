"use client";

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
  formatSecondsToMinutesSeconds,
  getItemFromLocalStorage
} from "@/lib/utils";
import { ILog } from "@/types";
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
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import {
  AlertCircleIcon,
  CheckCircle2,
  GripVertical,
  HistoryIcon,
  InfoIcon,
  PlusIcon,
  Timer,
  XIcon
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { useTimer } from "@/contexts/TimerContext";
import {
  getExerciseHistory,
  useCreateLog,
  useGetLatestLogs,
  useGetSettings,
  useGetTodayLogs,
} from "@/hooks/query/useLog";
import {
  useGetAllWorkouts,
  useReorderWorkoutExercises,
} from "@/hooks/query/useWorkout";
import ExerciseHistoryDialog from "./ExerciseHistoryDialog";

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
  const { isTimerRunning, startRestTime } = useTimer();
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

  const activeExercisesList = useMemo(() => {
    const activeExercises =
      workoutData?.exercises?.filter((exercise) => exercise.isActive) || [];

    return [...activeExercises].sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
  }, [workoutData?.exercises]);

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
        <div className="p-4 max-w-xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <PageHeader title="Log" subtitle="Log your workouts" />
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
      <div className="p-4 max-w-xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <PageHeader title="Log" subtitle="Log your workouts" />
          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 absolute right-3 top-3 sm:relative sm:top-0 sm:right-0 z-10">
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
                const hasRestTime = exerciseItem.restTime !== undefined && exerciseItem.restTime > 0;

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
                          "border-b! last:border-b! border-zinc-300 dark:border-zinc-700 bg-card/40 backdrop-blur-[1px]",
                          isDragging && "bg-muted/40",
                        )}
                      >
                        <AccordionTrigger
                          className={`cursor-pointer py-2.5 px-3 hover:no-underline transition-colors ${isLogged ? "bg-muted/30" : "hover:bg-muted/20"
                            }`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            {isLogged && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                            {!isLogged && (
                              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-zinc-300/80 dark:border-zinc-700/80 text-[9px] font-medium text-muted-foreground/90">
                                {index + 1}
                              </span>
                            )}
                            <span
                              className={`flex-1 text-left text-sm ${isLogged ? "font-medium" : ""
                                } ${isActiveExercise ? "font-bold text-primary" : ""}`}
                            >
                              {exercise.name}
                            </span>
                            {isLogged && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
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

                            {/* Rest Timer Button */}
                            {hasRestTime && !isLogged && isActiveExercise && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRestTime(exercise.id, exercise.name, exerciseItem.restTime || 0);
                                }}
                                disabled={isTimerRunning}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors shrink-0",
                                  isTimerRunning
                                    ? "bg-muted/20 border-border/30 text-muted-foreground/50 cursor-not-allowed"
                                    : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 hover:border-primary/30 hover:text-primary cursor-pointer",
                                )}
                                aria-label={`Start ${formatSecondsToMinutesSeconds(exerciseItem.restTime ?? 0)} timer for ${exercise.name}`}
                              >
                                <Timer className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-xs font-mono font-semibold tabular-nums">
                                  {formatSecondsToMinutesSeconds(exerciseItem.restTime ?? 0)}
                                </span>
                              </button>
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
                    )}
                  </SortableExerciseItem>
                );
              })}
            </SortableContext>
          </DndContext>
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
