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
import { api } from "@/lib/api";
import { getItemFromLocalStorage } from "@/lib/utils";
import { ILog, IWorkout } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircleIcon,
  CheckCircle2,
  HistoryIcon,
  InfoIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
      })
    )
    .min(1, { message: "At least one set is required" })
    .refine((sets) => sets.every((set) => set.reps > 0 && set.weight > 0), {
      message: "Please fill in reps and weight for all sets",
    }),
  workoutDate: z.string().datetime().optional(),
  durationMinutes: z.number().min(1, { message: "" }).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const createLog = async (values: FormValues) => {
  return api.post("/api/logs", values);
};

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

export default function LogPage() {
  const queryClient = useQueryClient();
  const [activePlanId] = useState<string>(
    getItemFromLocalStorage("activePlanId") || ""
  );
  const [activeWorkoutId, setActiveWorkoutId] = useState<string>(
    getItemFromLocalStorage("activeWorkoutId") || ""
  );
  const [activeExerciseId, setActiveExerciseId] = useState<string>(
    getItemFromLocalStorage("activeExerciseId") || ""
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      planId: activePlanId || "",
      workoutId: activeWorkoutId || "",
      exerciseId: activeExerciseId || "",
      sets: DEFAULT_SETS,
      workoutDate: new Date().toISOString(),
      durationMinutes: 0,
      notes: "",
    },
  });

  const getWorkouts = async () => {
    return api.get<{ data: IWorkout[] }>(
      `/api/workouts?plan_id=${activePlanId}`
    );
  };

  const { data: workouts } = useQuery({
    queryKey: ["workouts", activePlanId],
    queryFn: getWorkouts,
    enabled: !!activePlanId,
    select: (data) => data.data,
  });

  const activeExercisesList =
    workouts
      ?.find((workout) => workout.id === activeWorkoutId)
      ?.exercises.filter((exercise) => exercise.active) || [];

  const today = new Date();
  const startOfDay = new Date(
    today.toISOString().split("T")[0] + "T00:00:00.000Z"
  );
  const endOfDay = new Date(
    today.toISOString().split("T")[0] + "T23:59:59.999Z"
  );

  const getTodayLogs = async () => {
    return api.get<{ data: ILog[] }>(
      `/api/logs?plan_id=${activePlanId}&workout_id=${activeWorkoutId}&start_date=${startOfDay.toISOString()}&end_date=${endOfDay.toISOString()}`
    );
  };

  const { data: todayLogs } = useQuery({
    queryKey: ["todayLogs", activePlanId, activeWorkoutId],
    queryFn: getTodayLogs,
    enabled: !!activePlanId && !!activeWorkoutId,
    select: (data) => data.data,
  });

  const getLatestLogs = async () => {
    return api.get<{ data: ILog[] }>(
      `/api/logs/latest?${activeExercisesList
        .map((exercise) => `exercise_ids=${exercise.id}`)
        .join("&")}`
    );
  };

  const { data: latestLogs } = useQuery({
    queryKey: ["latestLogs", activePlanId, activeWorkoutId],
    queryFn: getLatestLogs,
    enabled:
      !!activePlanId && !!activeWorkoutId && activeExercisesList.length > 0,
    select: (data) => data.data,
  });

  const progress = todayLogs
    ? Math.round((todayLogs.length / activeExercisesList.length) * 100)
    : 0;

  const createLogMutation = useMutation({
    mutationFn: createLog,
    onSuccess: () => {
      // invalidate today logs and latest logs
      queryClient.invalidateQueries({ queryKey: ["todayLogs"] });
      queryClient.invalidateQueries({ queryKey: ["latestLogs"] });

      toast.success("Log created successfully");

      // remove the key from the local storage
      const draftDocumentCollection = getItemFromLocalStorage("logFormDrafts")
        ? JSON.parse(getItemFromLocalStorage("logFormDrafts") || "")
        : {};
      delete draftDocumentCollection[activeExerciseId];
      localStorage.setItem(
        "logFormDrafts",
        JSON.stringify(draftDocumentCollection)
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
          JSON.stringify(draftDocumentCollection)
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
  }, [formValues, form]);

  // Update form values when exercise changes or when log data is available for the day.
  useEffect(() => {
    if (!activeExerciseId) return;

    // Find log data for the current exercise
    const todayLogForExercise = todayLogs?.find(
      (log) => log.exerciseId?.id === activeExerciseId
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
      (log) => log.exerciseId?.id === activeExerciseId
    );

    // Update form with log data if available
    if (todayLogForExercise) {
      form.setValue("exerciseId", activeExerciseId);
      form.setValue("planId", activePlanId || "");
      form.setValue("workoutId", activeWorkoutId || "");
      form.setValue("sets", todayLogForExercise.sets || DEFAULT_SETS);
      form.setValue(
        "durationMinutes",
        todayLogForExercise.durationMinutes || 0
      );
      form.setValue("notes", todayLogForExercise.notes || "");
      if (todayLogForExercise.workoutDate) {
        form.setValue("workoutDate", todayLogForExercise.workoutDate);
      }
    } else if (draftFormData) {
      // Load draft data if available for the active exercise
      form.setValue("exerciseId", draftFormData.exerciseId);
      form.setValue("planId", draftFormData.planId);
      form.setValue("workoutId", draftFormData.workoutId);
      form.setValue("sets", draftFormData.sets || DEFAULT_SETS);
      form.setValue("durationMinutes", draftFormData.durationMinutes || 0);
      form.setValue("notes", draftFormData.notes || "");
      form.setValue(
        "workoutDate",
        draftFormData.workoutDate || new Date().toISOString()
      );
    } else {
      const DEFAULT_NUMBER_OF_SETS = 3;
      const numberOfSetsToResetTo =
        previousLogForExercise?.sets?.length || DEFAULT_NUMBER_OF_SETS;

      const createEmptySets = (numberOfSets: number) => {
        return Array(numberOfSets).map((_, index) => ({
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
      form.setValue("durationMinutes", 0);
      form.setValue("notes", "");
      form.setValue("workoutDate", new Date().toISOString());
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
    const payload = {
      ...values,
      planId: activePlanId,
      workoutId: activeWorkoutId,
      exerciseId: activeExerciseId,
    };
    createLogMutation.mutate(payload);
  };

  if (activePlanId === "") {
    return (
      <div className="min-h-screen bg-background pb-24">
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
              <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                Set a plan as active to start logging workouts
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
    <div className="min-h-screen bg-background pb-24">
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
          {activeExercisesList.map((exercise) => {
            const isLogged = todayLogs?.some(
              (log) => log.exerciseId?.id === exercise.id
            );

            const logData = todayLogs?.find(
              (log) => log.exerciseId?.id === exercise.id
            );

            const latestExerciseLog = latestLogs?.find(
              (log) => log.exerciseId?.id === exercise.id
            );

            const isActiveExercise = activeExerciseId === exercise.id;

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
                    {exercise.restTime || exercise.notes ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <span
                            className="shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <InfoIcon className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                          </span>
                        </DialogTrigger>
                        <DialogContent
                          className="max-w-[280px] p-4 space-y-2 text-xs"
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
                              {exercise.name}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                              {exercise.restTime &&
                                `Rest time: ${exercise.restTime} seconds. `}
                              {exercise.notes && `Notes: ${exercise.notes}`}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2">
                            {exercise.restTime && (
                              <div className="font-medium leading-tight">
                                Rest: {exercise.restTime}s
                              </div>
                            )}
                            {exercise.notes && (
                              <div className="text-muted-foreground/90 leading-snug">
                                {exercise.notes}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : null}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 py-3 space-y-2.5">
                  {/* Last Performance */}
                  {latestExerciseLog && !isLogged && (
                    <div className="text-[11px] text-muted-foreground space-y-1 pb-2 border-b">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <HistoryIcon className="h-3 w-3 shrink-0 opacity-60" />
                        <span className="font-medium">
                          {format(
                            new Date(
                              latestExerciseLog.createdAt ||
                                latestExerciseLog.workoutDate
                            ),
                            "MMM d"
                          )}
                        </span>
                        <span className="opacity-40">•</span>
                        {latestExerciseLog.sets
                          ?.slice(0, 3)
                          .map(
                            (
                              s: { reps: number; weight: number },
                              idx: number
                            ) => (
                              <span
                                key={idx}
                                className="inline-flex px-1 py-0.5 rounded bg-muted text-foreground font-medium"
                              >
                                {s.reps}×{s.weight}kg
                              </span>
                            )
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

                      {/* Duration & Notes Display */}
                      {(logData.durationMinutes || logData.notes) && (
                        <div className="flex gap-2 pt-1 border-t">
                          {logData.durationMinutes && (
                            <div className="text-[11px] text-muted-foreground">
                              <span className="font-medium">
                                {logData.durationMinutes}
                              </span>{" "}
                              min
                            </div>
                          )}
                          {logData.notes && (
                            <div className="text-[11px] text-muted-foreground flex-1 truncate">
                              {logData.notes}
                            </div>
                          )}
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
                                            value={set.weight || ""}
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

                                    {/* Compact Duration & Notes */}
                                    <div className="space-y-2 pt-1">
                                      <FormField
                                        control={form.control}
                                        name="durationMinutes"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                min={0}
                                                placeholder="Duration (min)"
                                                {...field}
                                                value={field.value || ""}
                                                onChange={(e) =>
                                                  field.onChange(
                                                    Number(e.target.value)
                                                  )
                                                }
                                                className="h-8 text-xs"
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />

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
                                            const currentSets = Array.isArray(
                                              field.value
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
    </div>
  );
}
