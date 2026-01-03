"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { IUser } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  Calendar,
  Edit,
  Mail,
  Ruler,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  UserIcon,
  Weight,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useUser } from "../../providers";

const profileFormSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  age: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  fitnessGoal: z
    .enum([
      "lose_weight",
      "gain_muscle",
      "maintain",
      "improve_endurance",
      "general_fitness",
    ])
    .optional(),
  activityLevel: z
    .enum([
      "sedentary",
      "lightly_active",
      "moderately_active",
      "very_active",
      "extremely_active",
    ])
    .optional(),
});

const settingsFormSchema = z.object({
  restDays: z.number().int().nonnegative().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface Setting {
  id?: string;
  userId: string;
  settings: {
    restDays?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

const updateProfile = (values: ProfileFormValues) => {
  const transformedValues: Partial<IUser> = {
    firstName: values.firstName,
    lastName: values.lastName,
    age: values.age && values.age !== "" ? Number(values.age) : undefined,
    weight:
      values.weight && values.weight !== "" ? Number(values.weight) : undefined,
    height:
      values.height && values.height !== "" ? Number(values.height) : undefined,
    gender: values.gender,
    fitnessGoal: values.fitnessGoal,
    activityLevel: values.activityLevel,
  };

  // Only include password if it's provided and not empty
  if (values.password && values.password !== "") {
    transformedValues.password = values.password;
  }

  return api.put("/api/auth/complete-profile", transformedValues);
};

const getSettings = () => api.get<{ data: Setting }>("/api/settings");
const updateSettings = (values: SettingsFormValues) =>
  api.put("/api/settings", { settings: values });

export default function ProfilePage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  const isGoogleUser = user?.authProvider === "google";

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    retry: false,
    select: (data) => data.data,
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      password: "",
      age: user?.age?.toString() || "",
      gender: user?.gender,
      weight: user?.weight?.toString() || "",
      height: user?.height?.toString() || "",
      fitnessGoal: user?.fitnessGoal,
      activityLevel: user?.activityLevel,
    },
  });

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      restDays: settings?.settings?.restDays || 0,
    },
  });

  // Update form when user or settings change
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        password: "",
        age: user.age?.toString() || "",
        gender: user.gender,
        weight: user.weight?.toString() || "",
        height: user.height?.toString() || "",
        fitnessGoal: user.fitnessGoal,
        activityLevel: user.activityLevel,
      });
    }
  }, [user, profileForm]);

  useEffect(() => {
    if (settings) {
      settingsForm.reset({
        restDays: settings.settings?.restDays,
      });
    }
  }, [settings, settingsForm]);

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Profile updated successfully! ✨");
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated successfully! ⚙️");
      setIsSettingsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings"
      );
    },
  });

  const handleProfileSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  const handleSettingsSubmit = (values: SettingsFormValues) => {
    updateSettingsMutation.mutate(values);
  };

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
                  <div className="flex items-center gap-2 shrink-0">
                    {user?.role && (
                      <div className="rounded-full bg-primary/10 px-3 py-1.5">
                        <p className="text-sm font-semibold text-primary capitalize">
                          {user.role}
                        </p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="shrink-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
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
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
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

          {/* Settings Card */}
          <motion.div variants={item}>
            <Card className="border shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Settings className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-base">Settings</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSettingsDialogOpen(true)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Rest Days per Week
                    </p>
                  </div>
                  <p className="text-lg font-bold">
                    {settings?.settings?.restDays ?? "Not set"}
                  </p>
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

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        disabled={isGoogleUser}
                        placeholder="your@email.com"
                      />
                    </FormControl>
                    <FormMessage />
                    {isGoogleUser && (
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed for Google accounts
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {!isGoogleUser && (
                <FormField
                  control={profileForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Leave empty to keep current password"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to keep your current password
                      </p>
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Age" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">
                            Prefer not to say
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          placeholder="Weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="Height" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileForm.control}
                name="fitnessGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fitness Goal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fitness goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lose_weight">Lose Weight</SelectItem>
                        <SelectItem value="gain_muscle">Gain Muscle</SelectItem>
                        <SelectItem value="maintain">Maintain</SelectItem>
                        <SelectItem value="improve_endurance">
                          Improve Endurance
                        </SelectItem>
                        <SelectItem value="general_fitness">
                          General Fitness
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="activityLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary</SelectItem>
                        <SelectItem value="lightly_active">
                          Lightly Active
                        </SelectItem>
                        <SelectItem value="moderately_active">
                          Moderately Active
                        </SelectItem>
                        <SelectItem value="very_active">Very Active</SelectItem>
                        <SelectItem value="extremely_active">
                          Extremely Active
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Customize your workout settings
            </DialogDescription>
          </DialogHeader>
          <Form {...settingsForm}>
            <form
              onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)}
              className="space-y-4"
            >
              <FormField
                control={settingsForm.control}
                name="restDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rest Days per Week</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        max="7"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                        placeholder="e.g., 2"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Number of rest days you prefer between workouts (0-7)
                    </p>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSettingsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
