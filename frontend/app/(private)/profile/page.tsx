"use client";

import { Button } from "@/components/ui/button";
import { FollowListUser, FollowUsersDialog } from "@/components/FollowUsersDialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { formatPostTime } from "@/lib/utils";
import { IUser } from "@/types";
import pioneerBadge from "@/assets/psyduck.gif";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3x3, Settings2, UserIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useUser } from "../../providers";

const profileFormSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().optional(),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{3,24}$/, {
      message:
        "Username must be 3-24 chars using lowercase letters, numbers, or underscores",
    })
    .optional()
    .or(z.literal("")),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  age: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  fitnessGoal: z
    .enum([
      "strength",
      "hypertrophy",
      "fat_loss",
      "endurance",
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
  timezone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type SettingsFormValues = z.infer<typeof settingsFormSchema>;

interface Setting {
  id?: string;
  userId: string;
  settings: {
    restDays?: number;
    timezone?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface ProfilePost {
  id: string;
  text: string;
  media?: {
    url: string;
    mimeType: string;
    fileName?: string;
  } | null;
  createdAt: string;
}

interface ProfileSummary {
  id: string;
  username?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

const updateProfile = (values: ProfileFormValues) => {
  const transformedValues: Partial<IUser> = {
    firstName: values.firstName.trim(),
    lastName: values.lastName?.trim() || undefined,
    username: values.username?.trim() || undefined,
    age: values.age && values.age !== "" ? Number(values.age) : undefined,
    weight:
      values.weight && values.weight !== "" ? Number(values.weight) : undefined,
    height:
      values.height && values.height !== "" ? Number(values.height) : undefined,
    gender: values.gender,
    fitnessGoal: values.fitnessGoal,
    activityLevel: values.activityLevel,
  };

  if (values.password && values.password !== "") {
    transformedValues.password = values.password;
  }

  return api.put("/api/auth/complete-profile", transformedValues);
};

const getSettings = () => api.get<{ data: Setting }>("/api/settings");
const updateSettings = (values: SettingsFormValues) =>
  api.put("/api/settings", { settings: values });

const uploadFile = async (file: File) => {
  // 1. Generate presigned URL
  const data = await api.post<{
    data: { url: string; fields: Record<string, string>; key: string };
  }>("/api/upload/presign", {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  const { url, fields, key } = data.data;

  // 2. Upload file to S3 using FormData as this is needed by the presigned URL
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  formData.append("file", file);

  const uploadResponse = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload image");
  }

  // 3. Create file upload record
  return await api.post<{ data: { id: string } }>("/api/upload/files", {
    s3Key: key,
    mimeType: file.type,
    fileName: file.name,
    fileSize: file.size,
  });
};

const getMyPosts = () => api.get<{ data: ProfilePost[] }>("/api/posts/me");

const updateMyAvatar = (uploadId: string) =>
  api.patch("/api/users/me/avatar", { uploadId });

const getProfileSummary = (username: string) =>
  api.get<{ data: ProfileSummary }>(`/api/users/${username}/profile`);

const getFollowers = (username: string) =>
  api.get<{ data: FollowListUser[] }>(`/api/users/${username}/followers`);

const getFollowing = (username: string) =>
  api.get<{ data: FollowListUser[] }>(`/api/users/${username}/following`);

export default function ProfilePage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isFollowersDialogOpen, setIsFollowersDialogOpen] = useState(false);
  const [isFollowingDialogOpen, setIsFollowingDialogOpen] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const isGoogleUser = user?.authProvider === "google";

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    retry: false,
    select: (data) => data.data,
  });

  const { data: myPosts = [] } = useQuery({
    queryKey: ["my-posts"],
    queryFn: getMyPosts,
    retry: false,
    select: (data) => data.data || [],
  });

  const { data: profileSummary } = useQuery({
    queryKey: ["profile-summary", user?.username],
    queryFn: () => getProfileSummary(user!.username as string),
    enabled: Boolean(user?.username),
    select: (data) => data.data,
  });

  const { data: followers = [], isLoading: isFollowersLoading } = useQuery({
    queryKey: ["followers", user?.username],
    queryFn: () => getFollowers(user!.username as string),
    enabled: Boolean(user?.username) && isFollowersDialogOpen,
    select: (data) => data.data,
  });

  const { data: following = [], isLoading: isFollowingLoading } = useQuery({
    queryKey: ["following", user?.username],
    queryFn: () => getFollowing(user!.username as string),
    enabled: Boolean(user?.username) && isFollowingDialogOpen,
    select: (data) => data.data,
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      username: user?.username || "",
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
      timezone:
        settings?.settings?.timezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // Update form when user or settings change
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
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
  }, [profileForm, user]);

  useEffect(() => {
    if (settings) {
      settingsForm.reset({
        restDays: settings.settings?.restDays,
        timezone:
          settings.settings?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
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
        error instanceof Error ? error.message : "Failed to update profile",
      );
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated successfully");
      setIsSettingsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings",
      );
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const upload = await uploadFile(file);
      const uploadId = upload?.data?.id;
      if (!uploadId) {
        throw new Error("Failed to upload avatar image");
      }
      await updateMyAvatar(uploadId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["profile-summary"] });
      toast.success("Profile photo updated");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update avatar",
      );
    },
  });

  const handleProfileSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  const handleSettingsSubmit = (values: SettingsFormValues) => {
    updateSettingsMutation.mutate(values);
  };

  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    uploadAvatarMutation.mutate(file);
  };

  const calculateStats = () => {
    return {
      posts: profileSummary?.postsCount ?? myPosts.length,
      followers: profileSummary?.followersCount ?? 0,
      following: profileSummary?.followingCount ?? 0,
    };
  };

  const stats = calculateStats();

  const formatLabel = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-muted/30 via-background to-background">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="p-6 border border-border/70 rounded-[1.5rem] bg-background/90 shadow-sm">
          <div className="flex items-start gap-8 md:gap-16">
            {/* Profile Picture */}
            <div className="relative">
              <div className="h-20 w-20 md:h-32 md:w-32 rounded-(--radius) bg-primary p-0.5">
                <div className="h-full w-full rounded-(--radius) bg-background p-1">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="rounded-(--radius) object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full rounded-(--radius) bg-muted/40 border border-border flex items-center justify-center">
                      <UserIcon className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Pioneer Easter Egg */}
              {user?.isPioneer && (
                <div className="absolute -bottom-1 -left-1 md:-bottom-2 md:-left-2">
                  <div className="relative rounded-(--radius) p-0.5 bg-primary">
                    <Image
                      src={pioneerBadge}
                      alt="Pioneer Badge"
                      width={32}
                      height={32}
                      className="h-8 w-8 md:h-10 md:w-10"
                      title="Pioneer User"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold border border-background cursor-pointer"
                onClick={() => avatarFileInputRef.current?.click()}
                disabled={uploadAvatarMutation.isPending}
              >
                {uploadAvatarMutation.isPending ? "..." : "✎"}
              </button>
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-light">
                    {`${user?.firstName?.toLowerCase() || ""} ${user?.lastName?.toLowerCase() || ""}`.trim()}
                  </h1>
                  {user?.isPioneer && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-(--radius) text-xs font-medium bg-primary/10 text-primary border border-primary/20 shadow-xs font-mono tracking-tight">
                      &lt;/&gt;
                    </span>
                  )}
                </div>
                {user?.username && (
                  <span className="text-xs text-muted-foreground font-mono">
                    @{user.username}
                  </span>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  Edit profile
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSettingsDialogOpen(true)}
                >
                  <Settings2 className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex gap-8 mb-4">
                <div className="text-center md:text-left">
                  <span className="font-semibold">{stats.posts}</span>{" "}
                  <span className="text-muted-foreground">posts</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFollowersDialogOpen(true)}
                  className="text-center md:text-left cursor-pointer"
                >
                  <span className="font-semibold">{stats.followers}</span>{" "}
                  <span className="text-muted-foreground">followers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFollowingDialogOpen(true)}
                  className="text-center md:text-left cursor-pointer"
                >
                  <span className="font-semibold">{stats.following}</span>{" "}
                  <span className="text-muted-foreground">following</span>
                </button>
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <p className="font-semibold">
                  {user?.firstName} {user?.lastName}
                </p>
                {user?.fitnessGoal && (
                  <p className="text-sm">
                    {formatLabel(user.fitnessGoal)} •{" "}
                    {user.activityLevel && formatLabel(user.activityLevel)}
                  </p>
                )}
                {(user?.age || user?.weight || user?.height) && (
                  <p className="text-sm text-muted-foreground">
                    {user?.age && `${user.age}yo`}
                    {user?.weight && ` • ${user.weight}kg`}
                    {user?.height && ` • ${user.height}cm`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="posts" className="w-full mt-5">
          <TabsList className="w-full justify-center border-t bg-transparent h-auto p-0 rounded-none">
            <TabsTrigger
              value="posts"
              className="flex items-center gap-2 data-[state=active]:border-t-2 data-[state=active]:border-foreground rounded-none px-6 py-3"
            >
              <Grid3x3 className="h-4 w-4" />
              <span className="hidden sm:inline">POSTS</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0">
            <div className="space-y-4 mt-3">
              {myPosts.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-border px-5 py-12 text-center">
                  <h2 className="text-2xl font-light mb-2">No Posts Yet</h2>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Your feed posts will appear here, including media and post text.
                  </p>
                </div>
              ) : (
                myPosts.map((post) => (
                  <article key={post.id} className="rounded-[1.25rem] border border-border/70 bg-background/95 overflow-hidden">
                    {post.media?.mimeType.startsWith("video/") ? (
                      <video src={post.media.url} controls className="w-full max-h-[28rem]" />
                    ) : post.media?.url ? (
                      <div className="relative w-full aspect-square">
                        <Image
                          src={post.media.url}
                          alt={post.media.fileName || "Post media"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : null}
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-sm whitespace-pre-wrap break-words">{post.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPostTime(post.createdAt)}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
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
                      <FormLabel>Last Name</FormLabel>
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

              <FormField
                control={profileForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="your_username"
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Lowercase letters, numbers, and underscores only.
                    </p>
                  </FormItem>
                )}
              />

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
                        <SelectItem value="strength">Strength</SelectItem>
                        <SelectItem value="hypertrophy">Hypertrophy</SelectItem>
                        <SelectItem value="fat_loss">Fat Loss</SelectItem>
                        <SelectItem value="endurance">Endurance</SelectItem>
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

      <FollowUsersDialog
        open={isFollowersDialogOpen}
        onOpenChange={setIsFollowersDialogOpen}
        title="Followers"
        users={followers}
        isLoading={isFollowersLoading}
      />

      <FollowUsersDialog
        open={isFollowingDialogOpen}
        onOpenChange={setIsFollowingDialogOpen}
        title="Following"
        users={following}
        isLoading={isFollowingLoading}
      />

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
                        min={0}
                        max={7}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={settingsForm.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Asia/Manila"
                        autoCapitalize="none"
                      />
                    </FormControl>
                    <FormMessage />
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
                  {updateSettingsMutation.isPending
                    ? "Saving..."
                    : "Save Settings"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
