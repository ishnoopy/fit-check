"use client";

import { useGeneral } from "@/app/providers";
import { AppGuide } from "@/components/AppGuide";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  plan_id: z.string(),
  workout_id: z.string(),
  exercise_id: z.string(),
  sets: z.array(
    z.object({
      set_number: z.number().min(1),
      reps: z.number().min(1),
      weight: z.number().min(1),
      notes: z.string().optional(),
    })
  ),
  workout_date: z.string().datetime().optional(),
  duration_minutes: z.number().min(1).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const createLog = async (values: FormValues) => {
  return api.post("/api/logs", values);
};

export default function LogPage() {
  const { activePlanId } = useGeneral();
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [copiedFromLast, setCopiedFromLast] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plan_id: activePlanId || "",
      workout_id: activeWorkout?._id || "",
      exercise_id: activeExercise?._id || "",
      sets: [],
      workout_date: new Date().toISOString(),
      duration_minutes: 0,
      notes: "",
    },
  });

  const queryClient = useQueryClient();

  const createLogMutation = useMutation({
    mutationFn: createLog,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["latestExerciseLog", activeExercise?._id],
      });
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
      plan_id: activePlanId || "",
      workout_id: activeWorkout?._id || "",
      exercise_id: activeExercise?._id || "",
      sets: values.sets || [],
      duration_minutes: values.duration_minutes || 0,
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

  const getLatestExerciseLog = async () => {
    return api.get<{ data: Log[] }>(
      `/api/logs/query?exercise_id=${activeExercise?._id}&plan_id=${activePlanId}&workout_id=${activeWorkout?._id}&latest=true`
    );
  };

  const { data: latestExerciseLogData } = useQuery({
    queryKey: ["latestExerciseLog", activeExercise?._id],
    queryFn: getLatestExerciseLog,
    enabled: !!activeExercise?._id && !!activePlanId && !!activeWorkout?._id,
  });

  const latestExerciseLog = latestExerciseLogData?.data[0];

  const handleWorkoutChange = (value: string) => {
    setActiveWorkout(
      workouts?.find((workout: Workout) => workout._id === value) || null
    );
    setActiveExercise(null);
    setCopiedFromLast(false);
  };

  const handleExerciseChange = (value: string) => {
    setActiveExercise(
      activeWorkout?.exercises.find(
        (exercise: Exercise) => exercise._id === value
      ) || null
    );

    form.reset();
    setCopiedFromLast(false);
  };

  const copyFromLastWorkout = () => {
    if (latestExerciseLog?.sets) {
      form.setValue("sets", latestExerciseLog.sets);
      form.setValue(
        "duration_minutes",
        latestExerciseLog.duration_minutes || 0
      );
      setCopiedFromLast(true);
      toast.success("Copied sets from your last workout!");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-3">
          <PageHeader
            title="Workout Log"
            subtitle="Track your sets, reps, and progress 💪"
          />
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <AppGuide />
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link href="/logs/archive">
                <HistoryIcon className="h-4 w-4" />
                View Archive
              </Link>
            </Button>
          </div>
        </div>

        {!activePlanId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
          >
            <Card className="border-dashed bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                  <AlertCircleIcon className="h-8 w-8 text-orange-500" />
                </div>
                <CardTitle className="text-2xl">No Active Plan</CardTitle>
                <CardDescription className="mt-2 text-base">
                  Set a plan as active to start logging workouts
                </CardDescription>
                <Button className="mt-6 mx-auto" asChild>
                  <Link href="/plans">Go to Plans</Link>
                </Button>
              </CardHeader>
            </Card>
          </motion.div>
        )}

        {activePlanId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.1 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <DumbbellIcon className="h-5 w-5 text-blue-500" />
                  </div>
                  Log Workout
                </CardTitle>
                <CardDescription>
                  Select your workout and exercise to begin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {workouts && workouts.length > 0 ? (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Workout Session
                        </label>
                        <Select
                          onValueChange={handleWorkoutChange}
                          value={activeWorkout?._id || ""}
                        >
                          <SelectTrigger className="h-11 border-border/50 hover:border-border transition-colors">
                            <SelectValue placeholder="Choose workout..." />
                          </SelectTrigger>
                          <SelectContent>
                            {workouts.map((workout: Workout) => (
                              <SelectItem key={workout._id} value={workout._id}>
                                {workout.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {activeWorkout && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-2"
                        >
                          <label className="text-sm font-medium text-muted-foreground">
                            Exercise
                          </label>
                          {activeWorkout.exercises &&
                          activeWorkout.exercises.length > 0 ? (
                            <Select
                              onValueChange={handleExerciseChange}
                              value={activeExercise?._id || ""}
                            >
                              <SelectTrigger className="h-11 border-border/50 hover:border-border transition-colors">
                                <SelectValue placeholder="Choose exercise..." />
                              </SelectTrigger>
                              <SelectContent>
                                {activeWorkout.exercises.map(
                                  (exercise: Exercise) => (
                                    <SelectItem
                                      key={exercise._id}
                                      value={exercise._id}
                                    >
                                      {exercise.name}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="border border-dashed border-border/50 rounded-lg p-4 bg-muted/30">
                              <div className="flex items-start gap-3">
                                <AlertCircleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-foreground">
                                    No exercises in this workout
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Add exercises to this workout to start
                                    logging. Go to Plans → Select your plan →
                                    Edit the workout to add exercises.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {activeExercise && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="border-t pt-6 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="font-semibold text-xl flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-yellow-500" />
                              {activeExercise.name}
                            </h3>
                            {latestExerciseLog && (
                              <p className="text-xs text-muted-foreground">
                                Last:{" "}
                                {latestExerciseLog.sets
                                  ?.map(
                                    (s: { reps: number; weight: number }) =>
                                      `${s.reps}×${s.weight}kg`
                                  )
                                  .join(", ")}{" "}
                                <span className="opacity-60">
                                  (
                                  {format(
                                    new Date(latestExerciseLog.createdAt),
                                    "MMM d"
                                  )}
                                  )
                                </span>
                              </p>
                            )}
                          </div>
                          {latestExerciseLog && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={copyFromLastWorkout}
                              className="gap-1.5 shrink-0"
                            >
                              {copiedFromLast ? (
                                <>
                                  <CheckIcon className="h-3.5 w-3.5" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <CopyIcon className="h-3.5 w-3.5" />
                                  Copy
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        <Form {...form}>
                          <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
                          >
                            <FormField
                              control={form.control}
                              name="sets"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-semibold">
                                    Sets
                                  </FormLabel>
                                  <FormControl>
                                    <div className="space-y-2">
                                      {field.value &&
                                        Array.isArray(field.value) &&
                                        field.value.length > 0 &&
                                        field.value.map((set, idx) => (
                                          <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="flex gap-2 items-center bg-muted/30 border border-border/50 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
                                          >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-br from-blue-500/20 to-purple-500/20 text-foreground font-bold text-sm shrink-0 border border-border/30">
                                              {idx + 1}
                                            </div>
                                            <Input
                                              type="number"
                                              placeholder="Reps"
                                              value={set.reps || ""}
                                              onChange={(e) => {
                                                const sets =
                                                  field.value?.slice() || [];
                                                sets[idx] = {
                                                  ...sets[idx],
                                                  set_number: idx + 1,
                                                  reps: Number(e.target.value),
                                                };
                                                field.onChange(sets);
                                              }}
                                              className="w-20"
                                            />
                                            <span className="text-muted-foreground">
                                              ×
                                            </span>
                                            <Input
                                              type="number"
                                              step="0.5"
                                              placeholder="kg"
                                              value={set.weight || ""}
                                              onChange={(e) => {
                                                const sets =
                                                  field.value?.slice() || [];
                                                sets[idx] = {
                                                  ...sets[idx],
                                                  weight: Number(
                                                    e.target.value
                                                  ),
                                                };
                                                field.onChange(sets);
                                              }}
                                              className="w-20"
                                            />
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
                                              className="flex-1 min-w-0"
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 shrink-0"
                                              onClick={() => {
                                                const sets =
                                                  field.value?.slice() || [];
                                                sets.splice(idx, 1);
                                                field.onChange(sets);
                                              }}
                                            >
                                              <XIcon className="h-4 w-4" />
                                            </Button>
                                          </motion.div>
                                        ))}

                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-dashed hover:border-solid hover:bg-primary/5 transition-all"
                                        onClick={() => {
                                          const currentSets = Array.isArray(
                                            field.value
                                          )
                                            ? field.value.slice()
                                            : [];
                                          field.onChange([
                                            ...currentSets,
                                            {
                                              set_number:
                                                currentSets.length + 1,
                                              reps: 0,
                                              weight: 0,
                                              notes: "",
                                            },
                                          ]);
                                        }}
                                      >
                                        <PlusIcon className="h-4 w-4 mr-2" />
                                        Add Set
                                      </Button>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="duration_minutes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium">
                                      Duration (minutes)
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
                                        className="h-11"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    Workout Notes (optional)
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="How did the workout feel? Any observations?"
                                      {...field}
                                      rows={3}
                                      className="resize-none"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex gap-3 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                className="flex-1"
                                onClick={() => {
                                  form.reset();
                                  setCopiedFromLast(false);
                                }}
                              >
                                Reset
                              </Button>
                              <Button
                                type="submit"
                                disabled={createLogMutation.isPending}
                                size="lg"
                                className="flex-1 gap-2 "
                              >
                                {createLogMutation.isPending ? (
                                  <>
                                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <CheckIcon className="h-4 w-4" />
                                    Save Log
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                    <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                      <AlertCircleIcon className="h-8 w-8 text-amber-500" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      No Workouts in This Plan
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
                      Your active plan doesn&apos;t have any workouts yet.
                    </p>
                    <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto px-4">
                      💡 <strong>Tip:</strong> Go to your Plans page and add
                      workouts with exercises to start logging your progress!
                    </p>
                    <Button variant="default" size="sm" asChild>
                      <Link href="/plans">Go to Plans</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
