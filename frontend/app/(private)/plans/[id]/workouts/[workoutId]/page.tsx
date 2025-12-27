"use client";

// Imports
import BackButton from "@/components/BackButton";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@radix-ui/react-select";
import {
  QueryFunction,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Clock,
  Dumbbell,
  Edit2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Types & Schemas
const exerciseFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  description: z.string().optional(),
  notes: z.string().optional(),
  restTime: z
    .number({ message: "Rest time is required" })
    .int({ message: "Rest time must be an integer" })
    .positive({ message: "Rest time must be greater than 0 seconds" })
    .max(600, { message: "Rest time must be less than 600 seconds" }),
});

type ExerciseFormValues = z.input<typeof exerciseFormSchema>;

interface Exercise {
  id: string;
  userId: string;
  name: string;
  description: string;
  notes: string;
  restTime: number;
  createdAt: string;
  updatedAt: string;
}

interface Workout {
  id: string;
  userId: string;
  planId: string;
  title: string;
  description: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
}

// API Calls
const createExercise = async (
  workoutId: string,
  planId: string,
  currentExercises: Exercise[],
  values: ExerciseFormValues
) => {
  // First create the exercise
  const exerciseData = await api.post<{ data: Exercise }>("/api/exercises", {
    workoutId: workoutId,
    ...values,
  });

  const newExerciseId = exerciseData.data.id;

  // Then update the workout to include the new exercise
  const exerciseIds = [...currentExercises.map((ex) => ex.id), newExerciseId];

  await api.patch(`/api/workouts/${workoutId}`, {
    planId: planId,
    exercises: exerciseIds,
  });

  return exerciseData;
};

const updateExercise = async (
  exerciseId: string,
  values: ExerciseFormValues
) => {
  return api.patch(`/api/exercises/${exerciseId}`, values);
};

