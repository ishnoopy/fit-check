"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Calendar,
  Dumbbell,
  FileText,
  Star,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: 1,
    icon: FileText,
    title: "Create a Plan",
    description:
      "Start by creating a workout plan to organize your training routine",
    tips: [
      "Give your plan a clear name (e.g., 'Summer Body Program')",
      "Add a description to remember your goals",
      "You can create multiple plans for different purposes",
    ],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    number: 2,
    icon: Calendar,
    title: "Create Workouts",
    description: "Add workouts to your plan (e.g., Push Day, Pull Day, Leg Day)",
    tips: [
      "Each workout should focus on specific muscle groups or movements",
      "Add a description to note the workout's focus",
      "You'll be guided to add exercises right after creating a workout",
    ],
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    number: 3,
    icon: Dumbbell,
    title: "Add Exercises",
    description:
      "Add exercises to each workout with details like sets, reps, and notes",
    tips: [
      "Include exercise name (e.g., Bench Press, Squats)",
      "Add descriptions for proper form reminders",
      "Use notes for any special instructions",
    ],
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    number: 4,
    icon: Star,
    title: "Activate Your Plan",
    description: "Set your preferred plan as active to start logging workouts",
    tips: [
      "Only one plan can be active at a time",
      "Go to Plans and click 'Set as Active' on your chosen plan",
      "You can switch active plans anytime",
    ],
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    number: 5,
    icon: CheckCircle2,
    title: "Log Your Workouts",
    description: "Track your progress by logging exercises from your active plan",
    tips: [
      "Select a workout from your active plan",
      "Choose an exercise to log",
      "Add sets with reps, weight, and optional notes",
      "Use 'Copy from last' to quickly replicate previous workouts",
    ],
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

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

export function AppGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg border-2 hover:shadow-xl transition-all"
        >
          <Info className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Info className="h-6 w-6 text-primary" />
            </div>
            How to Use FitCheck
          </DialogTitle>
          <DialogDescription>
            Follow these simple steps to get started with your fitness journey
            🎯
          </DialogDescription>
        </DialogHeader>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4 mt-4"
        >
          {steps.map((step) => (
            <motion.div key={step.number} variants={item}>
              <Card className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full ${step.bgColor} flex items-center justify-center`}
                      >
                        <step.icon className={`h-6 w-6 ${step.color}`} />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold ${step.color} bg-background border border-current rounded-full px-2 py-0.5`}
                        >
                          STEP {step.number}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        {step.tips.map((tip, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="mt-0.5">
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${step.color.replace(
                                  "text",
                                  "bg"
                                )}`}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {tip}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            <strong className="text-foreground">💡 Pro Tip:</strong> Take it
            step by step! The app will guide you through each stage as you
            progress.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

