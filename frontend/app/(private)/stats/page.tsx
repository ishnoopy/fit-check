"use client";

import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Log } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Flame,
  Target,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function StatsPage() {
  const router = useRouter();
  const getLogs = async () => {
    return api.get<{ data: Log[] }>("/api/logs");
  };

  const { data: logs, isLoading } = useQuery({
    queryKey: ["logs"],
    queryFn: getLogs,
  });

  const uniqueDatesWorkouts = Array.from(
    new Set(
      logs?.data?.map((log) => {
        const date = new Date(log.createdAt);
        // Convert to YYYY-MM-DD string for Set comparison
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(date.getDate()).padStart(2, "0")}`;
      })
    )
  ).map((date: unknown) => new Date(date as string));

  const totalWorkouts = logs?.data?.length || 0;

  // Calculate current streak
  const calculateStreak = () => {
    if (!logs?.data || logs.data.length === 0) return 0;

    const sortedDates = logs.data
      .map((log: { createdAt: string }) => new Date(log.createdAt))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const logDate = new Date(sortedDates[i]);
      logDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - streak);

      if (logDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (logDate.getTime() < expectedDate.getTime()) {
        break;
      }
    }

    return streak;
  };

  const currentStreak = calculateStreak();

  // Calculate this week's workouts
  const thisWeekWorkouts = () => {
    if (!logs?.data) return 0;

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return logs.data.filter((log: { createdAt: string }) => {
      const logDate = new Date(log.createdAt);
      return logDate >= startOfWeek;
    }).length;
  };

  const weeklyWorkouts = thisWeekWorkouts();

  const stats = [
    {
      icon: Flame,
      value: currentStreak,
      label: "Day Streak",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: Target,
      value: totalWorkouts,
      label: "Total Workouts",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: TrendingUp,
      value: weeklyWorkouts,
      label: "This Week",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
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
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto">
          <PageHeader
            title="Stats"
            subtitle="Your workout statistics and progress 📊"
          />
          <LoadingState message="Loading your stats..." />
        </div>
      </div>
    );
  }

  if (totalWorkouts === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto">
          <PageHeader
            title="Stats"
            subtitle="Your workout statistics and progress 📊"
          />
          <EmptyState
            icon={CalendarIcon}
            title="No workouts yet"
            description="Start logging your workouts to see your progress and statistics"
            action={{
              label: "Log a workout",
              onClick: () => router.push("/log"),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <PageHeader
          title="Stats"
          subtitle="Your workout statistics and progress 📊"
        />

        {/* Quick Stats */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-4"
        >
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-6 text-center space-y-3">
                  <div
                    className={`inline-flex items-center justify-center rounded-full ${stat.bgColor} p-3 group-hover:scale-110 transition-transform ${stat.color}`}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
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
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="rounded-full bg-primary/10 p-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                </div>
                Workout Calendar
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Days with workouts are highlighted
              </p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="multiple"
                selected={uniqueDatesWorkouts}
                disabled={true}
                className="rounded-2xl border-0"
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
          <Card className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <CardContent className="p-6 relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Days
                  </p>
                  <p className="text-3xl font-bold">
                    {uniqueDatesWorkouts.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Days with at least one workout
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Average per Week
                  </p>
                  <p className="text-3xl font-bold">
                    {Math.round(
                      (totalWorkouts /
                        Math.max(uniqueDatesWorkouts.length / 7, 1)) *
                        10
                    ) / 10}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Workouts per week average
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
