"use client";

import { AppGuide } from "@/components/AppGuide";
import BackButton from "@/components/BackButton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { MultiStepDialog } from "@/components/MultiStepDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Calendar,
  ChevronRight,
  Dumbbell,
  Edit,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Add/Edit Workout Dialog State
  const [isAddWorkoutOpen, setIsAddWorkoutOpen] = useState(false);
  const [isEditWorkoutOpen, setIsEditWorkoutOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<IWorkout | null>(null);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"plan" | "workout">("plan");
  const [itemToDelete, setItemToDelete] = useState<IWorkout | IPlan | null>(
    null,
  );

  const addWorkoutForm = useForm<AddWorkoutFormValues>({
    resolver: zodResolver(addWorkoutFormSchema),
    defaultValues: {
      title: "",
      description: "",
      exercises: [],
    },
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
      onSuccess: (workout) => {
        setIsAddWorkoutOpen(false);
        addWorkoutForm.reset();
        router.push(`/plans/${id}/workouts/${workout.id}?addExercise=1`);
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
    if (!open) {
      addWorkoutForm.reset();
    }
    setIsAddWorkoutOpen(open);
  };

  const handleNextStep = async (): Promise<boolean> => {
    const isValid = await addWorkoutForm.trigger(["title", "description"]);
    return isValid;
  };

  if (isPlanLoading) {
    return <LoadingState message="Loading plan details..." />;
  }

  if (planError) {
    return (
      <div className="min-h-screen pb-24">
        <div className="p-4 max-w-2xl mx-auto space-y-5">
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
      <div className="min-h-screen pb-24">
        <div className="p-4 max-w-2xl mx-auto space-y-5">
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
    <div className="min-h-screen pb-24">
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <BackButton href="/plans" />
        </div>

        {/* Plan Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <PageHeader
              title={planData?.title || "Untitled Plan"}
              subtitle={planData?.description || ""}
            />
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <AppGuide />
            </div>
          </div>
        </motion.div>

        {/* Workouts Section */}

        <div className="mb-5 flex flex-col gap-3 rounded-[28px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Calendar className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-3xl font-black leading-none">Workouts</h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {planData?.workouts?.length
                  ? `${planData.workouts.length} workout${planData.workouts.length === 1 ? "" : "s"} in this plan`
                  : "Add a workout to start building the routine"}
              </p>
            </div>
          </div>

          <Button
            className="w-full gap-2 sm:w-auto"
            onClick={() => setIsAddWorkoutOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add workout
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
                  <Card className="group relative overflow-hidden border-border bg-card transition-transform duration-150 active:scale-[0.99]">
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
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-secondary text-primary font-black transition-colors shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            <h4 className="text-xl font-black group-hover:text-accent transition-colors">
                              {workout.title}
                            </h4>
                            <p className="text-sm font-medium text-muted-foreground line-clamp-2">
                              {workout.description ? (
                                workout.description
                              ) : (
                                <span className="italic opacity-70">
                                  No description yet
                                </span>
                              )}
                            </p>
                            {workout.exercises && (
                              <div className="flex items-center gap-2 text-xs font-black text-muted-foreground">
                                <Dumbbell className="h-3 w-3" />
                                <span>
                                  {workout.exercises.length} exercise
                                  {workout.exercises.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
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
            <Card className="border-border bg-card">
              <CardContent className="p-12 text-center space-y-6">
                <div className="rounded-full bg-secondary p-6 w-fit mx-auto text-primary">
                  <Calendar className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-2xl font-black">
                    No workouts in this plan yet
                  </h4>
                  <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto">
                    Add workouts to make this plan ready for logging.
                  </p>
                </div>
                <Button
                  className="gap-2"
                  onClick={() => setIsAddWorkoutOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add first workout
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Add Workout Dialog */}
        <Form {...addWorkoutForm}>
          <MultiStepDialog
            isOpen={isAddWorkoutOpen}
            onOpenChange={handleDialogClose}
            showProgress={false}
            showStepNumbers={false}
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
            finishText={
              isCreateWorkoutPending ? "Loading..." : "Create Workout"
            }
            steps={[
              {
                id: "basic-info",
                title:
                  planData?.workouts?.length === 0
                    ? "Add your first workout"
                    : "Add workout",
                description:
                  planData?.workouts?.length === 0
                    ? "Start with a clear workout name."
                    : "Start with the workout name. You can add existing or custom exercises next.",
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
            ]}
            onComplete={async () => {
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

      </div>
    </div>
  );
}
