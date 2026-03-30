"use client";

import { FollowListUser, FollowUsersDialog } from "@/components/FollowUsersDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3x3, UserIcon } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PublicProfile {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  fitnessGoal?: string;
  activityLevel?: string;
  age?: number;
  weight?: number;
  height?: number;
  isPioneer?: boolean;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
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

const getPublicProfile = (username: string) =>
  api.get<{ data: PublicProfile }>(`/api/users/${username}/profile`);

const getPublicPosts = (username: string) =>
  api.get<{ data: ProfilePost[] }>(`/api/posts/users/${username}`);

const getFollowers = (username: string) =>
  api.get<{ data: FollowListUser[] }>(`/api/users/${username}/followers`);

const getFollowing = (username: string) =>
  api.get<{ data: FollowListUser[] }>(`/api/users/${username}/following`);

const followUser = (username: string) => api.post(`/api/users/${username}/follow`);
const unfollowUser = (username: string) =>
  api.delete(`/api/users/${username}/follow`);

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = (params?.username || "").toLowerCase();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isFollowersDialogOpen, setIsFollowersDialogOpen] = useState(false);
  const [isFollowingDialogOpen, setIsFollowingDialogOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => getPublicProfile(username),
    enabled: Boolean(username),
    select: (data) => data.data,
    retry: false,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["public-posts", username],
    queryFn: () => getPublicPosts(username),
    enabled: Boolean(username),
    select: (data) => data.data || [],
    retry: false,
  });

  const { data: followers = [], isLoading: isFollowersLoading } = useQuery({
    queryKey: ["followers", username],
    queryFn: () => getFollowers(username),
    enabled: Boolean(username) && isFollowersDialogOpen,
    select: (data) => data.data,
  });

  const { data: following = [], isLoading: isFollowingLoading } = useQuery({
    queryKey: ["following", username],
    queryFn: () => getFollowing(username),
    enabled: Boolean(username) && isFollowingDialogOpen,
    select: (data) => data.data,
  });

  useEffect(() => {
    if (profile?.isOwnProfile) {
      router.replace("/profile");
    }
  }, [profile?.isOwnProfile, router]);

  const followMutation = useMutation({
    mutationFn: () =>
      profile?.isFollowing ? unfollowUser(username) : followUser(username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-profile", username] });
      queryClient.invalidateQueries({ queryKey: ["followers", username] });
      queryClient.invalidateQueries({ queryKey: ["following", username] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update follow state");
    },
  });

  const formatLabel = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (isLoading || !profile) {
    return <div className="p-6 text-sm text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="p-6 border-b">
          <div className="flex items-start gap-8 md:gap-16">
            <div className="h-20 w-20 md:h-32 md:w-32 rounded-(--radius) bg-primary p-0.5">
              <div className="h-full w-full rounded-(--radius) bg-background p-1">
                {profile.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt={`${profile.username} avatar`}
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

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <h1 className="text-xl font-light">{profile.username}</h1>
                <Button
                  variant={profile.isFollowing ? "secondary" : "default"}
                  size="sm"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                >
                  {followMutation.isPending
                    ? "Updating..."
                    : profile.isFollowing
                      ? "Following"
                      : "Follow"}
                </Button>
              </div>

              <div className="flex gap-8 mb-4">
                <div className="text-center md:text-left">
                  <span className="font-semibold">{profile.postsCount}</span>{" "}
                  <span className="text-muted-foreground">posts</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFollowersDialogOpen(true)}
                  className="text-center md:text-left cursor-pointer"
                >
                  <span className="font-semibold">{profile.followersCount}</span>{" "}
                  <span className="text-muted-foreground">followers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFollowingDialogOpen(true)}
                  className="text-center md:text-left cursor-pointer"
                >
                  <span className="font-semibold">{profile.followingCount}</span>{" "}
                  <span className="text-muted-foreground">following</span>
                </button>
              </div>

              <div className="space-y-1">
                <p className="font-semibold">
                  {profile.firstName} {profile.lastName}
                </p>
                {profile.fitnessGoal && (
                  <p className="text-sm">
                    {formatLabel(profile.fitnessGoal)} •{" "}
                    {profile.activityLevel && formatLabel(profile.activityLevel)}
                  </p>
                )}
                {(profile.age || profile.weight || profile.height) && (
                  <p className="text-sm text-muted-foreground">
                    {profile.age && `${profile.age}yo`}
                    {profile.weight && ` • ${profile.weight}kg`}
                    {profile.height && ` • ${profile.height}cm`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

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
            <div className="p-1">
              {posts.length === 0 ? (
                <div className="py-16 px-4 text-center text-muted-foreground">
                  No posts yet.
                </div>
              ) : (
                <div className="space-y-4 p-2">
                  {posts.map((post) => (
                    <article
                      key={post.id}
                      className="rounded-[1.25rem] border border-border/70 bg-background/95 overflow-hidden"
                    >
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
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {post.text}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(post.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

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
    </div>
  );
}
