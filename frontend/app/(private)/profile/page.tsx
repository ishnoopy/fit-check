"use client";

import { Button } from "@/components/ui/button";
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
import { IUser } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Grid3x3, Settings2, Upload, UserIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  createdAt: string;
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

  if (values.password && values.password !== "") {
    transformedValues.password = values.password;
  }

  return api.put("/api/auth/complete-profile", transformedValues);
};

const getSettings = () => api.get<{ data: Setting }>("/api/settings");
const updateSettings = (values: SettingsFormValues) =>
  api.put("/api/settings", { settings: values });

const uploadImage = async (file: File) => {
  // 1. Generate presigned URL
  const data = await api.post<{
    data: { url: string; fields: Record<string, string>; key: string };
  }>("/api/upload/presign", {
    fileName: file.name,
    fileType: file.type,
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
  return await api.post("/api/upload/files", {
    s3Key: key,
    mimeType: file.type,
    fileName: file.name,
    fileSize: file.size,
  });
};

const getGalleryImages = () =>
  api.get<{ data: GalleryImage[] }>("/api/gallery");

const deleteGalleryImage = (imageId: string) =>
  api.delete(`/api/gallery/${imageId}`);

export default function ProfilePage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGoogleUser = user?.authProvider === "google";

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    retry: false,
    select: (data) => data.data,
  });

  const { data: galleryImages = [] } = useQuery({
    queryKey: ["gallery"],
    queryFn: getGalleryImages,
    retry: false,
    select: (data) => data.data || [],
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
  }, [user]);

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

  const uploadImageMutation = useMutation({
    mutationFn: uploadImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      toast.success("Image uploaded successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: deleteGalleryImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      toast.success("Image deleted successfully");
      setSelectedImage(null);
      setIsDeleteConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete image",
      );
    },
  });

  const handleProfileSubmit = (values: ProfileFormValues) => {
    updateProfileMutation.mutate(values);
  };

  const handleSettingsSubmit = (values: SettingsFormValues) => {
    updateSettingsMutation.mutate(values);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImageMutation.mutate(file);
    }
  };

  const calculateStats = () => {
    const posts = galleryImages.length;
    return { posts };
  };

  const stats = calculateStats();

  const formatLabel = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="p-6 max-w-2xl mx-auto">
        {/* Instagram-style Header */}
        <div className="p-6 border-b">
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
                      src="/psyduck.gif"
                      alt="Pioneer Badge"
                      width={32}
                      height={32}
                      className="h-8 w-8 md:h-10 md:w-10"
                      title="Pioneer User"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-light">
                    {user?.firstName?.toLowerCase()}
                    {user?.lastName?.toLowerCase()}
                  </h1>
                  {user?.isPioneer && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-(--radius) text-xs font-medium bg-primary/10 text-primary border border-primary/20 shadow-xs font-mono tracking-tight">
                      &lt;/&gt;
                    </span>
                  )}
                </div>
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

              {/* Stats */}
              <div className="flex gap-8 mb-4">
                <div className="text-center md:text-left">
                  <span className="font-semibold">{stats.posts}</span>{" "}
                  <span className="text-muted-foreground">posts</span>
                </div>
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

        {/* Tabs */}
        <Tabs defaultValue="posts" className="w-full">
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
            {/* Gallery Grid */}
            <div className="p-1">
              {galleryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="rounded-(--radius) border-2 border-border p-6 mb-4">
                    <Camera className="h-12 w-12" />
                  </div>
                  <h2 className="text-2xl font-light mb-2">Share Photos</h2>
                  <p className="text-muted-foreground mb-6 text-center max-w-sm">
                    When you share photos, they will appear on your profile.
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="link"
                    className="text-primary hover:text-primary/80"
                  >
                    Share your first photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {/* Upload Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors group"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* Gallery Images */}
                  {galleryImages.map((image) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImage(image)}
                      className="aspect-square relative overflow-hidden group"
                    >
                      <Image
                        src={image.url}
                        alt={image.caption || "Gallery image"}
                        fill
                        className="object-cover"
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog
        open={selectedImage !== null}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent
          className="max-w-4xl p-0"
          showCloseButton={true}
          onOverlayClick={() => setSelectedImage(null)}
        >
          <DialogHeader>
            <DialogTitle></DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="relative">
              <div className="relative w-full aspect-square">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.caption || "Gallery image"}
                  fill
                  className="object-contain"
                />
              </div>

              <div className="p-4 border-t flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedImage.createdAt).toLocaleDateString()}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={deleteImageMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                selectedImage && deleteImageMutation.mutate(selectedImage.id)
              }
              disabled={deleteImageMutation.isPending}
            >
              {deleteImageMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
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
                              : Number(e.target.value),
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

              <FormField
                control={settingsForm.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        value={field.value ?? ""}
                        readOnly
                        placeholder="Auto-detected"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Your timezone is automatically detected for accurate
                      workout tracking
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
