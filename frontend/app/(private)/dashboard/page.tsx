"use client";

import { AppGuide } from "@/components/AppGuide";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ProfileCompletionDialog } from "@/components/ProfileCompletionDialog";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getDayName } from "@/lib/store";
import { Log } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarPlus, Flame, Target, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "../../providers";

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

export default function Home() {
  const { user } = useUser();
  const router = useRouter();
  const dayName = getDayName(new Date().getDay());

  const getLogs = async () => {
    return api.get<{ data: Log[] }>("/api/logs");
  };

  const { data: logs } = useQuery({
    queryKey: ["logs"],
    queryFn: getLogs,
  });

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

  // Calculate today's workouts
  const todayWorkouts = () => {
    if (!logs?.data) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return logs.data.filter((log: { createdAt: string }) => {
      const logDate = new Date(log.createdAt);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    }).length;
  };

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

  const currentStreak = calculateStreak();
  const todayCount = todayWorkouts();
  const weeklyCount = thisWeekWorkouts();

  const stats = [
    {
      icon: Flame,
      value: currentStreak.toString(),
      label: "Day Streak",
      color: "text-orange-500",
    },
    {
      icon: Target,
      value: todayCount.toString(),
      label: "Exercises Today",
      color: "text-blue-500",
    },
    {
      icon: TrendingUp,
      value: weeklyCount.toString(),
      label: "Exercises This Week",
      color: "text-green-500",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="FitCheck"
            subtitle={`${dayName}, ${new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}`}
          />
          <div className="shrink-0 mt-1">
            <AppGuide />
          </div>
        </div>

        {user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <p className="text-lg text-foreground">
                Welcome back{user.firstName ? `, ${user.firstName}` : ""} 👋
              </p>
              <p className="text-sm text-muted-foreground">
                {currentStreak > 0
                  ? `You're on a ${currentStreak}-day streak! Keep it up! 🔥`
                  : "Ready to start your fitness journey?"}
              </p>
            </div>

            {/* Show guide hint for new users */}
            {(!logs?.data || logs.data.length === 0) && (
              <Card className="border-primary/30 bg-primary/5 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <CalendarPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-sm">
                        Getting Started Guide
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        New to FitCheck? Click the info button (
                        <span className="inline-flex items-center mx-1">ⓘ</span>
                        ) in the top right to see a step-by-step guide on how to
                        set up your workout plans and start logging! 🎯
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

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
                    className={`inline-flex items-center justify-center rounded-full bg-muted/50 p-3 group-hover:scale-110 transition-transform ${stat.color}`}
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

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <EmptyState
            icon={CalendarPlus}
            title="No workouts scheduled"
            description="Start your fitness journey by creating your first workout plan"
            action={{
              label: "Create a plan",
              onClick: () => router.push("/plans"),
            }}
          />
        </motion.div>

        {/* Profile Completion Dialog */}
        {!user?.profileCompleted && user && (
          <ProfileCompletionDialog open={!user.profileCompleted} />
        )}
      </div>
    </div>
  );
}
