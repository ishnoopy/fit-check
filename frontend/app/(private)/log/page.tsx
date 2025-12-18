"use client";

import { useGeneral } from "@/app/providers";
import { AppGuide } from "@/components/AppGuide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { Exercise, Log, Workout } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
  DumbbellIcon,
  HistoryIcon,
  PlusIcon,
  Sparkles,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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

const getItemFromLocalStorage = (key: string) => {
  const item = localStorage.getItem(key);
  return item || null;
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
  const { activePlanId } = useGeneral();
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(
    getItemFromLocalStorage("activeWorkoutId")
  );
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(
    getItemFromLocalStorage("activeExerciseId")
  );
  const [copiedFromLast, setCopiedFromLast] = useState(false);

  // Remove the currentFormValues state - we'll use form.watch() instead

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

  // ✅ Watch all form values for changes
  const formValues = form.watch();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Auto-save form data to localStorage with debouncing
  useEffect(() => {
    // Only save if we have an active exercise
    if (!activeExerciseId) return;

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the save to avoid excessive writes
    debounceTimerRef.current = setTimeout(() => {
      const dataToSave = {
        sets: formValues.sets,
        durationMinutes: formValues.durationMinutes,
        notes: formValues.notes,
        exerciseId: activeExerciseId, // Include ID to verify it's for the right exercise
      };
      localStorage.setItem("draftLogData", JSON.stringify(dataToSave));
    }, 500); // Save 500ms after user stops typing

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    formValues.sets,
    formValues.durationMinutes,
    formValues.notes,
    activeExerciseId,
  ]);

  // ✅ Load saved draft when exercise changes
  useEffect(() => {
    if (!activeExerciseId) return;

    const savedDraft = localStorage.getItem("draftLogData");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);

        // Only load if it's for the same exercise
        if (parsed.exerciseId === activeExerciseId) {
          if (parsed.sets && parsed.sets.length > 0) {
            form.setValue("sets", parsed.sets);
          }
          if (parsed.durationMinutes) {
            form.setValue("durationMinutes", parsed.durationMinutes);
          }
          if (parsed.notes) {
            form.setValue("notes", parsed.notes);
          }
        }
      } catch (error) {
        console.error("Failed to parse saved draft", error);
      }
    }
  }, [activeExerciseId, form]);

  const queryClient = useQueryClient();

  const createLogMutation = useMutation({
    mutationFn: createLog,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["latestExerciseLog", activeExerciseId],
      });

      // ✅ Clear the draft after successful save
      localStorage.removeItem("draftLogData");

      // Clear copied from last workout
      setCopiedFromLast(false);

      toast.success("Log created successfully");
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Failed to create log", error);
      toast.error("Failed to create log. Please try again.");
    },
  });

  function onSubmit(values: FormValues) {
    if (!values.sets || values.sets.length === 0) {
      toast.error("At least one set is required");
      return;
    }
    const payload = {
      planId: activePlanId || "",
      workoutId: activeWorkoutId || "",
      exerciseId: activeExerciseId || "",
      sets: values.sets || [],
      durationMinutes: values.durationMinutes || 0,
      notes: values.notes || "",
    };

    createLogMutation.mutate(payload);
  }

  const getWorkouts = async () => {
    return api.get<{ data: Workout[] }>(
      `/api/workouts?plan_id=${activePlanId}`
    );
  };

  const { data: workoutsData } = useQuery({
    queryKey: ["workouts", activePlanId],
    queryFn: getWorkouts,
    enabled: !!activePlanId,
  });

  const workouts = workoutsData?.data;

  const activeWorkout = workouts?.find(
    (workout: Workout) => workout.id === activeWorkoutId
  );
  const activeExercise = activeWorkout?.exercises.find(
    (exercise: Exercise) => exercise.id === activeExerciseId
  );

  const getLatestExerciseLog = async () => {
    return api.get<{ data: Log[] }>(
      `/api/logs/query?exercise_id=${activeExerciseId}&plan_id=${activePlanId}&workout_id=${activeWorkoutId}&latest=true`
    );
  };

  const { data: latestExerciseLogData } = useQuery({
    queryKey: ["latestExerciseLog", activeExerciseId],
    queryFn: getLatestExerciseLog,
    enabled: !!activeExerciseId && !!activePlanId && !!activeWorkoutId,
  });

  const latestExerciseLog = latestExerciseLogData?.data[0];

  const handleWorkoutChange = (value: string) => {
    const workout = workouts?.find((workout: Workout) => workout.id === value);
    setActiveWorkoutId(workout?.id || null);
    setActiveExerciseId(null);
    setCopiedFromLast(false);

    // Set to local storage for data persistence
    localStorage.setItem("activeWorkoutId", value);
  };

  const handleExerciseChange = (value: string) => {
    setActiveExerciseId(value);

    // Clear the form and draft when changing exercises
    form.reset({
      planId: activePlanId || "",
      workoutId: activeWorkoutId || "",
      exerciseId: value,
      sets: DEFAULT_SETS,
      workoutDate: new Date().toISOString(),
      durationMinutes: 0,
      notes: "",
    });
    setCopiedFromLast(false);
    localStorage.setItem("activeExerciseId", value);
  };

  const copyFromLastWorkout = () => {
    if (latestExerciseLog?.sets) {
      form.setValue("sets", latestExerciseLog.sets);
      form.setValue("durationMinutes", latestExerciseLog.durationMinutes || 0);
      setCopiedFromLast(true);
      toast.success("Copied sets from your last workout!");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-3 sm:p-4 max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold hidden sm:block">Workout Log 💪</h1>
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
        {!activePlanId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Card className="border-dashed border">
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircleIcon className="h-8 w-8 text-orange-500" />
                </div>
                <h3 className="font-bold text-lg mb-2">No Active Plan</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  Set a plan as active to start logging workouts
                </p>
                <Button className="h-9" asChild>
                  <Link href="/plans">Browse Plans</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activePlanId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {workouts && workouts.length > 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="px-5 py-3 space-y-3">
                  {/* Compact Selectors - Always Side by Side */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="space-y-1.5 min-w-0">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <DumbbellIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate">Workout</span>
                      </label>
                      <Select
                        onValueChange={handleWorkoutChange}
                        value={activeWorkoutId || ""}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {workouts.map((workout: Workout) => (
                            <SelectItem key={workout.id} value={workout.id}>
                              {workout.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {activeWorkoutId && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-1.5 min-w-0"
                      >
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3 shrink-0" />
                          <span className="truncate">Exercise</span>
                        </label>
                        {activeWorkout?.exercises &&
                        activeWorkout?.exercises.length > 0 ? (
                          <Select
                            onValueChange={handleExerciseChange}
                            value={activeExercise?.id || ""}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {activeWorkout.exercises.map(
                                (exercise: Exercise) => (
                                  <SelectItem
                                    key={exercise.id}
                                    value={exercise.id}
                                  >
                                    {exercise.name}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="border border-dashed rounded-lg p-2 bg-amber-500/5 flex items-center gap-2">
                            <AlertCircleIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              No exercises
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Exercise Form - Only show when exercise is selected */}
                  {activeExercise && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3 pt-2 border-t"
                    >
                      {/* Exercise Name & Copy Button */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                          <h3 className="font-bold text-sm truncate">
                            {activeExercise.name}
                          </h3>
                        </div>
                        {latestExerciseLog && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copyFromLastWorkout}
                            className="gap-1.5 h-7 text-xs shrink-0"
                          >
                            {copiedFromLast ? (
                              <>
                                <CheckIcon className="h-3 w-3" />
                                <span className="hidden sm:inline">Copied</span>
                              </>
                            ) : (
                              <>
                                <CopyIcon className="h-3 w-3" />
                                <span className="hidden sm:inline">Copy</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Ultra-Compact Last Performance */}
                      {latestExerciseLog && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <HistoryIcon className="h-3 w-3 shrink-0" />
                            <span className="font-medium">
                              {format(
                                new Date(
                                  latestExerciseLog.createdAt ||
                                    latestExerciseLog.workoutDate
                                ),
                                "MMM d"
                              )}
                            </span>
                            <span className="text-muted-foreground/60">•</span>
                            {latestExerciseLog.sets
                              ?.slice(0, 3)
                              .map(
                                (
                                  s: { reps: number; weight: number },
                                  idx: number
                                ) => (
                                  <span
                                    key={idx}
                                    className="inline-flex px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium"
                                  >
                                    {s.reps}×{s.weight}kg
                                  </span>
                                )
                              )}
                            {latestExerciseLog.sets &&
                              latestExerciseLog.sets.length > 3 && (
                                <span className="text-muted-foreground/60">
                                  +{latestExerciseLog.sets.length - 3}
                                </span>
                              )}
                          </div>
                          {latestExerciseLog.notes && (
                            <p className="text-xs text-muted-foreground/70 italic truncate">
                              &ldquo;{latestExerciseLog.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      )}
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-3"
                        >
                          {/* Compact Sets */}
                          <FormField
                            control={form.control}
                            name="sets"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-semibold text-muted-foreground">
                                  SETS
                                </FormLabel>
                                <FormControl>
                                  <div className="space-y-1.5">
                                    {field.value &&
                                      Array.isArray(field.value) &&
                                      field.value.length > 0 &&
                                      field.value.map((set, idx) => (
                                        <motion.div
                                          key={idx}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ duration: 0.1 }}
                                          className="flex gap-1.5 items-center p-1.5 bg-muted/30 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-linear-to-br from-blue-500/20 to-purple-500/20 text-foreground font-bold text-xs shrink-0 border border-border/30">
                                            {idx + 1}
                                          </div>
                                          <Input
                                            type="number"
                                            placeholder="12"
                                            value={set.reps || ""}
                                            onChange={(e) => {
                                              const sets =
                                                field.value?.slice() || [];
                                              sets[idx] = {
                                                ...sets[idx],
                                                setNumber: idx + 1,
                                                reps: Number(e.target.value),
                                              };
                                              field.onChange(sets);
                                            }}
                                            className="w-14 h-8 text-center font-bold text-sm p-0"
                                          />
                                          <span className="text-xs text-muted-foreground">
                                            ×
                                          </span>
                                          <Input
                                            type="number"
                                            step="0.5"
                                            placeholder="50"
                                            value={set.weight || ""}
                                            onChange={(e) => {
                                              const sets =
                                                field.value?.slice() || [];
                                              sets[idx] = {
                                                ...sets[idx],
                                                weight: Number(e.target.value),
                                              };
                                              field.onChange(sets);
                                            }}
                                            className="w-16 h-8 text-center font-bold text-sm p-0"
                                          />
                                          <span className="text-xs text-muted-foreground hidden sm:inline">
                                            kg
                                          </span>
                                          <Input
                                            placeholder="notes"
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
                                            className="flex-1 min-w-0 h-8 text-xs"
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
                                              field.onChange(sets);
                                            }}
                                          >
                                            <XIcon className="h-3.5 w-3.5" />
                                          </Button>
                                        </motion.div>
                                      ))}

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-full border-dashed hover:border-solid h-8 text-xs gap-1.5"
                                      onClick={() => {
                                        const currentSets = Array.isArray(
                                          field.value
                                        )
                                          ? field.value.slice()
                                          : [];
                                        field.onChange([
                                          ...currentSets,
                                          {
                                            setNumber: currentSets.length + 1,
                                            reps: 0,
                                            weight: 0,
                                            notes: "",
                                          },
                                        ]);
                                      }}
                                    >
                                      <PlusIcon className="h-3.5 w-3.5" />
                                      Add Set
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Compact Duration & Notes */}
                          <div className="grid sm:grid-cols-2 gap-2">
                            <FormField
                              control={form.control}
                              name="durationMinutes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-medium text-muted-foreground">
                                    Duration (min)
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      placeholder="30"
                                      {...field}
                                      value={field.value || ""}
                                      onChange={(e) =>
                                        field.onChange(Number(e.target.value))
                                      }
                                      className="h-9 text-center font-semibold"
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
                                <FormItem className="sm:col-span-2">
                                  <FormLabel className="text-xs font-medium text-muted-foreground">
                                    Notes (optional)
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="How did it feel..."
                                      {...field}
                                      rows={2}
                                      className="resize-none text-sm"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Compact Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex-1 h-9"
                              onClick={() => {
                                form.reset();
                                setCopiedFromLast(false);
                                localStorage.removeItem("draftLogData");
                              }}
                            >
                              Reset
                            </Button>
                            <Button
                              type="submit"
                              disabled={createLogMutation.isPending}
                              size="sm"
                              className="flex-2 h-9 font-semibold gap-1.5"
                            >
                              {createLogMutation.isPending ? (
                                <>
                                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <CheckIcon className="h-4 w-4" />
                                  <span>Save Log</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border shadow-sm">
                <CardContent className="p-3">
                  <div className="text-center py-8 border border-dashed rounded-lg bg-muted/10">
                    <AlertCircleIcon className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-medium mb-1">
                      No workouts found
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create workouts in your plan first
                    </p>
                    <Button variant="default" size="sm" asChild>
                      <Link href="/plans">Go to Plans</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
