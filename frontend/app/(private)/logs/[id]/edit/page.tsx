"use client";

import BackButton from "@/components/BackButton";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Log } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  CheckIcon,
  DumbbellIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  sets: z.array(
    z.object({
      setNumber: z.number().min(1),
      reps: z.number().min(1),
      weight: z.number().min(0),
      notes: z.string().optional(),
    })
  ),
  workoutDate: z.date(),
  durationMinutes: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const fetchLog = async (
  logId: string
): Promise<{ success: boolean; data: Log }> => {
  const data = await api.get<{ data: Log[] }>(`/api/logs/query?_id=${logId}`);
  return { success: true, data: data.data[0] };
};

const updateLog = async ({
  logId,
  values,
}: {
  logId: string;
  values: FormValues;
}) => {
  return api.patch(`/api/logs/${logId}`, {
    ...values,
    workoutDate: values.workoutDate.toISOString(),
  });
};

export default function EditLogPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const logId = params.id as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sets: [],
      workoutDate: new Date(),
      durationMinutes: 0,
      notes: "",
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["log", logId],
    queryFn: () => fetchLog(logId),
    enabled: !!logId,
  });

  const log = data?.data;
  useEffect(() => {
    if (log) {
      form.reset({
        sets: log.sets || [],
        workoutDate: log.workoutDate ? new Date(log.workoutDate) : new Date(),
        durationMinutes: log.durationMinutes || 0,
        notes: log.notes || "",
      });
    }
  }, [log, form]);

  const updateLogMutation = useMutation({
    mutationFn: updateLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["log", logId] });
      toast.success("Log updated successfully");
      router.push("/logs/archive");
    },
    onError: (error: Error) => {
      console.error("Failed to update log", error);
      toast.error("Failed to update log. Please try again.");
    },
  });

  function onSubmit(values: FormValues) {
    if (!values.sets || values.sets.length === 0) {
      toast.error("At least one set is required");
      return;
    }
    updateLogMutation.mutate({ logId, values });
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !log) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
        <div className="p-6 max-w-2xl mx-auto">
          <BackButton href="/logs/archive" />
          <PageHeader
            title="Edit Log"
            subtitle="Log not found or failed to load"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 pb-24">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <BackButton href="/logs/archive" />
        <PageHeader
          title="Edit Log"
          subtitle={`Editing ${log.exerciseId?.name || "workout log"} ✏️`}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DumbbellIcon className="h-5 w-5 text-blue-500" />
                </div>
                {log.exerciseId?.name || "Unknown Exercise"}
              </CardTitle>
              <CardDescription>Update your workout details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="workoutDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Workout Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                field.value ? new Date(field.value) : undefined
                              }
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          Sets
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {field.value &&
                              Array.isArray(field.value) &&
                              field.value.length > 0 &&
                              field.value.map((set, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="flex gap-2 items-center bg-muted/30 border border-border/50 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-br from-blue-500/20 to-purple-500/20 text-foreground font-bold text-sm shrink-0 border border-border/30">
                                    {idx + 1}
                                  </div>
                                  <Input
                                    type="number"
                                    placeholder="Reps"
                                    value={set.reps || ""}
                                    onChange={(e) => {
                                      const sets = field.value?.slice() || [];
                                      sets[idx] = {
                                        ...sets[idx],
                                        setNumber: idx + 1,
                                        reps: Number(e.target.value),
                                      };
                                      field.onChange(sets);
                                    }}
                                    className="w-20"
                                  />
                                  <span className="text-muted-foreground">
                                    ×
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.5"
                                    placeholder="kg"
                                    value={set.weight || ""}
                                    onChange={(e) => {
                                      const sets = field.value?.slice() || [];
                                      sets[idx] = {
                                        ...sets[idx],
                                        weight: Number(e.target.value),
                                      };
                                      field.onChange(sets);
                                    }}
                                    className="w-20"
                                  />
                                  <Input
                                    placeholder="Notes"
                                    value={set.notes || ""}
                                    onChange={(e) => {
                                      const sets = field.value?.slice() || [];
                                      sets[idx] = {
                                        ...sets[idx],
                                        notes: e.target.value,
                                      };
                                      field.onChange(sets);
                                    }}
                                    className="flex-1 min-w-0"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => {
                                      const sets = field.value?.slice() || [];
                                      sets.splice(idx, 1);
                                      // Renumber remaining sets
                                      sets.forEach((s, i) => {
                                        s.setNumber = i + 1;
                                      });
                                      field.onChange(sets);
                                    }}
                                  >
                                    <XIcon className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              ))}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full border-dashed hover:border-solid hover:bg-primary/5 transition-all"
                              onClick={() => {
                                const currentSets = Array.isArray(field.value)
                                  ? field.value.slice()
                                  : [];
                                field.onChange([
                                  ...currentSets,
                                  {
                                    set_number: currentSets.length + 1,
                                    reps: 0,
                                    weight: 0,
                                    notes: "",
                                  },
                                ]);
                              }}
                            >
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Add Set
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            placeholder="30"
                            {...field}
                            value={field.value ? field.value.toString() : ""}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workout Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="How did the workout feel? Any observations?"
                            {...field}
                            rows={3}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={() => router.push("/logs/archive")}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateLogMutation.isPending}
                      size="lg"
                      className="flex-1 gap-2"
                    >
                      {updateLogMutation.isPending ? (
                        <>
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          Update Log
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
