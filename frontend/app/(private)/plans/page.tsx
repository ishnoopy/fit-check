"use client";

import { useGeneral } from "@/app/providers";
import { AppGuide } from "@/components/AppGuide";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
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
import { type MouseEvent, useEffect, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";

interface Plan {
  id: string;
  title: string;
  description?: string;
}

function PlanDialog({
  open,
  onOpenChange,
  title,
  description,
  form,
  onSubmit,
  pending,
  submitLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  form: UseFormReturn<CreatePlanFormValues>;
  onSubmit: (values: CreatePlanFormValues) => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[1.75rem] border-border/60 bg-card/95 shadow-xl dark:border-white/8 dark:bg-[rgba(30,32,38,0.96)]">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.04em]">
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Strength and Conditioning"
                      className="h-12 rounded-2xl border-border/70 bg-background/70"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a short note about the intent of this plan."
                      rows={4}
                      className="rounded-2xl border-border/70 bg-background/70"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-3 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="rounded-full">
                {pending ? `${submitLabel}...` : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
      localStorage.removeItem("activeWorkoutId");
      localStorage.removeItem("activeExerciseId");
      return;
    }

    setActivePlanId(planId);
    localStorage.setItem("activePlanId", planId);
    localStorage.setItem("activeWorkoutId", "");
    localStorage.setItem("activeExerciseId", "");
  };

  const { mutate: createPlanMutation, isPending: isCreatePlanPending } =
    useCreatePlan({
      enableToast: false,
      queryKey: ["plans"],
      onSuccess: (response: { data: IPlan }) => {
        toast.success("Plan created successfully. Add your first workout next.");
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

  const handleDeleteClick = (plan: Plan, event: MouseEvent) => {
    event.preventDefault();
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (plan: Plan, event: MouseEvent) => {
    event.preventDefault();
    setPlanToEdit(plan);
    editPlanForm.reset({
      title: plan.title,
      description: plan.description || "",
    });
    setEditDialogOpen(true);
  };

  const getPlans: QueryFunction<{ data: Plan[] }> = () => {
    return api.get("/api/plans");
  };

  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
  });

  const planList = plans?.data ?? [];
  const activePlan = planList.find((plan) => plan.id === activePlanId) || null;

  if (planList.length === 0) {
    return (
      <div className="min-h-screen pb-28">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-8 pt-6 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <PageHeader
              title="Plans"
              subtitle="Build your workout library and keep one plan ready for logging."
            />
            <div className="mt-1 shrink-0">
              <AppGuide />
            </div>
          </div>
          <EmptyState
            icon={Dumbbell}
            title="No workout plans yet"
            description="Create the first plan to define your training split, then mark it active when you want to log against it."
            action={{
              label: "Create your first plan",
              onClick: () => setCreateDialogOpen(true),
            }}
          />
          <PlanDialog
            open={createDialogOpen}
            onOpenChange={(open) => {
              setCreateDialogOpen(open);
              if (!open) {
                router.replace("/plans", { scroll: false });
              }
            }}
            title="Create new plan"
            description="Start with a title and a short note. You can add workouts inside the plan after creation."
            form={createPlanForm}
            onSubmit={(values) => createPlanMutation(values)}
            pending={isCreatePlanPending}
            submitLabel="Create plan"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pb-8 pt-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="Plans"
            subtitle="Organize your routines, set one active, and move directly into training."
          />
          <div className="mt-1 flex shrink-0 items-center gap-2">
            <AppGuide />
            <Button
              size="lg"
              className="rounded-full px-5"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="size-4" />
              New plan
            </Button>
          </div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="overflow-hidden rounded-[2.4rem] bg-[rgb(24,26,21)] p-6 text-[rgb(245,242,235)] shadow-xl dark:border dark:border-white/6 dark:bg-[linear-gradient(180deg,rgba(15,15,17,0.98),rgba(8,8,10,0.98))]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-md space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-[rgba(245,242,235,0.55)]">
                Active library
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.05em]">
                {activePlan ? activePlan.title : "Choose one plan to anchor your logging"}
              </h2>
              <p className="text-sm leading-6 text-[rgba(245,242,235,0.7)]">
                {activePlan?.description ||
                  "An active plan keeps workout logging focused and removes friction when you jump into a session."}
              </p>
            </div>
            <div className="rounded-full border border-[rgba(245,242,235,0.14)] bg-[rgba(245,242,235,0.08)] px-4 py-2 text-xs uppercase tracking-[0.16em] text-[rgba(245,242,235,0.7)]">
              {planList.length} saved plans
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Active
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {activePlan ? "01" : "00"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Available
              </p>
              <p className="mt-2 text-2xl font-semibold">{planList.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Status
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {activePlan ? "Ready" : "Pick"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[rgba(245,242,235,0.48)]">
                Next
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {activePlan ? "Log" : "Set"}
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.28 }}
          className="space-y-4"
        >
          {planList.map((plan, index) => {
            const isActive = activePlanId === plan.id;

            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index, duration: 0.28 }}
                whileHover={{ y: -4 }}
                className={`rounded-[2rem] border p-5 shadow-sm backdrop-blur-sm ${
                  isActive
                    ? "border-primary/30 bg-[linear-gradient(135deg,rgba(232,203,207,0.78),rgba(255,255,255,0.7))] dark:border-primary/30 dark:bg-[linear-gradient(135deg,rgba(42,36,40,0.96),rgba(24,24,28,0.96))] dark:text-[rgb(248,235,236)]"
                    : "border-border/60 bg-card/80 dark:border-white/8 dark:bg-[rgba(30,32,38,0.9)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-11 items-center justify-center rounded-full ${
                          isActive
                            ? "bg-[rgba(255,255,255,0.58)] text-[rgb(110,38,46)] dark:bg-primary/14 dark:text-primary"
                            : "bg-secondary/50 text-secondary-foreground"
                        }`}
                      >
                        <Dumbbell className="size-5" />
                      </div>
                      <div>
                        <h3
                          className={`text-xl font-semibold tracking-[-0.04em] ${
                            isActive ? "dark:text-[rgb(255,241,243)]" : ""
                          }`}
                        >
                          {plan.title}
                        </h3>
                        <p
                          className={`text-sm ${
                            isActive
                              ? "text-[rgb(121,61,67)] dark:text-white/74"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isActive ? "Current active plan" : "Available in library"}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`max-w-lg text-sm leading-6 ${
                        isActive
                          ? "text-[rgb(100,54,60)] dark:text-white/82"
                          : "text-muted-foreground"
                      }`}
                    >
                      {plan.description || "No description yet. Use the edit action to clarify the intent of this routine."}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={(event) => event.preventDefault()}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 rounded-2xl border-border/60 bg-card/95 dark:border-white/8 dark:bg-[rgba(30,32,38,0.96)]"
                    >
                      <DropdownMenuItem
                        className="cursor-pointer rounded-xl"
                        onClick={(event) => handleEditClick(plan, event)}
                      >
                        <Edit className="mr-2 size-4" />
                        Edit plan
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer rounded-xl text-destructive focus:text-destructive"
                        onClick={(event) => handleDeleteClick(plan, event)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-11 rounded-full px-5">
                    <Link href={`/plans/${plan.id}`}>
                      <Eye className="size-4" />
                      View details
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant={isActive ? "secondary" : "outline"}
                    className={`h-11 rounded-full px-5 ${
                      isActive
                        ? "bg-foreground text-background hover:bg-foreground/92"
                        : "border-border/70 bg-background/75"
                    }`}
                    onClick={() => handleToggleActivePlan(plan.id)}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle2 className="size-4" />
                        Active plan
                      </>
                    ) : (
                      <>
                        <Star className="size-4" />
                        Set as active
                      </>
                    )}
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </motion.section>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg rounded-[1.75rem] border-border/60 bg-card/95 shadow-xl dark:border-white/8 dark:bg-[rgba(30,32,38,0.96)]">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-[-0.04em]">
                Edit plan
              </DialogTitle>
              <DialogDescription>
                Adjust the title or rewrite the note that explains this routine.
              </DialogDescription>
            </DialogHeader>
            <Form {...editPlanForm}>
              <form
                onSubmit={editPlanForm.handleSubmit((values) => {
                  if (!planToEdit) return;
                  updatePlanMutation(values, {
                    onSuccess: () => {
                      setEditDialogOpen(false);
                      setPlanToEdit(null);
                      editPlanForm.reset();
                    },
                  });
                })}
                className="space-y-6"
              >
                <FormField
                  control={editPlanForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Strength and Conditioning"
                          className="h-12 rounded-2xl border-border/70 bg-background/70"
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a short note about the intent of this plan."
                          rows={4}
                          className="rounded-2xl border-border/70 bg-background/70"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-3 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditDialogOpen(false);
                      setPlanToEdit(null);
                      editPlanForm.reset();
                    }}
                    disabled={isUpdatePlanPending}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdatePlanPending}
                    className="rounded-full"
                  >
                    {isUpdatePlanPending ? "Updating..." : "Update plan"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="rounded-[1.75rem] border-border/60 bg-card/95 shadow-xl dark:border-white/8 dark:bg-[rgba(30,32,38,0.96)]">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold tracking-[-0.04em]">
                Delete plan
              </DialogTitle>
              <DialogDescription>
                Delete &quot;{planToDelete?.title}&quot; and its associated
                workouts. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeletePlanPending}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (planToDelete) {
                    deletePlanMutation(planToDelete.id);
                  }
                }}
                disabled={isDeletePlanPending}
                className="rounded-full"
              >
                {isDeletePlanPending ? "Deleting..." : "Delete plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PlanDialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              router.replace("/plans", { scroll: false });
            }
          }}
          title="Create new plan"
          description="Start with a title and a short note. You can add workouts inside the plan after creation."
          form={createPlanForm}
          onSubmit={(values) => createPlanMutation(values)}
          pending={isCreatePlanPending}
          submitLabel="Create plan"
        />
      </div>
    </div>
  );
}
