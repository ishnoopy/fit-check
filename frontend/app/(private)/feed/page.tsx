"use client";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatPostTime } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HeartIcon,
  ImagePlusIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  VideoIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type FeedTab = "explore" | "following";

interface FeedItem {
  id: string;
  text: string;
  createdAt?: string;
  author?: {
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  media?: {
    id?: string;
    url: string;
    mimeType: string;
    mediaKind: "image" | "gif" | "video";
    fileName?: string;
  } | null;
  heartCount: number;
  isHeartedByMe: boolean;
}

interface FeedResponse {
  data: FeedItem[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

interface ToggleHeartResponse {
  data: {
    postId: string;
    isHearted: boolean;
    heartCount: number;
  };
}

interface SearchUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface SearchUsersResponse {
  data: SearchUser[];
}

const createPost = (payload: { text: string; mediaUploadId?: string }) =>
  api.post("/api/posts", payload);

const getFeed = (tab: FeedTab, page: number, limit: number) =>
  api.get<FeedResponse>(`/api/posts/feed?tab=${tab}&page=${page}&limit=${limit}`);

const toggleHeart = (postId: string) => api.patch(`/api/posts/${postId}/heart`);

const getUserSearch = (query: string, limit = 8) =>
  api.get<SearchUsersResponse>(
    `/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );

async function uploadMedia(file: File) {
  const presignRes = await api.post<{
    data: { url: string; fields: Record<string, string>; key: string };
  }>("/api/upload/presign", {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  const { url, fields, key } = presignRes.data;
  const formData = new FormData();

  for (const [fieldKey, value] of Object.entries(fields)) {
    formData.append(fieldKey, value);
  }
  formData.append("file", file);

  const uploadRes = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload media");
  }

  const fileRecord = await api.post<{
    data: { id: string };
  }>("/api/upload/files", {
    s3Key: key,
    mimeType: file.type,
    fileName: file.name,
    fileSize: file.size,
  });

  return fileRecord.data.id;
}

export default function FeedPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FeedTab>("explore");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const page = 1;
  const limit = 20;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const { data: feedResponse, isLoading } = useQuery({
    queryKey: ["feed", tab, page],
    queryFn: () => getFeed(tab, page, limit),
    retry: false,
  });

  const {
    data: searchedUsers = [],
    isFetching: isSearchingUsers,
  } = useQuery({
    queryKey: ["feed-user-search", debouncedSearchTerm],
    queryFn: async () => {
      const response = await getUserSearch(debouncedSearchTerm, 8);
      return response.data;
    },
    enabled: debouncedSearchTerm.length >= 2,
    staleTime: 30_000,
    retry: false,
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const normalizedText = text.trim();
      if (!normalizedText) {
        throw new Error("Post text is required");
      }

      const mediaUploadId = file ? await uploadMedia(file) : undefined;
      return createPost({
        text: normalizedText,
        mediaUploadId,
      });
    },
    onSuccess: () => {
      setText("");
      setFile(null);
      setIsComposerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Post created");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create post");
    },
  });

  const heartMutation = useMutation({
    mutationFn: (postId: string) => toggleHeart(postId),
    onSuccess: (response: ToggleHeartResponse) => {
      const { postId, heartCount, isHearted } = response.data;
      const queries = queryClient.getQueriesData<FeedResponse>({
        queryKey: ["feed"],
      });

      for (const [queryKey, queryValue] of queries) {
        if (!queryValue) continue;
        queryClient.setQueryData<FeedResponse>(queryKey, {
          ...queryValue,
          data: queryValue.data.map((post) =>
            post.id === postId
              ? {
                ...post,
                heartCount,
                isHeartedByMe: isHearted,
              }
              : post,
          ),
        });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update heart");
    },
  });

  const feed = feedResponse?.data ?? [];
  const trimmedSearchTerm = searchTerm.trim();

  return (
    <div className="relative p-4 md:p-6 pb-28 max-w-2xl mx-auto space-y-4">
      <PageHeader title="FitCheck" className="justify-center" />

      <section className="space-y-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search users by username"
            className="h-11 rounded-xl border-border/80 bg-card pl-10"
            aria-label="Search users"
          />
        </div>

        {trimmedSearchTerm.length > 0 && (
          <div className="rounded-xl border border-border/70 bg-card/95 shadow-sm overflow-hidden">
            {trimmedSearchTerm.length < 2 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Type at least 2 characters to search users.
              </p>
            ) : isSearchingUsers ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Searching users...</p>
            ) : searchedUsers.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                No users found for: {trimmedSearchTerm}.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {searchedUsers.map((user) => (
                  <Link
                    key={user.id}
                    href={`/u/${user.username}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-border/80 bg-muted flex items-center justify-center shrink-0">
                      {user.avatar ? (
                        <Image
                          src={user.avatar}
                          alt={user.username}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none">@{user.username}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "FitCheck user"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as FeedTab);
        }}
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="explore">Explore</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading feed...</p>
          ) : feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            <div className="space-y-4">
              {feed.map((post) => {
                const authorUsername = post.author?.username;

                return (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-2xl border border-border/75 bg-card/95 shadow-sm"
                  >
                    <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3">
                      {authorUsername ? (
                        <Link
                          href={`/u/${authorUsername}`}
                          className="group flex items-center gap-3 min-w-0"
                        >
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-border/80 bg-muted flex items-center justify-center shrink-0">
                            {post.author?.avatar ? (
                              <Image
                                src={post.author.avatar}
                                alt={authorUsername}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <UserIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold group-hover:underline">
                              @{authorUsername}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[post.author?.firstName, post.author?.lastName]
                                .filter(Boolean)
                                .join(" ") || "FitCheck user"}
                            </p>
                          </div>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full border border-border/80 bg-muted" />
                          <p className="text-sm font-semibold">unknown_user</p>
                        </div>
                      )}

                      <p className="shrink-0 text-xs text-muted-foreground">
                        {formatPostTime(post.createdAt)}
                      </p>
                    </div>

                    {post.media?.mimeType.startsWith("video/") ? (
                      <video
                        src={post.media.url}
                        controls
                        className="w-full border-y border-border/60 bg-black/5"
                      />
                    ) : post.media?.url ? (
                      <div className="relative w-full aspect-square overflow-hidden border-y border-border/60">
                        <Image
                          src={post.media.url}
                          alt={post.media.fileName || "Post media"}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : null}

                    <div className="px-4 py-3 space-y-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {post.text}
                      </p>

                      <button
                        type="button"
                        onClick={() => heartMutation.mutate(post.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-border/80 px-3 py-1.5 text-sm transition-colors hover:bg-muted/40 cursor-pointer"
                      >
                        <HeartIcon
                          className={`h-4 w-4 ${post.isHeartedByMe ? "fill-current text-red-500" : ""}`}
                        />
                        <span className="font-medium">{post.heartCount}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <button
        type="button"
        onClick={() => setIsComposerOpen(true)}
        className="fixed bottom-24 right-5 md:right-8 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/35 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
        aria-label="Create post"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>
              Share a short update. Media is optional (max 5MB).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              placeholder="What did you train today?"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1000}
              className="min-h-28"
            />

            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              {file?.type.startsWith("video/") ? (
                <VideoIcon className="h-4 w-4" />
              ) : (
                <ImagePlusIcon className="h-4 w-4" />
              )}
              <span>{file ? file.name : "Attach image, GIF, or video (optional)"}</span>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsComposerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => createPostMutation.mutate()}
                disabled={createPostMutation.isPending || !text.trim()}
              >
                {createPostMutation.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
