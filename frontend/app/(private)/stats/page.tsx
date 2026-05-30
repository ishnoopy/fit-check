"use client";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetStats } from "@/hooks/query/useStats";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarIcon,
  FlameIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function StatsPage() {
  const router = useRouter();
  const { data: statsData, isLoading, error } = useGetStats({ queryKey: ["stats"] });

  const totalLogs = statsData?.totalLogs || 0;
  const exercisesThisWeek = statsData?.exercisesThisWeek || 0;
  const datesWithWorkouts = statsData?.datesWithWorkouts || [];

  const streak = statsData?.streak || 0;

  const stats = [
    {
      icon: FlameIcon,
      value: streak,
      label: "day streak",
    },
    {
      icon: TargetIcon,
      value: totalLogs,
      label: "workouts logged",
    },
    {
      icon: TrendingUpIcon,
      value: exercisesThisWeek,
      label: "this week",
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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24">
        <div className="p-4 max-w-2xl mx-auto space-y-4">
          <PageHeader
            title="Stats"
            subtitle="Progress at a glance"
          />
          <LoadingState message="Loading your stats..." />
        </div>
      </div>
    );
  }

  if (statsData && totalLogs === 0) {
    return (
      <div className="min-h-screen pb-24">
        <div className="p-4 max-w-2xl mx-auto space-y-4">
          <PageHeader
            title="Stats"
            subtitle="Progress at a glance"
          />
          <EmptyState
            icon={CalendarIcon}
            title="No workouts yet"
            description="Log your first workout to light up the grid."
            action={{
              label: "Log a workout",
              onClick: () => router.push("/log"),
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pb-24">
        <div className="p-4 max-w-2xl mx-auto space-y-4">
          <PageHeader title="Error" subtitle="Failed to load stats" />
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive text-sm font-medium">
                {error instanceof Error
                  ? error.message
                  : "Failed to load stats"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <PageHeader
          title="Stats"
          subtitle="Progress at a glance"
        />

        {/* Quick Stats */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-3"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item} className="h-full">
              <Card className="h-full rounded-[28px] border-secondary bg-secondary py-0 text-secondary-foreground shadow-sm transition-transform duration-150 active:scale-[0.99]">
                <CardContent className="flex h-full flex-col justify-between p-4 text-left">
                  <div className="inline-flex items-center justify-start text-primary">
                    {typeof stat.icon === "string" ? (
                      <Image
                        src={stat.icon}
                        alt=""
                        width={25}
                        height={25}
                        className="size-6 object-contain"
                      />
                    ) : (
                      <stat.icon className="size-5" />
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-4xl font-black leading-none text-primary">
                      {stat.value}
                    </p>
                    <p className="text-xs font-extrabold leading-tight text-secondary-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Calendar View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="flex size-10 items-center justify-center rounded-full border border-sidebar-border bg-secondary p-2 text-primary shadow-sm">
                  <CalendarIcon className="size-5" />
                </div>
                Workout Calendar
              </CardTitle>
              <p className="text-sm font-medium text-muted-foreground">
                Filled days are logged. Today stays soft until you train.
              </p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="multiple"
                onSelect={() => {
                  return;
                }}
                modifiers={{
                  workout: datesWithWorkouts.map(
                    (dateStr) => new Date(`${dateStr}T00:00:00`),
                  ),
                }}
                modifiersClassNames={{
                  workout: "[&>button]:opacity-100 [&>button]:bg-accent [&>button]:rounded-full",
                  today: "[&>button]:bg-accent/15 [&>button]:text-accent [&>button]:rounded-full [&>button]:ring-1 [&>button]:ring-accent/25",
                }}
                className="rounded-(--radius) border-0"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Additional Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-border bg-card">
            <CardContent className="p-5 relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-black text-foreground">
                    Logged days
                  </p>
                  <p className="text-4xl font-black leading-none text-accent">
                    {datesWithWorkouts.length}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Days with training
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-black text-foreground">
                    Weekly pace
                  </p>
                  <p className="text-4xl font-black leading-none text-accent">
                    {Math.round(
                      totalLogs /
                      Math.max(datesWithWorkouts.length / 7, 1) /
                      10,
                    ) * 10}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    Average workouts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
