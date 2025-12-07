"use client";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Activity,
  Calendar,
  Mail,
  Ruler,
  Target,
  TrendingUp,
  User,
  Weight,
} from "lucide-react";
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
    if (!value) return "Not specified";

    switch (key) {
      case "weight":
        return `${value} kg`;
      case "height":
        return `${value} cm`;
      case "fitness_goal":
      case "activity_level":
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

  const bmi = calculateBMI();

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

  const profileSections = [
    {
      title: "Basic Information",
      icon: User,
      items: [
        {
          icon: User,
          label: "Name",
          value: `${user?.first_name || ""} ${user?.last_name || ""}`,
        },
        { icon: Mail, label: "Email", value: user?.email || "N/A" },
      ],
    },
    {
      title: "Physical Stats",
      icon: Activity,
      items: [
        {
          icon: Calendar,
          label: "Age",
          value: user?.age ? `${user.age} years` : "Not specified",
        },
        {
          icon: User,
          label: "Gender",
          value: formatValue("gender", user?.gender),
        },
        {
          icon: Weight,
          label: "Weight",
          value: formatValue("weight", user?.weight),
        },
        {
          icon: Ruler,
          label: "Height",
          value: formatValue("height", user?.height),
        },
      ],
    },
    {
      title: "Fitness Goals",
      icon: Target,
      items: [
        {
          icon: Target,
          label: "Primary Goal",
          value: formatValue("fitness_goal", user?.fitness_goal),
        },
        {
          icon: Activity,
          label: "Activity Level",
          value: formatValue("activity_level", user?.activity_level),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <PageHeader
          title="Profile"
          subtitle="Your fitness profile and information 🎯"
        />

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* BMI Card - Highlighted */}
          {bmi && (
            <motion.div variants={item}>
              <Card className="bg-linear-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <CardContent className="p-6 relative">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Body Mass Index
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold">{bmi}</p>
                        <p className="text-lg font-medium text-muted-foreground">
                          {parseFloat(bmi) < 18.5
                            ? "Underweight"
                            : parseFloat(bmi) < 25
                            ? "Normal"
                            : parseFloat(bmi) < 30
                            ? "Overweight"
                            : "Obese"}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-full bg-primary/10 p-4">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Profile Sections */}
          {profileSections.map((section, sectionIndex) => (
            <motion.div key={section.title} variants={item}>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="rounded-full bg-primary/10 p-2">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.items.map((info, index) => (
                      <motion.div
                        key={info.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: sectionIndex * 0.1 + index * 0.05,
                        }}
                        className="flex items-start gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors"
                      >
                        <div className="rounded-full bg-muted/50 p-2 mt-0.5">
                          <info.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">
                            {info.label}
                          </p>
                          <p className="text-base font-semibold">
                            {info.value}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Account Info */}
          <motion.div variants={item}>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Member Since
                    </p>
                    <p className="text-base font-semibold">
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-4 py-2">
                    <p className="text-sm font-semibold text-primary capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
