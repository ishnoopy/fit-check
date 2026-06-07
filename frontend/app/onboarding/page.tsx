"use client";

import { useUser } from "@/app/providers";
import heroOnboarding from "@/assets/hero-onboarding.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Home,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const fitnessGoalValues = [
  "strength",
  "hypertrophy",
  "fat_loss",
  "endurance",
  "general_fitness",
] as const;

const onboardingSchema = z.object({
  onboardingPromiseAccepted: z.boolean().refine((value) => value, {
    message: "Please confirm before continuing.",
  }),
  firstName: z.string().min(1, { message: "Please enter your first name." }),
  lastName: z.string().optional(),
  selfMotivationNote: z
    .string()
    .min(3, { message: "Add a short reminder for your future self." })
    .max(280),
  fitnessGoal: z.enum(fitnessGoalValues, {
    error: "Choose a main goal.",
  }),
  hasGymAccess: z.boolean({
    error: "Choose gym or home training.",
  }),
  age: z
    .string()
    .min(1, { message: "Age is required." })
    .refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 13 && parsed <= 120;
    }, { message: "Age must be between 13 and 120." }),
  weight: z
    .string()
    .min(1, { message: "Weight is required." })
    .refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 20 && parsed <= 500;
    }, { message: "Weight must be between 20 and 500 kg." }),
  height: z
    .string()
    .min(1, { message: "Height is required." })
    .refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 50 && parsed <= 300;
    }, { message: "Height must be between 50 and 300 cm." }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const stepFields: Array<(keyof OnboardingFormValues)[]> = [
  ["onboardingPromiseAccepted"],
  ["firstName", "lastName", "selfMotivationNote"],
  ["fitnessGoal", "hasGymAccess"],
  ["age", "weight", "height"],
];

const goalLabels: Record<(typeof fitnessGoalValues)[number], string> = {
  strength: "Strength",
  hypertrophy: "Muscle",
  fat_loss: "Fat loss",
  endurance: "Endurance",
  general_fitness: "General fitness",
};

const goalDescriptions: Record<(typeof fitnessGoalValues)[number], string> = {
  strength: "Get stronger at the big lifts.",
  hypertrophy: "Build visible muscle and shape.",
  fat_loss: "Lean down with structure.",
  endurance: "Last longer and recover better.",
  general_fitness: "Move better, feel better.",
};

const completeOnboarding = async (values: OnboardingFormValues) => {
  return api.put("/api/auth/complete-profile", {
    onboardingPromiseAccepted: values.onboardingPromiseAccepted,
    firstName: values.firstName,
    lastName: values.lastName?.trim() || undefined,
    selfMotivationNote: values.selfMotivationNote.trim(),
    fitnessGoal: values.fitnessGoal,
    hasGymAccess: values.hasGymAccess,
    age: Number(values.age),
    weight: Number(values.weight),
    height: Number(values.height),
  });
};

