"use client";

import { useUser } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
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
  fitnessGoal: z.enum(fitnessGoalValues),
  hasGymAccess: z.boolean(),
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
  ["firstName", "lastName"],
  ["selfMotivationNote"],
  ["fitnessGoal"],
  ["hasGymAccess"],
  ["age"],
  ["weight"],
  ["height"],
];

const goalLabels: Record<(typeof fitnessGoalValues)[number], string> = {
  strength: "Strength",
  hypertrophy: "Hypertrophy",
  fat_loss: "Fat loss",
  endurance: "Endurance",
  general_fitness: "General fitness",
};

const stepCardMotion = {
  initial: { opacity: 0, y: 20, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.985 },
  transition: { duration: 0.28, ease: "easeOut" as const },
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

  const finishMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Welcome to FitCheck.");
      router.replace("/dashboard");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to complete onboarding.",
      );
    },
  });

  const totalSteps = stepFields.length + 3;
  const isLastStep = step === totalSteps - 1;
  const selectedGoal = useWatch({ control: form.control, name: "fitnessGoal" });
  const hasGymAccess = useWatch({ control: form.control, name: "hasGymAccess" });
  const selfMotivationNote = useWatch({
    control: form.control,
    name: "selfMotivationNote",
  });
  const progressLabel = useMemo(() => `${step + 1} / ${totalSteps}`, [step, totalSteps]);

  const submitOnboarding = () => {
    form.handleSubmit((values) => finishMutation.mutate(values))();
  };

  const goNext = async () => {
    if (step <= 1) {
      setStep((current) => Math.min(current + 1, totalSteps - 1));
      return;
    }

    const fieldIndex = step - 2;
    const isValid = await form.trigger(stepFields[fieldIndex]);
    if (!isValid) return;

    setStep((current) => Math.min(current + 1, totalSteps - 1));
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
  };

  if (isLoading || !user || user.profileCompleted) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="min-h-screen px-5 py-10 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col">
        <motion.div
          key={`progress-${step}`}
          className="mb-8 flex items-center justify-between"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <motion.span
                key={`dot-${index}`}
                className={`h-2.5 w-2.5 rounded-full ${
                  index === step
                    ? "bg-primary"
                    : index < step
                      ? "bg-primary/70"
                      : "bg-border"
                }`}
                animate={{ scale: index === step ? 1.15 : 1, opacity: index <= step ? 1 : 0.6 }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-muted-foreground">{progressLabel}</span>
        </motion.div>

        <section className="flex flex-1 flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div key={`step-${step}`} {...stepCardMotion} className="space-y-6">
              {step === 0 && (
                <div className="space-y-6">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.35 }}
                      className="block"
                    >
                      Yesterday, you said tomorrow...
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.0, duration: 0.35 }}
                      className="mt-3 block"
                    >
                      Now&apos;s the time to prove something to yourself.
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.9, duration: 0.35 }}
                      className="mt-3 block text-primary"
                    >
                      Lock in. Let&apos;s build your new baseline.
                    </motion.span>
                  </h1>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.4, duration: 0.3 }}
                  >
                    <Button size="lg" className="h-12 px-8 text-base font-semibold" onClick={goNext}>
                      I&apos;m ready
                    </Button>
                  </motion.div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Do you wish to be 1% better every day?
                  </h1>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Button
                      size="lg"
                      className="h-12 px-8 text-base font-semibold"
                      onClick={() => {
                        form.setValue("onboardingPromiseAccepted", true);
                        setStep(2);
                      }}
                    >
                      YES
                    </Button>
                  </motion.div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Hi, what should I call you?
                  </h2>
                  <Input placeholder="First name" className="h-12 text-base" {...form.register("firstName")} />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                  )}
                  {showLastNameField ? (
                    <Input
                      placeholder="Last name (optional)"
                      className="h-12 text-base"
                      {...form.register("lastName")}
                    />
                  ) : (
                    <Button type="button" variant="ghost" className="px-0 text-muted-foreground" onClick={() => setShowLastNameField(true)}>
                      Add last name (optional)
                    </Button>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Remember when you said you&apos;d lock in? well, make a promise right here to yourself.
                  </h2>
                  <Textarea
                    rows={5}
                    maxLength={280}
                    placeholder="A short reminder for future you..."
                    className="text-base"
                    {...form.register("selfMotivationNote")}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{form.formState.errors.selfMotivationNote?.message}</span>
                    <span>{(selfMotivationNote || "").length}/280</span>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">What are your main goals?</h2>
                  <div className="grid gap-3">
                    {fitnessGoalValues.map((goal) => {
                      const selected = selectedGoal === goal;
                      return (
                        <Button
                          key={goal}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          className="h-11 justify-start text-base"
                          onClick={() => form.setValue("fitnessGoal", goal)}
                        >
                          {goalLabels[goal]}
                        </Button>
                      );
                    })}
                  </div>
                  {form.formState.errors.fitnessGoal && (
                    <p className="text-sm text-destructive">{form.formState.errors.fitnessGoal.message}</p>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Do you have access to a gym?</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      size="lg"
                      variant={hasGymAccess === true ? "default" : "outline"}
                      onClick={() => form.setValue("hasGymAccess", true)}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant={hasGymAccess === false ? "default" : "outline"}
                      onClick={() => form.setValue("hasGymAccess", false)}
                    >
                      No
                    </Button>
                  </div>
                  {form.formState.errors.hasGymAccess && (
                    <p className="text-sm text-destructive">{form.formState.errors.hasGymAccess.message}</p>
                  )}
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How old are you?</h2>
                  <Input type="number" inputMode="numeric" placeholder="Age" className="h-12 text-base" {...form.register("age")} />
                  {form.formState.errors.age && (
                    <p className="text-sm text-destructive">{form.formState.errors.age.message}</p>
                  )}
                </div>
              )}

              {step === 7 && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">What&apos;s your current weight (kg)?</h2>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="Weight in kg"
                    className="h-12 text-base"
                    {...form.register("weight")}
                  />
                  {form.formState.errors.weight && (
                    <p className="text-sm text-destructive">{form.formState.errors.weight.message}</p>
                  )}
                </div>
              )}

              {step === 8 && (
                <div className="space-y-4">
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">What&apos;s your height (cm)?</h2>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Height in cm"
                    className="h-12 text-base"
                    {...form.register("height")}
                  />
                  {form.formState.errors.height && (
                    <p className="text-sm text-destructive">{form.formState.errors.height.message}</p>
                  )}
                </div>
              )}

              {step === 9 && (
                <div className="space-y-6">
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="text-3xl font-semibold tracking-tight sm:text-4xl"
                  >
                    You don&apos;t have to have it all figure out today, you just have to start...
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.3 }}
                    className="text-sm text-muted-foreground"
                  >
                    Start now. Momentum will handle the rest.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55, duration: 0.25 }}
                  >
                    <Button
                      type="button"
                      size="lg"
                      className="h-12 px-8 text-base font-semibold"
                      onClick={submitOnboarding}
                      disabled={finishMutation.isPending}
                    >
                      {finishMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        "Let's do it!"
                      )}
                    </Button>
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {step > 0 && step !== 1 && !isLastStep && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-8 flex items-center justify-between"
          >
            <Button type="button" variant="ghost" onClick={goBack}>
              Back
            </Button>
            <Button type="button" onClick={goNext}>
              Next
            </Button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
