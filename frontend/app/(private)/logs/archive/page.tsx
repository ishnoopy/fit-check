"use client";

import BackButton from "@/components/BackButton";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { ILog } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  ClockIcon,
  DumbbellIcon,
  EditIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

const fetchLogs = async () => {
  return api.get<{ data: ILog[] }>("/api/logs");
};

const deleteLog = async (logId: string) => {
  return api.delete(`/api/logs/${logId}`);
};

const fetchLogsByQuery = async (query: string) => {
  return api.get<{ data: ILog[] | string }>(`/api/logs?${query}`);
};

export default function LogsArchivePage() {
  const queryClient = useQueryClient();
  const [logToDelete, setLogToDelete] = useState<ILog | null>(null);
  const [isDateRangeDialogOpen, setIsDateRangeDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: (() => {
      const today = new Date();
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(today.getDate() - 9);
      return tenDaysAgo;
    })(),
    to: new Date(),
  });
  const router = useRouter();
  const {
    data: logs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["logs"],
    queryFn: fetchLogs,
    select: (data) => data.data,
  });

  // Build query string with date range
  const buildQueryString = () => {
    if (!dateRange?.from || !dateRange?.to) {
      return "llm_message=true";
    }
    const startDate = new Date(dateRange.from);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.to);
    endDate.setUTCHours(23, 59, 59, 999);
    return `llm_message=true&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`;
  };

  const llmMessageQuery = useQuery({
    queryKey: ["llmMessage"],
    queryFn: () => fetchLogsByQuery(buildQueryString()),
    enabled: !!dateRange?.from && !!dateRange?.to,
  });

  const deleteLogMutation = useMutation({
    mutationFn: deleteLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success("Log deleted successfully");
      setLogToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Failed to delete log", error);
      toast.error("Failed to delete log. Please try again.");
    },
  });

  const handleDeleteLog = () => {
    if (logToDelete) {
      deleteLogMutation.mutate(logToDelete.id);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-4xl mx-auto">
          <PageHeader
            title="Logs Archive"
            subtitle="View and manage your workout logs 📚"
          />
          <EmptyState
            icon={DumbbellIcon}
            title="Failed to load logs"
            description="An error occurred while fetching your logs."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <BackButton href="/log" />

        <div className="flex items-start justify-between gap-3">
          <PageHeader
            title="Logs Archive"
            subtitle="View and manage your workout logs 📚"
          />

          {logs && logs.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsDateRangeDialogOpen(true)}
                >
                  <SparklesIcon className="h-4 w-4" />
                  Generate LLM Message
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs" side="bottom">
                <p>
                  Generate AI-powered workout analysis message for selected date
                  range and feed to AI.
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {logs && logs.length === 0 ? (
          <EmptyState
            icon={DumbbellIcon}
            title="No logs yet"
            description="Start logging your workouts to see them here."
            action={{
              label: "Log Workout",
              onClick: () => {
                router.push("/log");
              },
            }}
          />
        ) : (
          <div className="space-y-4">
            {logs &&
              logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="flex items-center gap-2 text-xl">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                              <DumbbellIcon className="h-4 w-4 text-blue-500" />
                            </div>
                            {log.exerciseId?.name || "Unknown Exercise"}
                          </CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {format(
                                new Date(log.workoutDate),
                                "MMMM d, yyyy"
                              )}
                            </span>
                            {log.durationMinutes && (
                              <span className="flex items-center gap-1">
                                <ClockIcon className="h-3.5 w-3.5" />
                                {log.durationMinutes} min
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            asChild
                          >
                            <Link href={`/logs/${log.id}/edit`}>
                              <EditIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                            onClick={() => setLogToDelete(log)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Sets
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {log.sets.map((set, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-lg p-2.5"
                            >
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-linear-to-br from-blue-500/20 to-purple-500/20 text-foreground font-bold text-xs shrink-0 border border-border/30">
                                {set.setNumber}
                              </div>
                              <span className="text-sm font-medium">
                                {set.reps} × {set.weight}kg
                              </span>
                              {set.notes && (
                                <span className="text-xs text-muted-foreground truncate">
                                  ({set.notes})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {log.notes && (
                        <div className="space-y-1 pt-2 border-t">
                          <p className="text-sm font-medium text-muted-foreground">
                            Notes
                          </p>
                          <p className="text-sm">{log.notes}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2 text-xs text-muted-foreground">
                        {log.workoutId?.title && (
                          <span className="px-2 py-1 bg-muted/50 rounded-md">
                            Workout: {log.workoutId.title}
                          </span>
                        )}
                        {log.planId?.title && (
                          <span className="px-2 py-1 bg-muted/50 rounded-md">
                            Plan: {log.planId?.title}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </div>
        )}
      </div>

      {/* Date Range Selection Dialog */}
      <Dialog
        open={isDateRangeDialogOpen}
        onOpenChange={setIsDateRangeDialogOpen}
      >
        <DialogContent className="w-full max-w-md sm:max-w-[425px] mx-auto">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
            <DialogDescription>
              Choose the date range for your workout analysis
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={1}
              className="rounded-md border"
            />
          </div>
          {dateRange?.from && dateRange?.to && (
            <div className="text-sm text-muted-foreground px-4 pb-2">
              Selected: {format(dateRange.from, "MMM d, yyyy")} -{" "}
              {format(dateRange.to, "MMM d, yyyy")}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDateRangeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (dateRange?.from && dateRange?.to) {
                  setIsDateRangeDialogOpen(false);

                  try {
                    const result = await llmMessageQuery.refetch();
                    const message =
                      typeof result.data?.data === "string"
                        ? result.data.data
                        : null;
                    if (message) {
                      navigator.clipboard.writeText(message);
                      toast.success("LLM message copied to clipboard");
                    } else {
                      toast.error("Failed to generate message");
                    }
                  } catch {
                    toast.error("Failed to generate message");
                  }
                } else {
                  toast.error("Please select a date range");
                }
              }}
              disabled={
                !dateRange?.from || !dateRange?.to || llmMessageQuery.isLoading
              }
            >
              {llmMessageQuery.isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Generate & Copy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!logToDelete} onOpenChange={() => setLogToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Log</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workout log? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {logToDelete && (
            <div className="rounded-lg border border-border/50 p-4 space-y-2">
              <p className="font-semibold">
                {logToDelete.exerciseId?.name || "Unknown Exercise"}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(logToDelete.workoutDate), "MMMM d, yyyy")}
              </p>
              <p className="text-sm">
                {logToDelete.sets.length} set
                {logToDelete.sets.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogToDelete(null)}
              disabled={deleteLogMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteLog}
              disabled={deleteLogMutation.isPending}
            >
              {deleteLogMutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
