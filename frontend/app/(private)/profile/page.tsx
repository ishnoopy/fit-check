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
import { api } from "@/lib/api";
import { formatPostTime } from "@/lib/utils";
import { IUser } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3x3, HeartIcon, Settings2, UserIcon } from "lucide-react";
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
  heartCount?: number;
  isHeartedByMe?: boolean;
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
  const [selectedPost, setSelectedPost] = useState<ProfilePost | null>(null);
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
    <div className="min-h-screen pb-24 bg-background">
      <div className="mx-auto max-w-3xl">
        <section className="border-b border-border/70 px-4 pb-5 pt-5 sm:px-6 sm:pt-7">
          <div className="flex items-start gap-4 sm:gap-8">
            <div className="relative shrink-0">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border border-border bg-muted/40 overflow-hidden flex items-center justify-center">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt="Profile"
                    width={112}
                    height={112}
                    className="h-full w-full rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <UserIcon className="h-9 w-9 text-muted-foreground" />
                )}
              </div>

              <button
                type="button"
                className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full border border-background bg-primary text-primary-foreground text-[11px] font-semibold cursor-pointer transition-transform hover:scale-105 active:scale-95"
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

            <div className="flex-1 min-w-0 pt-1">
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-base sm:text-lg font-semibold leading-none">{stats.posts}</p>
                  <p className="text-xs text-muted-foreground mt-1">posts</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFollowersDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <p className="text-base sm:text-lg font-semibold leading-none">{stats.followers}</p>
                  <p className="text-xs text-muted-foreground mt-1">followers</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFollowingDialogOpen(true)}
                  className="cursor-pointer"
                >
                  <p className="text-base sm:text-lg font-semibold leading-none">{stats.following}</p>
                  <p className="text-xs text-muted-foreground mt-1">following</p>
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <h1 className="truncate text-base sm:text-lg font-semibold">
                  @{user?.username || "fitcheck_user"}
                </h1>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 flex-1"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  Edit profile
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setIsSettingsDialogOpen(true)}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1 text-sm">
            {Boolean(user?.firstName || user?.lastName) && (
              <p className="font-semibold">
                {[user?.firstName, user?.lastName].filter(Boolean).join(" ")}
              </p>
            )}
            {user?.fitnessGoal && (
              <p className="text-foreground/90">
                {formatLabel(user.fitnessGoal)}
                {user.activityLevel ? ` • ${formatLabel(user.activityLevel)}` : ""}
              </p>
            )}
            {(user?.age || user?.weight || user?.height) && (
              <p className="text-muted-foreground">
                {user?.age && `${user.age}y`}
                {user?.weight && ` • ${user.weight}kg`}
                {user?.height && ` • ${user.height}cm`}
              </p>
            )}
          </div>
        </section>

        <section aria-label="Posts" className="pt-2">
          <div className="flex items-center justify-center border-b border-border/70 pb-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-foreground">
              <Grid3x3 className="h-4 w-4" />
              POSTS
            </div>
          </div>

          {myPosts.length === 0 ? (
            <div className="px-4 py-14 text-center text-sm text-muted-foreground">
              No posts yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 sm:gap-1 p-0.5 sm:p-1">
              {myPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setSelectedPost(post)}
                  className="relative aspect-square overflow-hidden bg-muted/40 cursor-pointer text-left transition-transform duration-150 hover:scale-[0.99] active:scale-[0.985]"
                >
                  {post.media?.mimeType.startsWith("video/") ? (
                    <video src={post.media.url} className="h-full w-full object-cover" />
                  ) : post.media?.url ? (
                    <Image
                      src={post.media.url}
                      alt={post.media.fileName || "Post media"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-3 text-center">
                      <p className="line-clamp-4 text-xs text-foreground/85 whitespace-pre-wrap break-words">
                        {post.text}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(selectedPost)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPost(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
          {selectedPost && (
            <article className="grid md:grid-cols-[minmax(0,1fr)_19rem] bg-background">
              <div className="relative bg-muted/25 min-h-[18rem] md:min-h-[30rem] flex items-center justify-center">
                {selectedPost.media?.mimeType.startsWith("video/") ? (
                  <video
                    src={selectedPost.media.url}
                    controls
                    className="h-full w-full max-h-[70vh] object-contain bg-black/10"
                  />
                ) : selectedPost.media?.url ? (
                  <div className="relative h-full w-full min-h-[18rem] md:min-h-[30rem]">
                    <Image
                      src={selectedPost.media.url}
                      alt={selectedPost.media.fileName || "Post media"}
                      fill
                      className="object-contain md:object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center p-8">
                    <p className="max-w-md text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {selectedPost.text}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t md:border-t-0 md:border-l border-border/70 p-4 md:p-5 flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold">
                    @{user?.username || "fitcheck_user"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPostTime(selectedPost.createdAt)}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 text-sm">
                  <HeartIcon
                    className={`h-4 w-4 ${selectedPost.isHeartedByMe ? "fill-current text-red-500" : "text-foreground"}`}
                  />
                  <span className="font-medium">{selectedPost.heartCount ?? 0}</span>
                  <span className="text-muted-foreground">
                    {(selectedPost.heartCount ?? 0) === 1 ? "heart" : "hearts"}
                  </span>
                </div>

                {selectedPost.text ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {selectedPost.text}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No caption.</p>
                )}
              </div>
            </article>
          )}
        </DialogContent>
      </Dialog>

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