export default function OnboardingPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [showLastNameField, setShowLastNameField] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      onboardingPromiseAccepted: false,
      firstName: "",
      lastName: "",
      selfMotivationNote: "",
      fitnessGoal: undefined,
      hasGymAccess: undefined,
      age: "",
      weight: "",
      height: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
      return;
    }

    if (!isLoading && user?.profileCompleted) {
      router.replace("/dashboard");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const finishMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Welcome to TUFF.");
      router.replace("/dashboard");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to complete onboarding.",
      );
    },
  });

  const selectedGoal = useWatch({ control: form.control, name: "fitnessGoal" });
  const hasGymAccess = useWatch({ control: form.control, name: "hasGymAccess" });
  const selfMotivationNote = useWatch({
    control: form.control,
    name: "selfMotivationNote",
  });
  const progress = useMemo(
    () => Math.round(((step + 1) / stepFields.length) * 100),
    [step],
  );

  const goNext = async () => {
    if (step === 0) {
      form.setValue("onboardingPromiseAccepted", true, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setStep(1);
      return;
    }

    const isValid = await form.trigger(stepFields[step]);
    if (!isValid) return;

    setStep((current) => Math.min(current + 1, stepFields.length - 1));
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
  };

  const submitOnboarding = () => {
    form.handleSubmit((values) => finishMutation.mutate(values))();
  };

  if (isLoading || !user || user.profileCompleted) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isLastStep = step === stepFields.length - 1;

  return (
    <main className="relative flex min-h-dvh px-4 py-4 pb-44 sm:px-6 sm:py-6 sm:pb-52 lg:pb-8">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-40 bg-primary/45 sm:h-48 lg:h-24" />
      <div className="pointer-events-none fixed bottom-0 left-1/2 z-20 size-44 -translate-x-1/2 sm:size-56 lg:left-auto lg:right-12 lg:size-72 lg:translate-x-0">
        <Image
          src={heroOnboarding}
          alt="TUFF onboarding mascot"
          fill
          priority
          sizes="(min-width: 1024px) 288px, (min-width: 640px) 224px, 176px"
          className="object-contain object-bottom drop-shadow-2xl"
        />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-13rem)] w-full max-w-3xl flex-col justify-center sm:min-h-[calc(100dvh-15rem)] lg:min-h-[calc(100dvh-3rem)] lg:pr-64">
        <div className="rounded-[2rem] border bg-card p-5 shadow-xl sm:p-8">
          <header className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold text-muted-foreground">
                  Step {step + 1} of {stepFields.length}
                </p>
                <h1 className="mt-1 text-3xl font-extrabold text-balance sm:text-4xl">
                  {step === 0 && "Ready to start?"}
                  {step === 1 && "What should I call you?"}
                  {step === 2 && "What are we training for?"}
                  {step === 3 && "What are your stats today?"}
                </h1>
              </div>
              <p className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground tabular-nums">
                {progress}%
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </header>

          <div className="pt-8">
              {step === 0 && (
                <div className="max-w-2xl space-y-8">
                  <div className="space-y-4">
                    <p className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground">
                      2 minutes to set up
                    </p>
                    <h2 className="text-4xl font-extrabold text-balance sm:text-5xl">
                      I just need four quick answers.
                    </h2>
                    <p className="max-w-xl text-lg font-medium text-muted-foreground text-pretty">
                      Name, promise, training setup, and starting numbers. Then
                      you are in.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    className="h-14 px-7 text-base"
                    onClick={goNext}
                  >
                    I&apos;m ready
                    <ArrowRight className="size-5" />
                  </Button>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldError message={form.formState.errors.firstName?.message}>
                      <Input
                        placeholder="First name"
                        aria-invalid={!!form.formState.errors.firstName}
                        {...form.register("firstName")}
                      />
                    </FieldError>
                    {showLastNameField ? (
                      <Input
                        placeholder="Last name (optional)"
                        {...form.register("lastName")}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 justify-start px-4 text-muted-foreground"
                        onClick={() => setShowLastNameField(true)}
                      >
                        Add last name
                      </Button>
                    )}
                  </div>
                  <FieldError
                    message={form.formState.errors.selfMotivationNote?.message}
                  >
                    <Textarea
                      rows={4}
                      maxLength={280}
                      placeholder="Write one short promise to future you."
                      aria-invalid={
                        !!form.formState.errors.selfMotivationNote
                      }
                      {...form.register("selfMotivationNote")}
                    />
                  </FieldError>
                  <div className="flex justify-end text-xs font-bold text-muted-foreground tabular-nums">
                    {(selfMotivationNote || "").length}/280
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <p className="mb-3 text-sm font-extrabold text-muted-foreground">
                      Main goal
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {fitnessGoalValues.map((goal) => {
                        const selected = selectedGoal === goal;
                        return (
                          <button
                            key={goal}
                            type="button"
                            className={cn(
                              "rounded-3xl border bg-card p-4 text-left shadow-xs transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.99]",
                              selected &&
                                "border-primary bg-primary text-primary-foreground shadow-md",
                            )}
                            onClick={() =>
                              form.setValue("fitnessGoal", goal, {
                                shouldDirty: true,
                                shouldValidate: true,
                              })
                            }
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-base font-extrabold">
                                {goalLabels[goal]}
                              </span>
                              {selected && <Check className="size-5" />}
                            </span>
                            <span
                              className={cn(
                                "mt-2 block text-sm font-medium text-muted-foreground text-pretty",
                                selected && "text-primary-foreground/75",
                              )}
                            >
                              {goalDescriptions[goal]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <InlineError message={form.formState.errors.fitnessGoal?.message} />
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-extrabold text-muted-foreground">
                      Training access
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        type="button"
                        size="lg"
                        variant={hasGymAccess === true ? "default" : "outline"}
                        className="h-16 justify-start rounded-3xl px-5 text-base"
                        onClick={() =>
                          form.setValue("hasGymAccess", true, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <Dumbbell className="size-5" />
                        Gym access
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        variant={hasGymAccess === false ? "default" : "outline"}
                        className="h-16 justify-start rounded-3xl px-5 text-base"
                        onClick={() =>
                          form.setValue("hasGymAccess", false, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <Home className="size-5" />
                        Home workouts
                      </Button>
                    </div>
                    <InlineError message={form.formState.errors.hasGymAccess?.message} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FieldError message={form.formState.errors.age?.message}>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Age"
                        aria-invalid={!!form.formState.errors.age}
                        {...form.register("age")}
                      />
                    </FieldError>
                    <FieldError message={form.formState.errors.weight?.message}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        placeholder="Weight kg"
                        aria-invalid={!!form.formState.errors.weight}
                        {...form.register("weight")}
                      />
                    </FieldError>
                    <FieldError message={form.formState.errors.height?.message}>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="Height cm"
                        aria-invalid={!!form.formState.errors.height}
                        {...form.register("height")}
                      />
                    </FieldError>
                  </div>
                  <div className="rounded-3xl border bg-card p-5 shadow-xs">
                    <p className="text-lg font-extrabold text-balance">
                      That is enough for your first baseline.
                    </p>
                    <p className="mt-2 text-sm font-medium text-muted-foreground text-pretty">
                      You can refine preferences later. For now, I can match the
                      plan to your goal and where you train.
                    </p>
                  </div>
                </div>
              )}
          </div>

          {step > 0 && (
            <footer className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
              <Button type="button" variant="ghost" onClick={goBack}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                type="button"
                size="lg"
                className="min-w-32"
                onClick={isLastStep ? submitOnboarding : goNext}
                disabled={finishMutation.isPending}
              >
                {finishMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : isLastStep ? (
                  <>
                    Start training
                    <ArrowRight className="size-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </footer>
          )}
        </div>
      </section>
    </main>
  );
}

function FieldError({
  children,
  message,
}: {
  children: React.ReactNode;
  message?: string;
}) {
  return (
    <label className="block space-y-2">
      {children}
      <InlineError message={message} />
    </label>
  );
}

function InlineError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="text-sm font-bold text-destructive">{message}</p>;
}
