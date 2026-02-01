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
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MutationFunction,
  QueryFunction,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Dumbbell,
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
import { z } from "zod";

interface Plan {
  id: string;
  title: string;
  description?: string;
}

const createPlanSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
  workouts: z.array(z.string()).min(0).optional(),
});

type FormValues = z.infer<typeof createPlanSchema>;

const createPlan: MutationFunction<{ data: Plan }, FormValues> = (
  values: FormValues,
) => {
  return api.post("/api/plans", values);
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

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function PlansPage() {
  const { activePlanId, setActivePlanId } = useGeneral();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(
    searchParams.get("create") === "true",
  );

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      router.replace("/plans", { scroll: false });
    }
  }, [searchParams, router]);

  const createPlanForm = useForm<FormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      title: "",
      description: "",
      workouts: [],
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

  const createPlanMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: (response: { data: Plan }) => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success(
        "Plan created successfully! 🎉 Let's add your first workout",
      );
      createPlanForm.reset();
      setCreateDialogOpen(false);

      // Redirect to the plan detail page
      router.push(`/plans/${response.data.id}`);
    },
    onError: (error) => {
      console.error("Failed to create plan", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create plan",
      );
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId: string) => api.delete(`/api/plans/${planId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan deleted successfully");
      setDeleteDialogOpen(false);
      setPlanToDelete(null);

      // Clear active plan if it was deleted
      if (planToDelete && activePlanId === planToDelete.id) {
        setActivePlanId(null);
        localStorage.removeItem("activePlanId");
      }
    },
    onError: (error) => {
      console.error("Failed to delete plan", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete plan",
      );
    },
  });

  const handleDeleteClick = (plan: Plan, e: React.MouseEvent) => {
    e.preventDefault();
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (planToDelete) {
      deletePlanMutation.mutate(planToDelete.id);
    }
  };

  const onSubmit = (values: FormValues) => {
    createPlanMutation.mutate(values);
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
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto space-y-8">
          <div className="flex items-start justify-between gap-3">
            <PageHeader
              title="Plans"
              subtitle="Create and manage your workout routines 💪"
            />
            <div className="shrink-0 mt-1">
              <AppGuide />
            </div>
          </div>
          <EmptyState
            icon={Dumbbell}
            title="No workout plans yet"
            description="Create your first workout plan to organize your exercises and track your progress"
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
                <DialogTitle>Create New Plan</DialogTitle>
                <DialogDescription>
                  Create a new workout plan to organize your training routine 💪
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
                      disabled={createPlanMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createPlanMutation.isPending}
                    >
                      {createPlanMutation.isPending
                        ? "Creating..."
                        : "Create Plan"}
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
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-3">
          <PageHeader
            title="Plans"
            subtitle="Create and manage your workout routines 💪"
          />
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <AppGuide />
            <Button
              size="lg"
              className="rounded-full gap-2"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-5 w-5" />
              New Plan
            </Button>
          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2"
        >
          {plans?.data?.map((plan: Plan) => {
            const isActive = activePlanId === plan.id;

            return (
              <motion.div key={plan.id} variants={item}>
                <Card
                  className={`group relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-xl transition-all duration-300 h-full flex flex-col ${
                    isActive
                      ? "border-primary/50 shadow-lg ring-2 ring-primary/20"
                      : ""
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                  )}

                  <CardHeader className="pb-4 relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-xl font-bold line-clamp-2">
                          {plan.title}
                        </CardTitle>
                        {isActive && (
                          <div className="flex items-center gap-1.5 text-primary">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-xs font-semibold">
                              Active Plan
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Plan Actions */}
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                          <Dumbbell className="h-5 w-5 text-primary" />
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
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {plan.description || (
                        <span className="italic opacity-70">
                          No description provided
                        </span>
                      )}
                    </p>
                  </CardContent>

                  <CardFooter className="pt-0 flex flex-col gap-2 relative">
                    <Button
                      asChild
                      variant="default"
                      className="w-full rounded-2xl group/btn"
                      size="lg"
                    >
                      <Link
                        href={`/plans/${plan.id}`}
                        className="flex items-center justify-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Link>
                    </Button>

                    {/* Set as Active Button */}
                    <Button
                      type="button"
                      variant={isActive ? "secondary" : "outline"}
                      className={`w-full rounded-2xl ${
                        isActive
                          ? "bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
                          : ""
                      }`}
                      onClick={() => handleToggleActivePlan(plan.id)}
                    >
                      {isActive ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Active Plan
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Active
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Plan</DialogTitle>
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
                disabled={deletePlanMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deletePlanMutation.isPending}
              >
                {deletePlanMutation.isPending ? "Deleting..." : "Delete Plan"}
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
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Create a new workout plan to organize your training routine 💪
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
                    disabled={createPlanMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPlanMutation.isPending}>
                    {createPlanMutation.isPending
                      ? "Creating..."
                      : "Create Plan"}
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
