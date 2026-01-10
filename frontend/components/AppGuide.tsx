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
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  FileText,
  Info,
  Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const steps = [
  {
    icon: FileText,
    title: "Create a Plan",
    description:
      "Set up your plan with workouts and exercises. You'll be guided through adding them automatically.",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    href: "/plans?create=true",
  },
  {
    icon: Star,
    title: "Activate Plan",
    description: "Make it your active routine to start logging workouts.",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    href: "/plans",
  },
  {
    icon: CheckCircle2,
    title: "Log Workouts",
    description: "Track your sets, reps, and weights as you train.",
    color: "text-green-600",
    bgColor: "bg-green-50",
    href: "/log",
  },
];

export function AppGuide() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleStepClick = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-md hover:shadow-lg transition-shadow"
        >
          <Info className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold">
            Quick Start Guide
          </DialogTitle>
          <DialogDescription className="text-sm">
            Get started in 3 simple steps
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleStepClick(step.href)}
                  className="group w-full flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/60 hover:border hover:border-primary/30 transition-all text-left cursor-pointer active:scale-[0.98] relative"
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-lg ${step.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <StepIcon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
                      {step.description}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary shrink-0 mt-1 transition-all duration-200" />
                </button>
              );
            })}
          </div>

          {/* Structure Flow */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-foreground">
                  Plan
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-foreground">
                  Workouts
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <Dumbbell className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-xs font-medium text-foreground">
                  Exercises
                </span>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Example: Push/Pull/Legs → Push Day → Bench Press
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
