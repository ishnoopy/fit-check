"use client";

import { useGeneral } from "@/app/providers";
import BackButton from "@/components/BackButton";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
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
import { api } from "@/lib/api";
import { Plan, Workout } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MutationFunction,
  QueryFunction,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  MoreVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

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

const addWorkoutFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  exercises: z
    .array(
      z.object({
        name: z.string().min(1, { message: "Name is required" }),
        description: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1, { message: "At least one exercise is required" }),
});

const editWorkoutFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
});

type AddWorkoutFormValues = z.infer<typeof addWorkoutFormSchema>;
type EditWorkoutFormValues = z.infer<typeof editWorkoutFormSchema>;

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activePlanId, setActivePlanId } = useGeneral();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Add/Edit Workout Dialog State
  const [isAddWorkoutOpen, setIsAddWorkoutOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [nextStepsDialogOpen, setNextStepsDialogOpen] = useState(false);
  const [isEditWorkoutOpen, setIsEditWorkoutOpen] = useState(false);
  const [workoutToEdit, setWorkoutToEdit] = useState<Workout | null>(null);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"plan" | "workout">("plan");
  const [itemToDelete, setItemToDelete] = useState<Workout | Plan | null>(null);

  // Edit Plan Dialog State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

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

  const getPlan: QueryFunction<{ data: Plan }> = () =>
    api.get(`/api/plans/${id}`);

  const { data, isLoading, error } = useQuery({
    queryKey: ["plan", id],
    queryFn: getPlan,
    enabled: !!id,
  });
  const plan = data?.data;

  // Auto-open the workout dialog if the plan has no workouts (guided experience)
  useEffect(() => {
    if (plan && (!plan.workouts || plan.workouts.length === 0)) {
      // Small delay for better UX - let the page render first
      const timer = setTimeout(() => {
        setIsAddWorkoutOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [plan]);

  const updatePlan: MutationFunction<
    { data: Plan },
    { title?: string; description?: string }
  > = (values) => {
    return api.put(`/api/plans/${id}`, {
      title: values.title || "",
      description: values.description || "",
    });
  };

  const updatePlanMutation = useMutation({
    mutationFn: updatePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", id] });
      toast.success("Plan updated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update plan"
      );
    },
  });

  const createWorkoutWithExercises: MutationFunction<
    { data: Workout },
    AddWorkoutFormValues
  > = (values) => {
    return api.post("/api/workouts/with-exercises", {
      plan_id: id,
      ...values,
    });
  };

  const createWorkoutWithExercisesMutation = useMutation({
    mutationFn: createWorkoutWithExercises,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", id] });
      toast.success("Workout created successfully! 🎉");

      // Reset the form and close the add workout dialog
      setCurrentStep(1);
      setIsAddWorkoutOpen(false);
      addWorkoutForm.reset();

      // Show next steps dialog
      setNextStepsDialogOpen(true);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create workout"
      );
    },
  });

  const updateWorkout: MutationFunction<
    { data: Workout },
    EditWorkoutFormValues & { workoutId: string }
  > = (values) => {
    return api.put(`/api/workouts/${values.workoutId}`, values);
  };

  const updateWorkoutMutation = useMutation({
    mutationFn: updateWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", id] });
      toast.success("Workout updated successfully");
      setIsEditWorkoutOpen(false);
      setWorkoutToEdit(null);
      editWorkoutForm.reset();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update workout"
      );
    },
  });

  const deletePlan: MutationFunction<void, string> = (planId) => {
    return api.delete(`/api/plans/${planId}`);
  };

  const deletePlanMutation = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      toast.success("Plan deleted successfully");
      router.push("/plans");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete plan"
      );
    },
  });

  const deleteWorkout: MutationFunction<void, string> = (workoutId) => {
    return api.delete(`/api/workouts/${workoutId}`);
  };

  const deleteWorkoutMutation = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", id] });
      toast.success("Workout deleted successfully");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete workout"
      );
    },
  });

  const handleAddWorkout = (values: AddWorkoutFormValues) => {
    createWorkoutWithExercisesMutation.mutate(values);
  };

  const handleEditWorkout = (values: EditWorkoutFormValues) => {
    if (workoutToEdit) {
      updateWorkoutMutation.mutate({ ...values, workoutId: workoutToEdit._id });
    }
  };

  const handleDeletePlan = () => {
    if (id) {
      deletePlanMutation.mutate(id);
    }
  };

  const handleDeleteWorkout = () => {
    if (itemToDelete) {
      deleteWorkoutMutation.mutate(itemToDelete._id);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteType === "plan") {
      handleDeletePlan();
    } else {
      handleDeleteWorkout();
    }
  };

  const handleTitleClick = () => {
    if (plan) {
      setEditedTitle(plan.title);
      setIsEditingTitle(true);
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (plan && editedTitle.trim() && editedTitle !== plan.title) {
      updatePlanMutation.mutate({ title: editedTitle.trim() });
    }
  };

  const handleDescriptionClick = () => {
    if (plan) {
      setEditedDescription(plan.description || "");
      setIsEditingDescription(true);
    }
  };

  const handleDescriptionBlur = () => {
    setIsEditingDescription(false);
    if (plan && editedDescription !== (plan.description || "")) {
      updatePlanMutation.mutate({ description: editedDescription });
    }
  };

  const openEditWorkoutDialog = (workout: Workout) => {
    setWorkoutToEdit(workout);
    editWorkoutForm.setValue("title", workout.title);
    editWorkoutForm.setValue("description", workout.description || "");
    setIsEditWorkoutOpen(true);
  };

  const openDeleteDialog = (type: "plan" | "workout", item: Workout | Plan) => {
    setDeleteType(type);
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setCurrentStep(1);
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

  const handleNextStep = async () => {
    const isValid = await addWorkoutForm.trigger(["title", "description"]);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handleAddExercise = () => {
    append({
      name: "",
      description: "",
      notes: "",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto space-y-8">
          <BackButton href="/plans" />
          <PageHeader title="Loading..." subtitle="Loading plan details" />
          <LoadingState message="Loading plan details..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto space-y-8">
          <BackButton href="/plans" />
          <PageHeader title="Error" subtitle="Failed to load plan" />
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
                    : "Failed to load the plan."}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!plan) {
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => openDeleteDialog("plan", plan)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Editable Plan Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="space-y-2">
            {isEditingTitle ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                className="text-4xl font-bold border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
            ) : (
              <h1
                className="text-4xl font-bold cursor-text hover:text-primary/80 transition-colors"
                onClick={handleTitleClick}
              >
                {plan?.title || "Untitled Plan"}
              </h1>
            )}
          </div>
          <div className="space-y-2">
            {isEditingDescription ? (
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add a description..."
                className="text-lg text-muted-foreground border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                rows={2}
                autoFocus
              />
            ) : (
              <p
                className="text-lg text-muted-foreground cursor-text hover:text-muted-foreground/80 transition-colors"
                onClick={handleDescriptionClick}
              >
                {plan?.description || (
                  <span className="italic opacity-70">
                    Click to add a description...
                  </span>
                )}
              </p>
            )}
          </div>
        </motion.div>

        {/* Workouts Section */}

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            Workouts
            {plan.workouts && plan.workouts.length > 0 && (
              <span className="text-lg font-normal text-muted-foreground">
                ({plan.workouts.length})
              </span>
            )}
          </h3>

          <Button className="gap-2" onClick={() => setIsAddWorkoutOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Workout
          </Button>
        </div>

        {plan.workouts && plan.workouts.length > 0 ? (
          <motion.div
            key={`workouts-${plan.workouts.length}`}
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {plan.workouts.map((workout, index) => (
                <motion.div
                  key={workout._id}
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
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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

                    <Link href={`/plans/${id}/workouts/${workout._id}`}>
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
        <Dialog open={isAddWorkoutOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {plan?.workouts?.length === 0
                  ? "Let's Add Your First Workout! 🎯"
                  : "Add Workout"}
              </DialogTitle>
              <DialogDescription>
                {plan?.workouts?.length === 0 ? (
                  <>
                    Step {currentStep} of 2 - Let&apos;s build your workout
                    routine!{" "}
                    {currentStep === 1
                      ? "Start by giving your workout a name"
                      : "Now add the exercises you want to perform"}
                  </>
                ) : (
                  <>
                    Step {currentStep} of 2:{" "}
                    {currentStep === 1 ? "Basic Information" : "Add Exercises"}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  currentStep === 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/20 text-primary"
                }`}
              >
                1
              </div>
              <div
                className={`h-1 flex-1 rounded ${
                  currentStep === 2 ? "bg-primary" : "bg-muted"
                }`}
              />
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  currentStep === 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
            </div>

            <Form {...addWorkoutForm}>
              <form
                onSubmit={addWorkoutForm.handleSubmit(handleAddWorkout)}
                className="space-y-6"
              >
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
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
                  </motion.div>
                )}

                {/* Step 2: Add Exercises */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Exercises</h3>
                        <p className="text-sm text-muted-foreground">
                          Add exercises to your workout
                        </p>
                      </div>
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
                                  name={`exercises.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                      <FormLabel>Exercise Name *</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="e.g., Bench Press"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={addWorkoutForm.control}
                                  name={`exercises.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                      <FormLabel>
                                        Description (optional)
                                      </FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Brief description of the exercise"
                                          rows={2}
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {currentStep === 1 ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDialogClose(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNextStep}
                        className="flex-1 gap-2"
                      >
                        Next: Add Exercises
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button type="submit" className="flex-1 gap-2">
                        <Plus className="h-4 w-4" />
                        Create Workout
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

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
                    disabled={updateWorkoutMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateWorkoutMutation.isPending}
                  >
                    {updateWorkoutMutation.isPending
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
                disabled={
                  deletePlanMutation.isPending ||
                  deleteWorkoutMutation.isPending
                }
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={
                  deletePlanMutation.isPending ||
                  deleteWorkoutMutation.isPending
                }
              >
                {deletePlanMutation.isPending || deleteWorkoutMutation.isPending
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
      </div>
    </div>
  );
}
