"use client";

import { useGeneral } from "@/app/providers";
import BackButton from "@/components/BackButton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import ExerciseImage from "@/components/ExerciseImage";
import { LoadingState } from "@/components/LoadingState";
import { MultiStepDialog } from "@/components/MultiStepDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useGetExercises } from "@/hooks/query/useExercise";
import { useDeletePlan, useGetPlan } from "@/hooks/query/usePlan";
import {
  addWorkoutFormSchema,
  AddWorkoutFormValues,
  editWorkoutFormSchema,
  EditWorkoutFormValues,
  useCreateWorkout,
  useDeleteWorkout,
  useUpdateWorkout,
} from "@/hooks/query/useWorkout";
import { IPlan, IWorkout } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Edit,
  FileText,
  Image as ImageIcon,
  Info,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activePlanId, setActivePlanId } = useGeneral();
  const router = useRouter();

  // Add/Edit Workout Dialog State
  const [isAddWorkoutOpen, setIsAddWorkoutOpen] = useState(false);
  const [nextStepsDialogOpen, setNextStepsDialogOpen] = useState(false);
  const [isEditWorkoutOpen, setIsEditWorkoutOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<IWorkout | null>(null);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"plan" | "workout">("plan");
  const [itemToDelete, setItemToDelete] = useState<IWorkout | IPlan | null>(
    null,
  );

  // Exercise Image Dialog State
  const [exerciseImageDialogOpen, setExerciseImageDialogOpen] = useState(false);
  const [selectedExerciseImages, setSelectedExerciseImages] = useState<{
    images: string[];
    name: string;
    userId?: string | null;
  } | null>(null);

  // Track if we're viewing images from the add workout dialog
  const [isViewingImagesFromDialog, setIsViewingImagesFromDialog] =
    useState(false);

  const addWorkoutForm = useForm<AddWorkoutFormValues>({
    resolver: zodResolver(addWorkoutFormSchema),
    defaultValues: {
      title: "",
      description: "",
      exercises: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: addWorkoutForm.control,
    name: "exercises",
  });

  const editWorkoutForm = useForm<EditWorkoutFormValues>({
    resolver: zodResolver(editWorkoutFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const {
    data: planData,
    isLoading: isPlanLoading,
    error: planError,
  } = useGetPlan({
    id: id,
    queryKey: ["plan", id],
  });

  const [exerciseSearch, setExerciseSearch] = useState("");
  const [debouncedExerciseSearch, setDebouncedExerciseSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExerciseSearch(exerciseSearch.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [exerciseSearch]);

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

  /** Map of exercise id → name for displaying selected exercise in combobox (set when user selects an item). */
  const [selectedExerciseNamesById, setSelectedExerciseNamesById] = useState<
    Record<string, string>
  >({});

  // Auto-open the workout dialog if the plan has no workouts (guided experience)
  useEffect(() => {
    if (planData && (!planData.workouts || planData.workouts.length === 0)) {
      // Small delay for better UX - let the page render first
      const timer = setTimeout(() => {
        setIsAddWorkoutOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [planData]);

  const { mutate: createWorkoutMutate, isPending: isCreateWorkoutPending } =
    useCreateWorkout({
      planId: id,
      enableToast: true,
      queryKey: ["plan", id],
      onSuccess: () => {
        // Reset the form and close the add workout dialog
        setIsAddWorkoutOpen(false);
        addWorkoutForm.reset();
        setNextStepsDialogOpen(true);
      },
    });

  const {
    mutate: updateWorkoutWithExercisesMutate,
    isPending: isUpdateWorkoutWithExercisesPending,
  } = useUpdateWorkout({
    workoutId: workoutToEdit?.id || "",
    enableToast: true,
    queryKey: ["plan", id],
    onSuccess: () => {
      toast.success("Workout updated successfully");
      setIsEditWorkoutOpen(false);
      setWorkoutToEdit(null);
      editWorkoutForm.reset();
    },
  });

  const { mutate: deletePlanMutate, isPending: isDeletePlanPending } =
    useDeletePlan({
      id: id,
      enableToast: true,
      queryKey: ["plan", id],
      onSuccess: () => {
        router.push("/plans");
      },
    });

  const { mutate: deleteWorkoutMutate, isPending: isDeleteWorkoutPending } =
    useDeleteWorkout({
      workoutId: itemToDelete?.id || "",
      enableToast: true,
      queryKey: ["plan", id],
      onSuccess: () => {
        toast.success("Workout deleted successfully");
        setDeleteDialogOpen(false);
        setItemToDelete(null);
      },
    });

  const handleAddWorkout = async (values: AddWorkoutFormValues) => {
    createWorkoutMutate(values);
  };

  const handleEditWorkout = (values: EditWorkoutFormValues) => {
    updateWorkoutWithExercisesMutate(values);
  };

  const handleDeletePlan = () => {
    if (id) {
      deletePlanMutate(id);
    }
  };

  const handleDeleteWorkout = () => {
    if (itemToDelete) {
      deleteWorkoutMutate(itemToDelete.id);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteType === "plan") {
      handleDeletePlan();
    } else {
      handleDeleteWorkout();
    }
  };

  const openEditWorkoutDialog = (workout: IWorkout) => {
    setWorkoutToEdit(workout);
    editWorkoutForm.setValue("title", workout.title);
    editWorkoutForm.setValue("description", workout.description || "");
    setIsEditWorkoutOpen(true);
  };

  const openDeleteDialog = (
    type: "plan" | "workout",
    item: IWorkout | IPlan,
  ) => {
    setDeleteType(type);
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open && !isViewingImagesFromDialog) {
      addWorkoutForm.reset();
    }
    setIsAddWorkoutOpen(open);
  };

  const handleContinueAdding = () => {
    setNextStepsDialogOpen(false);
    toast.success("Great! Keep building your workout plan 💪");
  };

  const handleProceedToLog = () => {
    setNextStepsDialogOpen(false);

    // Check if this plan is already active
    if (activePlanId === id) {
      // Plan is already active, go straight to log page
      toast.success("Let's log your workout! 🎯");
      router.push("/log");
    } else {
      // Plan is not active, set it as active first
      setActivePlanId(id);
      if (typeof window !== "undefined") {
        localStorage.setItem("activePlanId", id);
      }
      toast.success("Plan activated! Redirecting to log your workout... 🚀", {
        duration: 2000,
      });

      // Small delay before redirecting to let the user see the toast
      setTimeout(() => {
        router.push("/log");
      }, 1000);
    }
  };

  const handleNextStep = async (): Promise<boolean> => {
    const isValid = await addWorkoutForm.trigger(["title", "description"]);
    return isValid;
  };

  const handleAddExercise = () => {
    append({
      exercise: "",
      restTime: 60,
      isActive: true,
    });
  };

  if (isPlanLoading) {
    return <LoadingState message="Loading plan details..." />;
  }

  if (planError) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto space-y-8">
          <BackButton href="/plans" />
          <ErrorState
            icon={AlertCircle}
            title="Failed to load plan"
            description={
              planError instanceof Error
                ? planError.message
                : "Failed to load the plan."
            }
            action={{
              label: "Back to Plans",
              onClick: () => router.push("/plans"),
            }}
          />
        </div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto space-y-8">
          <BackButton href="/plans" />
          <EmptyState
            icon={AlertCircle}
            title="Plan not found"
            description="The workout plan you're looking for doesn't exist or has been deleted"
            action={{
              label: "Back to Plans",
              onClick: () => router.push("/plans"),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <BackButton href="/plans" />
        </div>

        {/* Plan Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold cursor-text hover:text-primary/80 transition-colors">
              {planData?.title || "Untitled Plan"}
            </h1>
          </div>
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground cursor-text hover:text-muted-foreground/80 transition-colors">
              {planData?.description || ""}
            </p>
          </div>
        </motion.div>

        {/* Workouts Section */}

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            Workouts
            {planData?.workouts && planData.workouts.length > 0 && (
              <span className="text-lg font-normal text-muted-foreground">
                ({planData.workouts.length})
              </span>
            )}
          </h3>

          <Button className="gap-2" onClick={() => setIsAddWorkoutOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Workout
          </Button>
        </div>

        {planData?.workouts && planData.workouts.length > 0 ? (
          <motion.div
            key={`workouts-${planData.workouts.length}`}
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {planData.workouts.map((workout, index) => (
                <motion.div
                  key={workout.id}
                  variants={item}
                  layout
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card className="group relative bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden">
                    {/* Dropdown Menu in Top-Right Corner */}
                    <div className="absolute top-4 right-4 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditWorkoutDialog(workout);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Workout
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog("workout", workout);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Workout
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Link href={`/plans/${id}/workouts/${workout.id}`}>
                      <CardContent className="p-6 pr-12">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold group-hover:bg-primary/20 transition-colors shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            <h4 className="text-lg font-semibold group-hover:text-primary transition-colors">
                              {workout.title}
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {workout.description ? (
                                workout.description
                              ) : (
                                <span className="italic opacity-70">
                                  No description provided
                                </span>
                              )}
                            </p>
                            {workout.exercises && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Dumbbell className="h-3 w-3" />
                                <span>
                                  {workout.exercises.length} exercise
                                  {workout.exercises.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-12 text-center space-y-6">
                <div className="rounded-full bg-muted/50 p-6 w-fit mx-auto">
                  <Calendar className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">
                    No workouts in this plan yet
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Add workouts to this plan to organize your training routine
                  </p>
                </div>
                <Button
                  className="gap-2"
                  onClick={() => setIsAddWorkoutOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Workout
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Add Workout Dialog - Multi-Step Form */}
        <Form {...addWorkoutForm}>
          <MultiStepDialog
            isOpen={isAddWorkoutOpen}
            onOpenChange={handleDialogClose}
            showProgress={true}
            showStepNumbers={false}
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            nextText="Next: Add Exercises"
            finishText={
              isCreateWorkoutPending ? "Loading..." : "Create Workout"
            }
            steps={[
              {
                id: "basic-info",
                title:
                  planData?.workouts?.length === 0
                    ? "Let's Add Your First Workout! 🎯"
                    : "Add Workout",
                description:
                  planData?.workouts?.length === 0
                    ? "Step 1 of 2 - Let's build your workout routine! Start by giving your workout a name"
                    : "Step 1 of 2: Basic Information",
                validate: handleNextStep,
                content: (
                  <div className="space-y-4">
                    <FormField
                      control={addWorkoutForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Push Day" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addWorkoutForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., Upper body push exercises"
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ),
              },
              {
                id: "add-exercises",
                title:
                  planData?.workouts?.length === 0
                    ? "Let's Add Your First Workout! 🎯"
                    : "Add Workout",
                description:
                  planData?.workouts?.length === 0
                    ? "Step 2 of 2 - Let's build your workout routine! Now add the exercises you want to perform"
                    : "Step 2 of 2: Add Exercises",
                content: (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Exercises</h3>
                        <p className="text-sm text-muted-foreground">
                          Add exercises to your workout
                        </p>
                      </div>
                    </div>

                    {/* Tip Box */}
                    <div className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Can&apos;t find an exercise? You can{" "}
                        <span className="font-medium text-primary">
                          {" "}
                          create it manually{" "}
                        </span>
                        in the workout details page after creating this workout.
                      </p>
                    </div>

                    {fields.length === 0 ? (
                      <Card className="bg-muted/50 border-dashed">
                        <CardContent className="p-8 text-center space-y-3">
                          <Dumbbell className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                          <div>
                            <p className="font-medium text-muted-foreground">
                              No exercises added yet
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Click &quot;Add Exercise&quot; to get started
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <Card key={field.id} className="relative">
                            <CardContent className="p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">
                                    {index + 1}
                                  </span>
                                  Exercise {index + 1}
                                </h4>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => remove(index)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={addWorkoutForm.control}
                                  name={`exercises.${index}.exercise`}
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                      <FormLabel>Exercise Name *</FormLabel>
                                      <FormControl>
                                        <Combobox
                                          value={field.value}
                                          itemToStringLabel={(id) => {
                                            if (!id) return "";
                                            return (
                                              selectedExerciseNamesById[id] ??
                                              exercises.find((e) => e.id === id)
                                                ?.name ??
                                              id
                                            );
                                          }}
                                          onValueChange={(value) => {
                                            field.onChange(value);
                                            if (typeof value === "string") {
                                              const name =
                                                exercises.find(
                                                  (e) => e.id === value,
                                                )?.name ?? value;
                                              setSelectedExerciseNamesById(
                                                (prev) => ({
                                                  ...prev,
                                                  [value]: name,
                                                }),
                                              );
                                            }
                                            setExerciseSearch("");
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
                                            placeholder="Search exercises..."
                                            className="w-full"
                                            showClear
                                            onKeyDown={(event) => {
                                              if (event.key === "Escape") {
                                                field.onChange("");
                                                setExerciseSearch("");
                                              }
                                            }}
                                          />
                                          <ComboboxContent>
                                            <ComboboxList
                                              className="overscroll-contain"
                                              onScroll={(event) => {
                                                if (
                                                  !hasNextPage ||
                                                  isFetchingNextPage
                                                )
                                                  return;
                                                const target =
                                                  event.currentTarget;
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
                                                  {exercises.map((exercise) => (
                                                    <ComboboxItem
                                                      key={exercise.id}
                                                      value={exercise.id}
                                                      className="pr-10"
                                                    >
                                                      <div className="flex-1 min-w-0">
                                                        <div className="font-medium">
                                                          {exercise.name}
                                                        </div>
                                                        {exercise.description && (
                                                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                                            {
                                                              exercise.description
                                                            }
                                                          </div>
                                                        )}
                                                      </div>
                                                      {exercise.images &&
                                                        exercise.images.length >
                                                        0 && (
                                                          <button
                                                            type="button"
                                                            onClick={(e) => {
                                                              e.preventDefault();
                                                              e.stopPropagation();
                                                              setSelectedExerciseImages(
                                                                {
                                                                  images:
                                                                    exercise.images ||
                                                                    [],
                                                                  name: exercise.name,
                                                                  userId:
                                                                    exercise.userId,
                                                                },
                                                              );
                                                              setIsViewingImagesFromDialog(
                                                                true,
                                                              );
                                                              setIsAddWorkoutOpen(
                                                                false,
                                                              );
                                                              setExerciseImageDialogOpen(
                                                                true,
                                                              );
                                                            }}
                                                            className="absolute right-8 p-1 rounded hover:bg-muted transition-colors"
                                                            aria-label="View exercise images"
                                                          >
                                                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                          </button>
                                                        )}
                                                    </ComboboxItem>
                                                  ))}
                                                  <ComboboxEmpty>
                                                    No exercises found.
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
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={addWorkoutForm.control}
                                  name={`exercises.${index}.restTime`}
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-1">
                                      <FormLabel>
                                        Rest Time (seconds) *
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="e.g., 120"
                                          type="number"
                                          min={0}
                                          max={1000}
                                          step={1}
                                          className="h-12 rounded-2xl text-center font-semibold"
                                          {...field}
                                          value={field.value || ""}
                                          onChange={(e) => {
                                            field.onChange(
                                              Number(e.target.value),
                                            );
                                          }}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div>
                                <FormMessage />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddExercise}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Exercise
                      </Button>
                    </div>
                  </div>
                ),
              },
            ]}
            onComplete={async () => {
              // Validate exercises array exists and has at least one item
              const exercises = addWorkoutForm.getValues("exercises");
              if (!exercises || exercises.length === 0) {
                toast.error("Please add at least one exercise to your workout");
                throw new Error("No exercises added");
              }

              // Trigger validation for all exercise fields
              const isValid = await addWorkoutForm.trigger("exercises");
              if (!isValid) {
                toast.error("Please fill in all required exercise fields");
                throw new Error("Invalid exercise data");
              }

              await addWorkoutForm.handleSubmit(handleAddWorkout)();
            }}
            onCancel={() => {
              handleDialogClose(false);
            }}
          />
        </Form>

        {/* Edit Workout Dialog */}
        <Dialog open={isEditWorkoutOpen} onOpenChange={setIsEditWorkoutOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Workout</DialogTitle>
              <DialogDescription>
                Update the workout title and description
              </DialogDescription>
            </DialogHeader>
            <Form {...editWorkoutForm}>
              <form
                onSubmit={editWorkoutForm.handleSubmit(handleEditWorkout)}
                className="space-y-4"
              >
                <FormField
                  control={editWorkoutForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Push Day" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editWorkoutForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Upper body push exercises"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditWorkoutOpen(false)}
                    disabled={isUpdateWorkoutWithExercisesPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdateWorkoutWithExercisesPending}
                  >
                    {isUpdateWorkoutWithExercisesPending
                      ? "Updating..."
                      : "Update Workout"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Delete {deleteType === "plan" ? "Plan" : "Workout"}
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;
                {itemToDelete?.title}&quot;? This action cannot be undone
                {deleteType === "plan"
                  ? " and will also delete all associated workouts"
                  : ""}
                .
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeletePlanPending || isDeleteWorkoutPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeletePlanPending || isDeleteWorkoutPending}
              >
                {isDeletePlanPending || isDeleteWorkoutPending
                  ? "Deleting..."
                  : `Delete ${deleteType === "plan" ? "Plan" : "Workout"}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Next Steps Dialog - After Creating Workout */}
        <Dialog
          open={nextStepsDialogOpen}
          onOpenChange={setNextStepsDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Workout Created! 🎉
              </DialogTitle>
              <DialogDescription>
                What would you like to do next?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <Button
                onClick={handleProceedToLog}
                className="w-full h-auto py-4 px-6 flex items-start gap-4 justify-start"
                size="lg"
              >
                <div className="p-2 bg-primary-foreground/20 rounded-lg shrink-0">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base mb-1 flex items-center gap-2">
                    Log This Workout Now
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <p className="text-xs text-primary-foreground/80 font-normal">
                    {activePlanId === id
                      ? "Start tracking your exercises and sets"
                      : "We'll activate this plan and take you to the log page"}
                  </p>
                </div>
              </Button>

              <Button
                onClick={handleContinueAdding}
                variant="outline"
                className="w-full h-auto py-4 px-6 flex items-start gap-4 justify-start"
                size="lg"
              >
                <div className="p-2 bg-muted rounded-lg shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base mb-1">
                    Continue Adding Workouts
                  </div>
                  <p className="text-xs text-muted-foreground font-normal">
                    Build out your complete workout plan first
                  </p>
                </div>
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">💡 Tip:</strong> You can
              always come back later to add more workouts or log exercises!
            </div>
          </DialogContent>
        </Dialog>

        {/* Exercise Image Dialog */}
        <Dialog
          open={exerciseImageDialogOpen}
          onOpenChange={(open) => {
            setExerciseImageDialogOpen(open);
            if (!open && isViewingImagesFromDialog) {
              // User is closing the image dialog - reopen add workout dialog
              setIsViewingImagesFromDialog(false);
              setIsAddWorkoutOpen(true);
            }
          }}
        >
          <DialogContent className="max-w-[90vw] sm:max-w-[500px] p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-medium">
                {selectedExerciseImages?.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Exercise images
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedExerciseImages?.images &&
                selectedExerciseImages.images.length > 0 &&
                !selectedExerciseImages.userId && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedExerciseImages.images.map((image, imgIndex) => (
                      <ExerciseImage
                        key={imgIndex}
                        src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${image}`}
                        alt={`${selectedExerciseImages.name} - ${imgIndex + 1}`}
                      />
                    ))}
                  </div>
                )}
              {(!selectedExerciseImages?.images ||
                selectedExerciseImages.images.length === 0 ||
                selectedExerciseImages.userId) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No images available for this exercise
                  </div>
                )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
