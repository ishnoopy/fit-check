"use client";

import { useGeneral } from "@/app/providers";
import { AppGuide } from "@/components/AppGuide";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  CreatePlanFormValues,
  createPlanSchema,
  useCreatePlan,
  useDeletePlan,
  useUpdatePlan,
} from "@/hooks/query/usePlan";
import { api } from "@/lib/api";
import { IPlan } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { QueryFunction, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Dumbbell,
  Edit,
  Eye,
  MoreVertical,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface Plan {
  id: string;
  title: string;
  description?: string;
}

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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function PlansPage() {
  const { activePlanId, setActivePlanId } = useGeneral();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<Plan | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(
    searchParams.get("create") === "true",
  );

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      router.replace("/plans", { scroll: false });
    }
  }, [searchParams, router]);

  const createPlanForm = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const editPlanForm = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const handleToggleActivePlan = (planId: string) => {
    localStorage.removeItem("draftLogData");
    if (activePlanId === planId) {
      setActivePlanId(null);
      localStorage.removeItem("activePlanId");

      // remove active workout and exercise from local storage
      localStorage.removeItem("activeWorkoutId");
      localStorage.removeItem("activeExerciseId");
      return;
    }
    setActivePlanId(planId);
    localStorage.setItem("activePlanId", planId);

    // set active workout and exercise to local storage
    localStorage.setItem("activeWorkoutId", "");
    localStorage.setItem("activeExerciseId", "");
  };

  const { mutate: createPlanMutation, isPending: isCreatePlanPending } =
    useCreatePlan({
      enableToast: false,
      queryKey: ["plans"],
      onSuccess: (response: { data: IPlan }) => {
        toast.success(
          "Plan created successfully! 🎉 Let's add your first workout",
        );
        createPlanForm.reset();
        setCreateDialogOpen(false);
        router.push(`/plans/${response.data.id}`);
      },
    });

  const { mutate: deletePlanMutation, isPending: isDeletePlanPending } =
    useDeletePlan({
      id: planToDelete?.id || "",
      enableToast: true,
      queryKey: ["plans"],
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setPlanToDelete(null);

        // Clear active plan if it was deleted
        if (planToDelete && activePlanId === planToDelete.id) {
          setActivePlanId(null);
          localStorage.removeItem("activePlanId");
        }
      },
    });

  const { mutate: updatePlanMutation, isPending: isUpdatePlanPending } =
    useUpdatePlan({
      id: planToEdit?.id || "",
      enableToast: true,
      queryKey: ["plans"],
    });

  const handleDeleteClick = (plan: Plan, e: React.MouseEvent) => {
    e.preventDefault();
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (planToDelete) {
      deletePlanMutation(planToDelete.id);
    }
  };

  const handleEditClick = (plan: Plan, e: React.MouseEvent) => {
    e.preventDefault();
    setPlanToEdit(plan);
    editPlanForm.reset({
      title: plan.title,
      description: plan.description || "",
    });
    setEditDialogOpen(true);
  };

  const handleConfirmEdit = (values: CreatePlanFormValues) => {
    if (planToEdit) {
      updatePlanMutation(values, {
        onSuccess: () => {
          setEditDialogOpen(false);
          setPlanToEdit(null);
          editPlanForm.reset();
        },
      });
    }
  };

  const onSubmit = (values: CreatePlanFormValues) => {
    createPlanMutation(values);
  };

  const getPlans: QueryFunction<{ data: Plan[] }> = () => {
    return api.get("/api/plans");
  };

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
  });

  //* Empty Plans State
  if (!plans?.data || plans.data.length === 0) {
    return (
      <div className="min-h-screen pb-24">
        <div className="p-6 max-w-2xl mx-auto space-y-8">
          <div className="flex items-start justify-between gap-3">
            <PageHeader
              title="Plans"
              subtitle="Build the routine before you log the work"
            />
            <div className="shrink-0 mt-1">
              <AppGuide />
            </div>
          </div>
          <EmptyState
            icon={Dumbbell}
            title="No workout plans yet"
            description="Create one plan, add workouts, then set it active for logging."
            action={{
              label: "Create your first plan",
              onClick: () => setCreateDialogOpen(true),
            }}
          />

          {/* Create Plan Dialog */}
          <Dialog
            open={createDialogOpen}
            onOpenChange={(open) => {
              setCreateDialogOpen(open);
              if (!open) {
                router.replace("/plans", { scroll: false });
              }
            }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create plan</DialogTitle>
                <DialogDescription>
                  Name the routine you want to train from.
                </DialogDescription>
              </DialogHeader>
              <Form {...createPlanForm}>
                <form
                  onSubmit={createPlanForm.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={createPlanForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Summer Body Program"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createPlanForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 6-week plan to build muscle and lose fat"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      disabled={isCreatePlanPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreatePlanPending}>
                      {isCreatePlanPending ? "Creating..." : "Create plan"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  //* Plans State
  return (
    <div className="min-h-screen pb-24">
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <PageHeader
            title="Plans"
            subtitle="Build the routine before you log the work"
          />
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <AppGuide />
            <Button
              size="lg"
              className="gap-2"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
              New plan
            </Button>
          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {plans?.data?.map((plan: Plan) => {
            const isActive = activePlanId === plan.id;

            return (
              <motion.div key={plan.id} variants={item}>
                <Card
                  className={`group relative overflow-hidden border-border bg-card transition-transform duration-150 active:scale-[0.99] h-full flex flex-col ${isActive
                      ? "border-secondary shadow-sm ring-2 ring-primary"
                      : ""
                    }`}
                >
                  <CardHeader className="pb-4 relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-2xl font-black line-clamp-2">
                          {plan.title}
                        </CardTitle>
                        {isActive && (
                          <div className="flex flex-wrap items-center gap-1.5 text-accent">
                            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary-foreground">
                              Active
                            </span>
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-xs font-black">
                              Ready to log
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Plan Actions */}
                      <div className="flex items-center gap-2">
                        <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary transition-colors">
                          <Dumbbell className="h-5 w-5" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => handleEditClick(plan, e)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onClick={(e) => handleDeleteClick(plan, e)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Plan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 pb-4 relative">
                    <p className="text-sm font-medium leading-relaxed text-muted-foreground line-clamp-3">
                      {plan.description || (
                        <span className="italic opacity-70">
                          No description yet
                        </span>
                      )}
                    </p>
                  </CardContent>

                  <CardFooter className="pt-0 flex flex-col gap-2 relative">
                    <Button
                      asChild
                      variant="default"
                      className="w-full  group/btn"
                      size="lg"
                    >
                      <Link
                        href={`/plans/${plan.id}`}
                        className="flex items-center justify-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Open plan
                      </Link>
                    </Button>

                    {/* Set as Active Button */}
                    <Button
                      type="button"
                      variant={isActive ? "secondary" : "outline"}
                      className={`w-full  ${isActive
                          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                          : ""
                        }`}
                      onClick={() => handleToggleActivePlan(plan.id)}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Active plan
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          Set active
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Edit Plan Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit plan</DialogTitle>
              <DialogDescription>
                Keep the plan name and notes current.
              </DialogDescription>
            </DialogHeader>
            <Form {...editPlanForm}>
              <form
                onSubmit={editPlanForm.handleSubmit(handleConfirmEdit)}
                className="space-y-6"
              >
                <FormField
                  control={editPlanForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Summer Body Program"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editPlanForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., 6-week plan to build muscle and lose fat"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditDialogOpen(false);
                      setPlanToEdit(null);
                      editPlanForm.reset();
                    }}
                    disabled={isUpdatePlanPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdatePlanPending}>
                    {isUpdatePlanPending ? "Updating..." : "Update plan"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete plan</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{planToDelete?.title}
                &quot;? This action cannot be undone and will also delete all
                associated workouts.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeletePlanPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeletePlanPending}
              >
                {isDeletePlanPending ? "Deleting..." : "Delete plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Plan Dialog */}
        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              router.replace("/plans", { scroll: false });
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create plan</DialogTitle>
              <DialogDescription>
                Name the routine you want to train from.
              </DialogDescription>
            </DialogHeader>
            <Form {...createPlanForm}>
              <form
                onSubmit={createPlanForm.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={createPlanForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Summer Body Program"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createPlanForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., 6-week plan to build muscle and lose fat"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    disabled={isCreatePlanPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatePlanPending}>
                    {isCreatePlanPending ? "Creating..." : "Create plan"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
