"use client";

import BackButton from "@/components/BackButton";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { ILog } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DumbbellIcon,
  EditIcon,
  Trash2Icon
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface LogsResponse {
  success: boolean;
  data: ILog[];
  pagination: PaginationInfo | null;
}

const fetchLogs = async (page: number = 1, limit: number = 10) => {
  return api.get<LogsResponse>(
    `/api/logs?page=${page}&limit=${limit}&sort_by=workout_date&sort_order=desc`
  );
};

const deleteLog = async (logId: string) => {
  return api.delete(`/api/logs/${logId}`);
};

export default function LogsArchivePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [logToDelete, setLogToDelete] = useState<ILog | null>(null);
  const [isDateRangeDialogOpen, setIsDateRangeDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 9),
    to: new Date(),
  });
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) : 1;
  });
  const [limit, setLimit] = useState(10);

  const {
    data: logsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["logs", page, limit],
    queryFn: () => fetchLogs(page, limit),
  });

  const logs = useMemo(() => logsResponse?.data || [], [logsResponse]);
  const pagination = logsResponse?.pagination || null;

  const groupedLogsByDate = useMemo(() => {
    const grouped = new Map<string, ILog[]>();

    logs.forEach((log) => {
      const dateKey = format(new Date(log.workoutDate), "yyyy-MM-dd");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)?.push(log);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, logs]) => ({ date, logs }));
  }, [logs]);


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

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`/logs/archive?page=${newPage}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-6xl mx-auto">
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

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <PageHeader
            title="Logs Archive"
            subtitle="View and manage your workout logs 📚"
          />

        </div>

        {logs.length === 0 ? (
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
          <>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Items per page:
                </span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(parseInt(value, 10));
                    setPage(1);
                    router.push("/logs/archive?page=1", { scroll: false });
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {pagination && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} (
                    {pagination.total} total)
                  </span>
                </div>
              )}
            </div>

            <Accordion type="multiple" className="space-y-4">
              {groupedLogsByDate.map((group, groupIndex: number) => (
                <motion.div
                  key={group.date}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.05 }}
                >
                  <AccordionItem
                    value={group.date}
                    className="border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 text-left w-full">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <CalendarIcon className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">
                            {format(new Date(group.date), "EEEE, MMMM d, yyyy")}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {group.logs.length} exercise
                            {group.logs.length !== 1 ? "s" : ""} logged
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="space-y-4 pt-2">
                        {group.logs.map((log: ILog) => (
                          <Card
                            key={log.id}
                            className="bg-background/50 border-border/50"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-1">
                                  <CardTitle className="flex items-center gap-2 text-lg">
                                    <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                      <DumbbellIcon className="h-4 w-4 text-blue-500" />
                                    </div>
                                    {log.exerciseId?.name || "Unknown Exercise"}
                                  </CardTitle>
                                  <CardDescription className="flex flex-wrap items-center gap-3 text-sm">
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
                                  {log.sets.map((set, idx: number) => (
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
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!pagination.hasPrevPage}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  )
                    .filter((p) => {
                      if (pagination.totalPages <= 7) return true;
                      return (
                        p === 1 ||
                        p === pagination.totalPages ||
                        (p >= page - 1 && p <= page + 1)
                      );
                    })
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && arr[idx - 1] !== p - 1;
                      return (
                        <div key={p} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          )}
                          <Button
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            className="w-10"
                            onClick={() => handlePageChange(p)}
                          >
                            {p}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
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