const deleteExercise = async (
  workoutId: string,
  workout: Workout,
  exerciseId: string
) => {
  const exercises = workout.exercises
    .filter((ex) => ex.id !== exerciseId)
    .map((ex) => ex.id);

  return api.patch(`/api/workouts/${workoutId}`, {
    workoutId: workoutId,
    planId: workout.planId,
    exercises,
  });
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Main Component
export default function WorkoutDetailPage() {
  const { id, workoutId } = useParams<{ id: string; workoutId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(
    null
  );

  const exerciseForm = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: "",
      description: "",
      notes: "",
      restTime: 0,
    },
  });

  // Fetch workout details
  const getWorkout: QueryFunction<{ data: Workout }> = () => {
    return api.get(`/api/workouts/${workoutId}`);
  };

  const {
    data: workoutData,
    isLoading,
    error,
  } = useQuery<{ data: Workout }>({
    queryKey: ["workout", id, workoutId],
    queryFn: getWorkout,
    enabled: !!id && !!workoutId,
  });

  const workout = workoutData?.data;
  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: ExerciseFormValues) => {
      if (!workout) throw new Error("Workout not found");
      return createExercise(
        workoutId,
        workout.planId,
        workout.exercises || [],
        values
      );
    },
    onSuccess: async () => {
      // Refetch the query and wait for it to complete
      await queryClient.refetchQueries({
        queryKey: ["workout", id, workoutId],
      });
      toast.success("Exercise added successfully");
      setIsAddDialogOpen(false);
      exerciseForm.reset();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to add exercise"
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: ExerciseFormValues & { id: string }) =>
      updateExercise(values.id, values),
    onSuccess: async () => {
      // Refetch the query and wait for it to complete
      await queryClient.refetchQueries({
        queryKey: ["workout", id, workoutId],
      });
      toast.success("Exercise updated successfully");
      // Close dialog and reset state
      setIsAddDialogOpen(false);
      setEditingExercise(null);
      exerciseForm.reset({
        name: "",
        description: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update exercise"
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (exerciseId: string) => {
      if (!workout) throw new Error("Workout not found");
      return deleteExercise(workoutId, workout, exerciseId);
    },
    onSuccess: async () => {
      // Refetch the query and wait for it to complete
      await queryClient.refetchQueries({
        queryKey: ["workout", id, workoutId],
      });
      toast.success("Exercise deleted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete exercise"
      );
    },
  });

  // Handlers
  const handleAddExercise = (values: ExerciseFormValues) => {
    createMutation.mutate(values);
  };

  const handleEditExercise = (values: ExerciseFormValues) => {
    if (!editingExercise) return;
    updateMutation.mutate({ ...values, id: editingExercise.id });
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    setExerciseToDelete(exercise);
  };

  const confirmDeleteExercise = () => {
    if (exerciseToDelete) {
      deleteMutation.mutate(exerciseToDelete.id);
      setExerciseToDelete(null);
    }
  };

  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise);
    exerciseForm.reset({
      name: exercise.name,
      description: exercise.description || "",
      notes: exercise.notes || "",
      restTime: exercise.restTime,
    });
  };

  const closeDialogs = () => {
    setIsAddDialogOpen(false);
    setEditingExercise(null);
    // Explicitly reset to default values
    exerciseForm.reset({
      name: "",
      description: "",
      notes: "",
      restTime: 0,
    });
  };

  const handleOpenAddExerciseDialog = () => {
    // Ensure editing state is cleared first
    setEditingExercise(null);
    // Explicitly reset to default values
    exerciseForm.reset({
      name: "",
      description: "",
      notes: "",
      restTime: 0,
    });
    // Then open the dialog
    setIsAddDialogOpen(true);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto">
          <BackButton href={`/plans/${id}`} />
          <PageHeader title="Loading..." subtitle="Loading workout details" />
          <LoadingState message="Loading workout..." />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto">
          <BackButton href={`/plans/${id}`} />
          <PageHeader title="Error" subtitle="Failed to load workout" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-destructive">
                  {error instanceof Error
                    ? error.message
                    : "Failed to load workout"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // No Workout Found
  if (!workout) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto">
          <BackButton href={`/plans/${id}`} />
          <EmptyState
            icon={AlertCircle}
            title="Workout not found"
            description="This workout doesn't exist or has been deleted"
            action={{
              label: "Back to Plan",
              onClick: () => router.push(`/plans/${id}`),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <BackButton href={`/plans/${id}`} />

        <PageHeader
          title={workout.title}
          subtitle="Workout exercises and details"
          action={
            <Button
              size="lg"
              onClick={handleOpenAddExerciseDialog}
              className="rounded-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </Button>
          }
        />

        {/* Workout Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="rounded-full bg-primary/10 p-3">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                Workout Details
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-base text-muted-foreground">
                {workout.description || (
                  <span className="italic opacity-70">
                    No description provided
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Exercises Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <Dumbbell className="h-6 w-6 text-primary" />
              Exercises
              {workout.exercises && workout.exercises.length > 0 && (
                <span className="text-lg font-normal text-muted-foreground">
                  ({workout.exercises.length})
                </span>
              )}
            </h3>
          </div>

          {workout.exercises && workout.exercises.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              {workout.exercises.map((exercise, index) => (
                <Card
                  key={exercise.id}
                  className="group bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="text-lg font-semibold flex items-center gap-2">
                          {exercise.name}
                        </h4>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <span className="text-muted-foreground font-semibold text-xs">
                            Rest Time:
                          </span>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {exercise.restTime ? `${exercise.restTime}s` : "0s"}
                        </span>
                        <Separator className="my-2 bg-border/50 h-px" />
                        {exercise.description && (
                          <p className="text-sm text-muted-foreground">
                            {exercise.description}
                          </p>
                        )}
                        {exercise.notes && (
                          <p className="text-xs text-muted-foreground/70 italic">
                            Notes: {exercise.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => openEditDialog(exercise)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDeleteExercise(exercise)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="No exercises yet"
              description="Add your first exercise to this workout to get started"
              action={{
                label: "Add Exercise",
                onClick: handleOpenAddExerciseDialog,
              }}
            />
          )}
        </div>

        {/* Add/Edit Exercise Dialog */}
        <Dialog
          open={isAddDialogOpen || !!editingExercise}
          onOpenChange={(open) => {
            if (!open) {
              // When closing, always reset everything
              closeDialogs();
            }
          }}
        >
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingExercise ? "Edit Exercise" : "Add Exercise"}
              </DialogTitle>
              <DialogDescription>
                {editingExercise
                  ? "Update the exercise details below"
                  : "Fill in the details for your new exercise"}
              </DialogDescription>
            </DialogHeader>
            <Form {...exerciseForm}>
              <form
                onSubmit={exerciseForm.handleSubmit(
                  editingExercise ? handleEditExercise : handleAddExercise
                )}
                className="space-y-6"
              >
                <FormField
                  control={exerciseForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exercise Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Bench Press"
                          className="h-12 rounded-2xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={exerciseForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the exercise"
                          className="rounded-2xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={exerciseForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional notes (form cues, tips, etc.)"
                          className="rounded-2xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={exerciseForm.control}
                  name="restTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rest Time (seconds) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 120"
                          type="number"
                          min={0}
                          step={1}
                          className="h-12 rounded-2xl text-center font-semibold w-24"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(Number(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialogs}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="rounded-full gap-2"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {editingExercise ? "Update" : "Add"} Exercise
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!exerciseToDelete}
          onOpenChange={() => setExerciseToDelete(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Exercise</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this exercise? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {exerciseToDelete && (
              <div className="rounded-lg border border-border/50 p-4 space-y-2">
                <p className="font-semibold">{exerciseToDelete.name}</p>
                {exerciseToDelete.description && (
                  <p className="text-sm text-muted-foreground">
                    {exerciseToDelete.description}
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExerciseToDelete(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteExercise}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
