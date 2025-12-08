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
  Calendar,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  FileText,
  Info,
  Lightbulb,
  Star,
} from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Create a Plan",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Calendar,
    title: "Add Workouts",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Dumbbell,
    title: "Add Exercises",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Star,
    title: "Activate Plan",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: CheckCircle2,
    title: "Log Workouts",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

export function AppGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg border-2 hover:shadow-xl transition-all hover:scale-105"
        >
          <Info className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <div className="p-2 bg-linear-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <Info className="h-5 w-5 text-primary" />
            </div>
            Quick Start Guide
          </DialogTitle>
          <DialogDescription>
            Get up and running in 5 simple steps 🚀
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Steps with Icons */}
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-all hover:bg-accent/50 group"
              >
                <div
                  className={`p-2 rounded-lg ${step.bgColor} group-hover:scale-110 transition-transform`}
                >
                  <step.icon className={`h-4 w-4 ${step.color}`} />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-muted-foreground">
                    {idx + 1}.
                  </span>
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Structure Diagram */}
          <div className="p-4 bg-linear-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold">How it works</span>
            </div>

            <div className="flex items-center justify-center gap-2 py-2">
              <div className="flex flex-col items-center gap-1">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-xs font-medium">Plan</span>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground" />

              <div className="flex flex-col items-center gap-1">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Calendar className="h-4 w-4 text-purple-500" />
                </div>
                <span className="text-xs font-medium">Workouts</span>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground" />

              <div className="flex flex-col items-center gap-1">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Dumbbell className="h-4 w-4 text-green-500" />
                </div>
                <span className="text-xs font-medium">Exercises</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground text-center">
                Example:{" "}
                <span className="font-medium text-foreground">
                  &quot;Push/Pull/Legs&quot;
                </span>{" "}
                →{" "}
                <span className="font-medium text-foreground">
                  &quot;Push Day&quot;
                </span>{" "}
                →{" "}
                <span className="font-medium text-foreground">
                  &quot;Bench Press&quot;
                </span>
              </p>
            </div>
          </div>

          {/* Important Tip */}
          <div className="p-3 bg-linear-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                <strong className="text-foreground">Pro Tip:</strong>{" "}
                <span className="text-muted-foreground">
                  You must activate a plan before you can start logging
                  workouts!
                </span>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
