"use client";

// Imports
import BackButton from "@/components/BackButton";
import { EmptyState } from "@/components/EmptyState";
import ExerciseImage from "@/components/ExerciseImage";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  exerciseFormSchema,
  ExerciseFormValues,
  useAddExistingExercise,
  useCreateExercise,
  useDeleteExercise,
  useGetExercises,
  useUpdateExercise,
} from "@/hooks/query/useExercise";
import { useGetWorkout, useUpdateWorkout } from "@/hooks/query/useWorkout";
import { IExercise } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Clock,
  Dumbbell,
  Edit2,
  Loader2,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [selectedExerciseRestTime, setSelectedExerciseRestTime] =
    useState<number>(60);
  const [editingExercise, setEditingExercise] = useState<IExercise | null>(
    null,
  );
  const [exerciseToDelete, setExerciseToDelete] = useState<IExercise | null>(
    null,
  );
  const [editingRestTime, setEditingRestTime] = useState<{
    exerciseId: string;
    currentRestTime: number;
  } | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [debouncedExerciseSearch, setDebouncedExerciseSearch] = useState("");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set(),
  );

  const exerciseForm = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: "",
      description: "",
      notes: "",
      restTime: 60,
      images: [],
      mechanic: "",
      equipment: "",
      primaryMuscles: [],
      secondaryMuscles: [],
      active: true,
    },
  });

  // Debounce exercise search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExerciseSearch(exerciseSearch.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [exerciseSearch]);

  const {
    data: workoutData,
    isLoading,
    error,
  } = useGetWorkout({
    id: workoutId,
    queryKey: ["workout", id, workoutId],
  });

  const {
    data: exercisesPages,
    isLoading: isExercisesLoading,
    error: exercisesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetExercises({
    search: debouncedExerciseSearch,
    limit: 20,
    queryKey: ["exercises", debouncedExerciseSearch],
  });

  const exercises = useMemo(
    () => exercisesPages?.pages.flatMap((page) => page.data) ?? [],
    [exercisesPages],
  );

  const { mutate: createMutation, isPending: isCreatePending } =
    useCreateExercise({
      workoutId: workoutData?.id ?? "",
      planId: id,
      queryKey: ["workout", id, workoutId],
      onSuccess: () => {
        closeDialogs();
      },
      addToWorkout: true,
    });

  const { mutate: addExistingMutation, isPending: isAddingExisting } =
    useAddExistingExercise({
      workoutId: workoutData?.id ?? "",
      planId: id,
      queryKey: ["workout", id, workoutId],
      onSuccess: () => {
        closeDialogs();
      },
    });

  const { mutate: updateMutation, isPending: isUpdatePending } =
    useUpdateExercise({
      exerciseId: editingExercise?.id ?? "",
      queryKey: ["workout", id, workoutId],
      onSuccess: () => {
        closeDialogs();
      },
    });

  const { mutate: deleteMutation, isPending: isDeletePending } =
    useDeleteExercise({
      exerciseId: exerciseToDelete?.id ?? "",
      queryKey: ["exercises"], // Only invalidate exercises query, not workout
      enableToast: false, // We'll handle the toast in confirmDeleteExercise
    });

  const { mutate: updateWorkoutMutation, isPending: isUpdatingWorkout } =
    useUpdateWorkout({
      workoutId: workoutData?.id ?? "",
      queryKey: ["workout", id, workoutId],
      enableToast: true,
    });

  // Handlers
  const handleAddExercise = (values: ExerciseFormValues) => {
    createMutation(values);
  };

  const handleAddExistingExercise = () => {
    if (!selectedExerciseId) return;
    addExistingMutation({
      exerciseId: selectedExerciseId,
      restTime: selectedExerciseRestTime,
      isActive: true,
    });
  };

  const handleEditExercise = (values: ExerciseFormValues) => {
    if (!editingExercise) return;
    updateMutation({ ...values });
  };

  const handleDeleteExercise = (exercise: IExercise) => {
    setExerciseToDelete(exercise);
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    if (!workoutData) return;

    const updatedExercises = workoutData.exercises
      .filter((ex) => ex.exercise.id !== exerciseId)
      .map((ex) => ({
        exercise: ex.exercise.id,
        restTime: ex.restTime,
        isActive: ex.isActive,
      }));

    updateWorkoutMutation({
      title: workoutData.title,
      description: workoutData.description,
      exercises: updatedExercises,
    });
  };

  const confirmDeleteExercise = () => {
    if (!exerciseToDelete || !workoutData) return;

    if (exerciseToDelete.userId) {
      // User-owned exercise: first update workout to remove the exercise reference,
      // then delete the exercise
      const updatedExercises = workoutData.exercises
        .filter((ex) => ex.exercise.id !== exerciseToDelete.id)
        .map((ex) => ({
          exercise: ex.exercise.id,
          restTime: ex.restTime,
          isActive: ex.isActive,
        }));

      // First update the workout to remove the exercise reference (silent update)
      updateWorkoutMutation(
        {
          title: workoutData.title,
          description: workoutData.description,
          exercises: updatedExercises,
        },
        {
          onSuccess: () => {
            // After workout is updated, delete the exercise
            deleteMutation(undefined, {
              onSuccess: () => {
                // Invalidate exercises queries to refetch the list
                queryClient.invalidateQueries({
                  queryKey: ["exercises"],
                });
                setExerciseToDelete(null);
              },
              onError: (error) => {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Failed to delete exercise",
                );
                setExerciseToDelete(null);
              },
            });
          },
          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to remove exercise from workout",
            );
            setExerciseToDelete(null);
          },
        },
      );
    } else {
      // System exercise: only remove from workout
      handleRemoveExerciseFromWorkout(exerciseToDelete.id);
      setExerciseToDelete(null);
    }
  };

  const handleToggleExerciseActive = (
    exerciseId: string,
    currentActiveStatus: boolean,
  ) => {
    if (!workoutData) return;

    const updatedExercises = workoutData.exercises.map((ex) => ({
      exercise: ex.exercise.id,
      restTime: ex.restTime,
      isActive:
        ex.exercise.id === exerciseId ? !currentActiveStatus : ex.isActive,
    }));

    updateWorkoutMutation({
      title: workoutData.title,
      description: workoutData.description,
      exercises: updatedExercises,
    });
  };

  const handleUpdateRestTime = (restTime: number) => {
    if (!workoutData || !editingRestTime) return;

    const updatedExercises = workoutData.exercises.map((ex) => ({
      exercise: ex.exercise.id,
      restTime:
        ex.exercise.id === editingRestTime.exerciseId ? restTime : ex.restTime,
      isActive: ex.isActive,
    }));

    updateWorkoutMutation({
      title: workoutData.title,
      description: workoutData.description,
      exercises: updatedExercises,
    });

    setEditingRestTime(null);
  };

  const openRestTimeDialog = (exerciseId: string, currentRestTime: number) => {
    setEditingRestTime({ exerciseId, currentRestTime });
  };

  const openEditDialog = (exercise: IExercise) => {
    setEditingExercise(exercise);
    setExerciseSearch("");
    exerciseForm.reset({
      name: exercise.name,
      description: exercise.description || "",
      notes: exercise.notes || "",
      restTime: exercise.restTime ?? 60,
      images: exercise.images || [],
      mechanic: exercise.mechanic || "",
      equipment: exercise.equipment || "",
      primaryMuscles: exercise.primaryMuscles || [],
      secondaryMuscles: exercise.secondaryMuscles || [],
      active: exercise.active ?? true,
    });
  };

  const closeDialogs = () => {
    setIsAddDialogOpen(false);
    setEditingExercise(null);
    setExerciseSearch("");
    setAddMode("existing");
    setSelectedExerciseId("");
    setSelectedExerciseRestTime(60);
    // Explicitly reset to default values
    exerciseForm.reset({
      name: "",
      description: "",
      notes: "",
      restTime: 60,
      images: [],
      mechanic: "",
      equipment: "",
      primaryMuscles: [],
      secondaryMuscles: [],
      active: true,
    });
  };

  const handleOpenAddExerciseDialog = () => {
    // Ensure editing state is cleared first
    setEditingExercise(null);
    setExerciseSearch("");
    setAddMode("existing");
    setSelectedExerciseId("");
    setSelectedExerciseRestTime(60);
    // Explicitly reset to default values
    exerciseForm.reset({
      name: "",
      description: "",
      notes: "",
      restTime: 60,
      images: [],
      mechanic: "",
      equipment: "",
      primaryMuscles: [],
      secondaryMuscles: [],
      active: true,
    });
    // Then open the dialog
    setIsAddDialogOpen(true);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen pb-24">
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
      <div className="min-h-screen pb-24">
        <div className="p-6 max-w-2xl mx-auto">
          <BackButton href={`/plans/${id}`} />
          <PageHeader title="Error" subtitle="Failed to load workout" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
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
  if (!workoutData) {
    return (
      <div className="min-h-screen pb-24">
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
    <div className="min-h-screen pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <BackButton href={`/plans/${id}`} />

        <PageHeader
          title={workoutData.title}
          subtitle="Workout exercises and details"
          action={
            <Button
              size="lg"
              onClick={handleOpenAddExerciseDialog}
              className=" gap-2"
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5  blur-3xl" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className=" bg-primary/10 p-3">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                Workout Details
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-base text-muted-foreground">
                {workoutData.description || (
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
              {workoutData.exercises && workoutData.exercises.length > 0 && (
                <span className="text-lg font-normal text-muted-foreground">
                  ({workoutData.exercises.length})
                </span>
              )}
            </h3>
          </div>

          {workoutData.exercises && workoutData.exercises.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {workoutData.exercises.map((exercise, index) => (
                <Card
                  key={exercise.exercise.id}
                  className="group relative overflow-hidden bg-card/40 backdrop-blur-sm border-border/40 hover:border-border/60 hover:shadow-md transition-all duration-200"
                >
                  {/*Active Indicator */}
                  {exercise.isActive && (
                    <div className="absolute top-3 right-3 pointer-events-none z-10">
                      <div className="flex items-center gap-1.5  border border-primary/20 bg-primary/10 px-2 py-0.5 backdrop-blur-md">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Active
                        </span>
                      </div>
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary text-sm font-semibold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <h4 className="text-base font-semibold text-foreground">
                          {exercise.exercise.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {exercise.restTime ? `${exercise.restTime}s` : "0s"}{" "}
                            rest
                          </span>
                        </div>
                        {exercise.exercise.description && (
                          <div className="space-y-2">
                            <p
                              className={`text-sm text-muted-foreground/80 leading-relaxed whitespace-pre-wrap ${
                                !expandedDescriptions.has(
                                  exercise.exercise.id,
                                ) && exercise.exercise.description.length > 150
                                  ? "line-clamp-2"
                                  : ""
                              }`}
                            >
                              {exercise.exercise.description}
                            </p>

                            {/* Show images when expanded for system exercises only */}
                            {expandedDescriptions.has(exercise.exercise.id) &&
                              !exercise.exercise.userId &&
                              exercise.exercise.images &&
                              exercise.exercise.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  {exercise.exercise.images.map(
                                    (image, imgIndex) => (
                                      <ExerciseImage
                                        key={imgIndex}
                                        src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${image}`}
                                        alt={`${exercise.exercise.name} - ${imgIndex + 1}`}
                                      />
                                    ),
                                  )}
                                </div>
                              )}

                            {exercise.exercise.description.length > 150 && (
                              <Button
                                variant={"outline"}
                                size={"sm"}
                                onClick={() => {
                                  const newExpanded = new Set(
                                    expandedDescriptions,
                                  );
                                  if (newExpanded.has(exercise.exercise.id)) {
                                    newExpanded.delete(exercise.exercise.id);
                                  } else {
                                    newExpanded.add(exercise.exercise.id);
                                  }
                                  setExpandedDescriptions(newExpanded);
                                }}
                              >
                                {expandedDescriptions.has(exercise.exercise.id)
                                  ? "Show less"
                                  : "Show more"}
                              </Button>
                            )}
                          </div>
                        )}
                        {exercise.exercise.notes && (
                          <p className="text-xs text-muted-foreground/60 italic leading-relaxed">
                            {exercise.exercise.notes}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 shrink-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              openRestTimeDialog(
                                exercise.exercise.id,
                                exercise.restTime,
                              )
                            }
                            className="cursor-pointer"
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Edit Rest Time
                          </DropdownMenuItem>
                          {exercise.exercise.userId ? (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  openEditDialog(exercise.exercise)
                                }
                                className="cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit Exercise
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteExercise(exercise.exercise)
                                }
                                disabled={isDeletePending || isUpdatingWorkout}
                                variant="destructive"
                                className="cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Exercise
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteExercise(exercise.exercise)
                                }
                                disabled={isUpdatingWorkout}
                                variant="destructive"
                                className="cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove from Workout
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleExerciseActive(
                                exercise.exercise.id,
                                exercise.isActive,
                              )
                            }
                            disabled={isUpdatingWorkout}
                            className="cursor-pointer"
                          >
                            <Switch
                              checked={exercise.isActive}
                              className="h-4 w-4 mr-2 pointer-events-none"
                            />
                            {exercise.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        <Dialog open={isAddDialogOpen || !!editingExercise} modal={false}>
          <DialogContent
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            onCloseClick={closeDialogs}
            onEscapeKeyDown={() => {
              closeDialogs();
            }}
            forceShowOverlay={true}
          >
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingExercise ? "Edit Exercise" : "Add Exercise"}
              </DialogTitle>
              <DialogDescription>
                {editingExercise
                  ? "Update the exercise details below"
                  : "Choose to select an existing exercise or create a new one"}
              </DialogDescription>
            </DialogHeader>

            {editingExercise ? (
              // Edit Exercise Form
              <Form {...exerciseForm}>
                <form
                  onSubmit={exerciseForm.handleSubmit(handleEditExercise)}
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
                            className="h-12 "
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
                            className=""
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
                            className="h-12  text-center font-semibold w-24"
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
                      className=""
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isUpdatePending}
                      className=" gap-2"
                    >
                      {isUpdatePending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Update Exercise
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              // Add Exercise with Tabs
              <Tabs
                value={addMode}
                onValueChange={(value) =>
                  setAddMode(value as "existing" | "new")
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Select Existing</TabsTrigger>
                  <TabsTrigger value="new">Create New</TabsTrigger>
                </TabsList>

                {/* Select Existing Exercise Tab */}
                <TabsContent value="existing" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Exercise *</label>
                      <Combobox
                        value={selectedExerciseId}
                        itemToStringLabel={(id) => {
                          const exercise = exercises.find((e) => e.id === id);
                          return exercise?.name ?? "";
                        }}
                        onValueChange={(value) => {
                          if (typeof value === "string") {
                            setSelectedExerciseId(value);
                          }
                        }}
                        onInputValueChange={(value) =>
                          setExerciseSearch(value ?? "")
                        }
                        onOpenChange={(open) => {
                          if (open) {
                            setExerciseSearch("");
                          }
                        }}
                      >
                        <ComboboxInput
                          placeholder="Search for an exercise..."
                          className="w-full h-12 "
                          showClear
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setSelectedExerciseId("");
                              setExerciseSearch("");
                            }
                          }}
                        />
                        <ComboboxContent>
                          <ComboboxList
                            className="overscroll-contain"
                            onScroll={(event) => {
                              if (!hasNextPage || isFetchingNextPage) return;
                              const target = event.currentTarget;
                              const threshold = 24;
                              const reachedBottom =
                                target.scrollHeight -
                                  target.scrollTop -
                                  target.clientHeight <=
                                threshold;
                              if (reachedBottom) {
                                fetchNextPage();
                              }
                            }}
                          >
                            {isExercisesLoading ? (
                              <div className="p-3 text-sm text-muted-foreground">
                                Loading exercises...
                              </div>
                            ) : exercisesError ? (
                              <div className="p-3 text-sm text-destructive">
                                Failed to load exercises.
                              </div>
                            ) : (
                              <>
                                {exercises
                                  .filter(
                                    (ex) =>
                                      !workoutData?.exercises.some(
                                        (wex) => wex.exercise.id === ex.id,
                                      ),
                                  )
                                  .map((exercise) => (
                                    <ComboboxItem
                                      key={exercise.id}
                                      value={exercise.id}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {exercise.name}
                                        </span>
                                        {exercise.description && (
                                          <span className="text-xs text-muted-foreground line-clamp-1">
                                            {exercise.description}
                                          </span>
                                        )}
                                      </div>
                                    </ComboboxItem>
                                  ))}
                                <ComboboxEmpty>
                                  No exercises found. Try creating a new one.
                                </ComboboxEmpty>
                              </>
                            )}
                          </ComboboxList>
                          {isFetchingNextPage && (
                            <div className="border-t p-2 text-center text-xs text-muted-foreground">
                              Loading more...
                            </div>
                          )}
                        </ComboboxContent>
                      </Combobox>
                    </div>

                    {selectedExerciseId && (
                      <div className=" border border-border/50 bg-muted/30 p-4 space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">
                            {
                              exercises.find((e) => e.id === selectedExerciseId)
                                ?.name
                            }
                          </h4>
                          {exercises.find((e) => e.id === selectedExerciseId)
                            ?.description && (
                            <p className="text-xs text-muted-foreground">
                              {
                                exercises.find(
                                  (e) => e.id === selectedExerciseId,
                                )?.description
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Rest Time (seconds) *
                      </label>
                      <Input
                        placeholder="e.g., 60"
                        type="number"
                        min={0}
                        step={1}
                        className="h-12  text-center font-semibold w-24"
                        value={selectedExerciseRestTime}
                        onChange={(e) =>
                          setSelectedExerciseRestTime(Number(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDialogs}
                      className=""
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddExistingExercise}
                      disabled={!selectedExerciseId || isAddingExisting}
                      className=" gap-2"
                    >
                      {isAddingExisting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      Add Exercise
                    </Button>
                  </div>
                </TabsContent>

                {/* Create New Exercise Tab */}
                <TabsContent value="new" className="mt-6">
                  <Form {...exerciseForm}>
                    <form
                      onSubmit={exerciseForm.handleSubmit(handleAddExercise)}
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
                                className="h-12 "
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
                                placeholder="Describe the exercise..."
                                className=""
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
                                className=""
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-3 justify-between">
                        <FormField
                          control={exerciseForm.control}
                          name="mechanic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mechanic *</FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a mechanic" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="compound">
                                      Compound
                                    </SelectItem>
                                    <SelectItem value="isolation">
                                      Isolation
                                    </SelectItem>
                                    <SelectItem value="accessory">
                                      Accessory
                                    </SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={exerciseForm.control}
                          name="equipment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Equipment *</FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select equipment" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="barbell">
                                      Barbell
                                    </SelectItem>
                                    <SelectItem value="dumbbell">
                                      Dumbbell
                                    </SelectItem>
                                    <SelectItem value="cable">Cable</SelectItem>
                                    <SelectItem value="machine">
                                      Machine
                                    </SelectItem>
                                    <SelectItem value="bodyweight">
                                      Bodyweight
                                    </SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={exerciseForm.control}
                        name="restTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rest Time (seconds) *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 60"
                                type="number"
                                min={0}
                                step={1}
                                className="h-12  text-center font-semibold w-24"
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
                          className=""
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isCreatePending}
                          className=" gap-2"
                        >
                          {isCreatePending && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          Create Exercise
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!exerciseToDelete}
          onOpenChange={() => setExerciseToDelete(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {exerciseToDelete?.userId
                  ? "Delete Exercise"
                  : "Remove Exercise"}
              </DialogTitle>
              <DialogDescription>
                {exerciseToDelete?.userId ? (
                  <>
                    Are you sure you want to delete this exercise? This will
                    permanently remove it from your exercises and all workouts.
                    This action cannot be undone.
                  </>
                ) : (
                  <>
                    This will remove the exercise from this workout only. The
                    exercise will still be available in your exercise library.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {exerciseToDelete && (
              <div className="border border-border/50 p-4 space-y-2">
                <p className="font-semibold">{exerciseToDelete.name}</p>
                {exerciseToDelete.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {exerciseToDelete.description}
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExerciseToDelete(null)}
                disabled={isDeletePending || isUpdatingWorkout}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteExercise}
                disabled={isDeletePending || isUpdatingWorkout}
              >
                {isDeletePending || isUpdatingWorkout ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {exerciseToDelete?.userId ? "Deleting..." : "Removing..."}
                  </>
                ) : exerciseToDelete?.userId ? (
                  "Delete Exercise"
                ) : (
                  "Remove from Workout"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Rest Time Dialog */}
        <Dialog
          open={!!editingRestTime}
          onOpenChange={() => setEditingRestTime(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Rest Time</DialogTitle>
              <DialogDescription>
                Update the rest time for this exercise in seconds.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  htmlFor="restTime"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Rest Time (seconds)
                </label>
                <Input
                  id="restTime"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={editingRestTime?.currentRestTime ?? 0}
                  className="h-12  text-center font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget;
                      handleUpdateRestTime(Number(input.value));
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingRestTime(null)}
                disabled={isUpdatingWorkout}
                className=""
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const input = document.getElementById(
                    "restTime",
                  ) as HTMLInputElement;
                  if (input) {
                    handleUpdateRestTime(Number(input.value));
                  }
                }}
                disabled={isUpdatingWorkout}
                className=" gap-2"
              >
                {isUpdatingWorkout && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
