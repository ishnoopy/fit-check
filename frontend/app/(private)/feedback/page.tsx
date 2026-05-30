"use client";

import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, Coffee, MessageSquareText, Send, Sparkles, TimerReset } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../providers";

type FeedbackCategory = "general" | "bug" | "feature";

interface Feedback {
  id: string;
  userId: string;
  category: FeedbackCategory;
  message: string;
  createdAt: string;
}

const categoryOptions: Array<{
  value: FeedbackCategory;
  label: string;
  hint: string;
  accentClass: string;
}> = [
    {
      value: "general",
      label: "General",
      hint: "Overall thoughts",
      accentClass:
        "border-primary bg-primary text-primary-foreground",
    },
    {
      value: "bug",
      label: "Bug Report",
      hint: "Something is broken",
      accentClass:
        "border-destructive bg-destructive text-destructive-foreground",
    },
    {
      value: "feature",
      label: "Feature Request",
      hint: "New idea or improvement",
      accentClass:
        "border-chart-4 bg-chart-4 text-secondary-foreground",
    },
  ];

const categoryMeta = {
  general: {
    Icon: MessageSquareText,
    accentClass: categoryOptions[0].accentClass,
  },
  bug: {
    Icon: Bug,
    accentClass: categoryOptions[1].accentClass,
  },
  feature: {
    Icon: Sparkles,
    accentClass: categoryOptions[2].accentClass,
  },
} as const;

export default function FeedbackPage() {
  const { user } = useUser();
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: feedbackData, isLoading: isLoadingFeedback } = useQuery({
    queryKey: ["feedbacks"],
    queryFn: () => api.get<{ data: Feedback[] }>("/api/feedbacks"),
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: (payload: { category: FeedbackCategory; message: string }) =>
      api.post("/api/feedbacks", payload),
    onSuccess: () => {
      setMessage("");
      setCategory("general");
      queryClient.invalidateQueries({ queryKey: ["feedbacks"] });
      toast.success(
        "Thank you for your feedback. Your support and suggestions are deeply appreciated.",
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit feedback right now.",
      );
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitFeedbackMutation.mutate({
      category,
      message,
    });
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <BackButton href="/dashboard" />
        </div>

        <Card className="overflow-hidden border-border bg-card">
          <CardHeader className="relative space-y-2 pb-4">
            <div className="absolute inset-0 pointer-events-none" />
            <CardTitle className="relative text-3xl">Feedback Hub</CardTitle>
            <p className="relative text-sm font-medium text-muted-foreground">
              Tell us what works, what breaks, and what should come next.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {categoryOptions.map((option) => {
                    const isActive = option.value === category;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCategory(option.value)}
                        className={cn(
                          "rounded-[20px] border px-3 py-3 text-left transition-colors",
                          isActive
                            ? option.accentClass
                            : "border-border bg-card hover:bg-muted/50",
                        )}
                      >
                        <p className="text-sm font-black">{option.label}</p>
                        <p className={cn("text-xs font-medium", isActive ? "opacity-80" : "text-muted-foreground")}>{option.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share details so we can act on it quickly..."
                  className="min-h-40 resize-y"
                  minLength={10}
                  maxLength={1000}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/1000
                </p>
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={submitFeedbackMutation.isPending}
              >
                <Send className="h-4 w-4" />
                {submitFeedbackMutation.isPending
                  ? "Submitting..."
                  : "Submit feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl">Recent Feedback</CardTitle>
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-black text-muted-foreground">
                {feedbackData?.data?.length ?? 0} entries
              </span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {user?.isPioneer
                ? "Recent feedback from all users."
                : "Recent feedback entries sent from your account."}
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingFeedback ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <TimerReset className="h-4 w-4 animate-spin" />
                Loading feedback...
              </p>
            ) : feedbackData?.data?.length ? (
              <div className="space-y-3">
                {feedbackData.data.map((feedback) => (
                  <article
                    key={feedback.id}
                    className="space-y-3 rounded-[24px] border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide",
                          categoryMeta[feedback.category].accentClass,
                        )}
                      >
                        {(() => {
                          const Icon = categoryMeta[feedback.category].Icon;
                          return <Icon className="h-3.5 w-3.5" />;
                        })()}
                        {feedback.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(feedback.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {user?.isPioneer && (
                      <p className="text-xs text-muted-foreground">
                        User: {feedback.userId}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {feedback.message}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-[24px] border border-dashed border-border p-6 text-center text-sm font-medium text-muted-foreground">
                You have not submitted feedback yet.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground text-center">
          <p>
            Built by Aldrin Guasa. Visit{" "}
            <Link
              href="https://aldringuasa-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              my portfolio
            </Link>
            .
          </p>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-black text-muted-foreground">
            <Coffee className="h-3.5 w-3.5" />
            Show some love • Buy me a coffee • GCash: 09455739860
          </span>
        </div>
      </div>
    </div>
  );
}
