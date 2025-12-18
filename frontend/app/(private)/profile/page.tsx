"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Activity,
  Calendar,
  Mail,
  Ruler,
  Sparkles,
  Target,
  TrendingUp,
  User,
  UserIcon,
  Weight,
} from "lucide-react";
import Image from "next/image";
import { useUser } from "../../providers";

export default function ProfilePage() {
  const { user } = useUser();

  // Helper function to format field labels
  const formatLabel = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Helper function to format values
  const formatValue = (key: string, value: string | number | undefined) => {
    if (!value) return "Not set";

    switch (key) {
      case "weight":
        return `${value} kg`;
      case "height":
        return `${value} cm`;
      case "fitnessGoal":
      case "activityLevel":
      case "gender":
        return formatLabel(String(value));
      default:
        return value;
    }
  };

  // Calculate BMI if height and weight are available
  const calculateBMI = () => {
    if (user?.height && user?.weight) {
      const heightInMeters = user.height / 100;
      const bmi = user.weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5)
      return {
        label: "Underweight",
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500/10",
      };
    if (bmi < 25)
      return {
        label: "Normal",
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-500/10",
      };
    if (bmi < 30)
      return {
        label: "Overweight",
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-500/10",
      };
    return {
      label: "Obese",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10",
    };
  };

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Profile 🎯</h1>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {/* User Header Card */}
          <motion.div variants={item}>
            <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg">
                    {user?.avatar ? (
                      <Image
                        src={user.avatar}
                        alt="Profile"
                        width={64}
                        height={64}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-8 w-8 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-lg mb-1">
                      {user?.firstName} {user?.lastName}
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{user?.email}</span>
                      </div>
                    </div>
                  </div>
                  {user?.role && (
                    <div className="rounded-full bg-primary/10 px-3 py-1.5 shrink-0">
                      <p className="text-sm font-semibold text-primary capitalize">
                        {user.role}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* BMI Card */}
          {bmi && bmiCategory && (
            <motion.div variants={item}>
              <Card
                className={`border shadow-sm overflow-hidden ${bmiCategory.bg}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Body Mass Index
                        </p>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <p className="text-4xl font-bold">{bmi}</p>
                        <p className={`text-lg font-bold ${bmiCategory.color}`}>
                          {bmiCategory.label}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on your height and weight
                      </p>
                    </div>
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Physical Stats Card */}
          <motion.div variants={item}>
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base">Physical Stats</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Age
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      {user?.age ? `${user.age} years` : "Not set"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Gender
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      {formatValue("gender", user?.gender)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Weight
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      {formatValue("weight", user?.weight)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Height
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      {formatValue("height", user?.height)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Fitness Goals Card */}
          <motion.div variants={item}>
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base">Fitness Goals</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Primary Goal
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      {formatValue("fitnessGoal", user?.fitnessGoal)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Activity Level
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      {formatValue("activityLevel", user?.activityLevel)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Account Information Card */}
          <motion.div variants={item}>
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base">
                    Account Information
                  </h3>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Member Since
                    </p>
                  </div>
                  <p className="text-lg font-bold">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
