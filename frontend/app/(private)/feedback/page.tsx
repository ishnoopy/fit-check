"use client";

import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

type FeedbackCategory = "general" | "bug" | "feature";

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");

  const submitFeedbackMutation = useMutation({
    mutationFn: (payload: { category: FeedbackCategory; message: string }) =>
      api.post("/api/feedbacks", payload),
    onSuccess: () => {
      setMessage("");
      setCategory("general");
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
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton href="/dashboard" />
        </div>

        <Card className="border-border/70 bg-card/70">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Feedback</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tell us what is working and what we can improve.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Type</Label>
                <Select
                  value={category}
                  onValueChange={(value: FeedbackCategory) => setCategory(value)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select feedback type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your feedback..."
                  className="min-h-32 resize-y"
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
                className="w-full"
                disabled={submitFeedbackMutation.isPending}
              >
                {submitFeedbackMutation.isPending
                  ? "Submitting..."
                  : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
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
      </div>
    </div>
  );
}
