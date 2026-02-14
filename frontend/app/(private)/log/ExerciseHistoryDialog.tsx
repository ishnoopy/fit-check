import ExerciseImage from "@/components/ExerciseImage";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, getRpeEmoji, getRpeLabel } from "@/lib/utils";
import { ILog } from "@/types";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronDown, ChevronLeft, ChevronRight, InfoIcon, TrendingDown, TrendingUp, Trophy, X } from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";

interface ExerciseHistoryDialogProps {
  exerciseName: string;
  restTime?: number;
  notes?: string;
  historyData?: ILog[];
  isLoading: boolean;
  userTimezone: string;
  exerciseDescription?: string;
  exerciseImages?: string[];
  exerciseUserId?: string | null;
}

export default function ExerciseHistoryDialog({
  exerciseName,
  restTime,
  notes,
  historyData,
  isLoading,
  userTimezone,
  exerciseDescription,
  exerciseImages,
  exerciseUserId,
}: ExerciseHistoryDialogProps) {
  const [exerciseInfoExpanded, setExerciseInfoExpanded] = useState(false);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(
    null,
  );
  const past3Logs = historyData?.slice(0, 3) || [];

  const progressionData = React.useMemo(() => {
    if (!historyData || historyData.length === 0) return null;

    const calculateVolume = (log: ILog): number => {
      if (!log.sets || log.sets.length === 0) return 0;
      return log.sets.reduce((total, set) => total + set.reps * set.weight, 0);
    };

    const calculateMaxWeight = (log: ILog): number => {
      if (!log.sets || log.sets.length === 0) return 0;
      return Math.max(...log.sets.map((set) => set.weight));
    };

    const calculateMaxReps = (log: ILog): number => {
      if (!log.sets || log.sets.length === 0) return 0;
      return Math.max(...log.sets.map((set) => set.reps));
    };

    const calculateAvgWeight = (log: ILog): number => {
      if (!log.sets || log.sets.length === 0) return 0;
      const totalWeight = log.sets.reduce((sum, set) => sum + set.weight, 0);
      return totalWeight / log.sets.length;
    };

    const sessions = historyData
      .map((log) => ({
        log,
        volume: calculateVolume(log),
        maxWeight: calculateMaxWeight(log),
        maxReps: calculateMaxReps(log),
        avgWeight: calculateAvgWeight(log),
        date: new Date(log.createdAt),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const latest = sessions[0];
    const previous = sessions[1];

    const bestVolume = Math.max(...sessions.map((s) => s.volume));
    const bestWeight = Math.max(...sessions.map((s) => s.maxWeight));
    const bestReps = Math.max(...sessions.map((s) => s.maxReps));

    const volumeChange =
      previous && latest
        ? ((latest.volume - previous.volume) / previous.volume) * 100
        : null;

    const weightChange =
      previous && latest
        ? ((latest.maxWeight - previous.maxWeight) / previous.maxWeight) * 100
        : null;

    const isVolumePR = latest.volume === bestVolume && sessions.length > 1;
    const isWeightPR = latest.maxWeight === bestWeight && sessions.length > 1;
    const isRepsPR = latest.maxReps === bestReps && sessions.length > 1;

    return {
      latest,
      previous,
      bestVolume,
      bestWeight,
      bestReps,
      volumeChange,
      weightChange,
      isVolumePR,
      isWeightPR,
      isRepsPR,
      totalSessions: sessions.length,
    };
  }, [historyData]);

  return (
    <DialogContent
      className="max-w-[90vw] sm:max-w-[500px] p-4 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
      showCloseButton={true}
      onInteractOutside={(e) => {
        e.stopPropagation();
      }}
      onPointerDownOutside={(e) => {
        e.stopPropagation();
      }}
      onEscapeKeyDown={(e) => {
        e.stopPropagation();
      }}
      onCloseClick={(e) => {
        e.stopPropagation();
      }}
      onOverlayClick={(e) => {
        e.stopPropagation();
      }}
    >
      <DialogHeader>
        <DialogTitle className="text-sm font-medium flex items-center gap-2">
          <InfoIcon className="h-4 w-4 text-muted-foreground" />
          {exerciseName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {restTime && `Rest time: ${restTime} seconds. `}
          {notes && `Notes: ${notes}`}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {(restTime || notes) && (
          <div className="space-y-2 pb-2 border-b">
            {restTime && (
              <div className="font-medium leading-tight">Rest: {restTime}s</div>
            )}
            {notes && (
              <div className="text-muted-foreground/90 leading-snug">
                {notes}
              </div>
            )}
          </div>
        )}

        {/* Exercise Info Accordion */}
        <div className="pb-2 border-b">
          <button
            onClick={(e) => {
              setExerciseInfoExpanded(!exerciseInfoExpanded);
              e.stopPropagation();
            }}
            className="w-full flex items-center justify-between py-2 text-left hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
          >
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Exercise Info
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                exerciseInfoExpanded && "rotate-180",
              )}
            />
          </button>
          {exerciseInfoExpanded && (
            <div className="pt-3 space-y-3">
              {exerciseDescription ||
                (exerciseImages &&
                  exerciseImages.length > 0 &&
                  !exerciseUserId) ? (
                <>
                  {exerciseDescription && (
                    <p className="text-xs text-muted-foreground/90 leading-relaxed">
                      {exerciseDescription}
                    </p>
                  )}
                  {exerciseImages &&
                    exerciseImages.length > 0 &&
                    !exerciseUserId && (
                      <div className="grid grid-cols-2 gap-2">
                        {exerciseImages.map((image, imgIndex) => (
                          <ExerciseImage
                            key={imgIndex}
                            src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${image}`}
                            alt={`${exerciseName} - ${imgIndex + 1}`}
                          />
                        ))}
                      </div>
                    )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic">
                  No description added
                </p>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading history...
          </div>
        ) : (
          <>
            {past3Logs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Past 3 Logs
                </h3>
                <div className="space-y-1">
                  {past3Logs.map((log: ILog, idx: number) => {
                    const logDate = formatInTimeZone(
                      new Date(log.createdAt),
                      userTimezone,
                      "MMM d",
                    );
                    return (
                      <div
                        key={log.id || idx}
                        className="flex items-start gap-2.5 py-2 px-2 border-b border-border/30 last:border-0 hover:bg-muted/20 rounded-md transition-colors"
                      >
                        <span className="text-muted-foreground font-medium text-[11px] min-w-14 pt-0.5">
                          {logDate}
                        </span>
                        <div className="flex flex-wrap gap-1.5 flex-1 items-center">
                          {log.sets?.map(
                            (
                              set: { reps: number; weight: number },
                              setIdx: number,
                            ) => (
                              <span
                                key={setIdx}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 border border-border/40 text-foreground font-semibold text-[10px]"
                              >
                                {set.reps}×{set.weight}kg
                              </span>
                            ),
                          )}
                        </div>
                        {log.rateOfPerceivedExertion && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-base leading-none">
                              {getRpeEmoji(log.rateOfPerceivedExertion)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {getRpeLabel(log.rateOfPerceivedExertion)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {progressionData && (
              <div className="space-y-3 pt-2 border-t">
                <h3 className="text-xs font-semibold text-foreground">
                  Progression
                </h3>
                <div className="space-y-2.5">
                  {/* Latest Session Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted/30 rounded-(--radius) border border-border/50">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        Volume
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">
                          {Math.round(progressionData.latest.volume)} kg
                        </span>
                        {progressionData.isVolumePR && (
                          <Trophy className="h-3 w-3 text-accent" />
                        )}
                        {progressionData.volumeChange !== null && (
                          <span
                            className={cn(
                              "text-[10px] font-medium flex items-center gap-0.5",
                              progressionData.volumeChange > 0
                                ? "text-accent"
                                : progressionData.volumeChange < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                            )}
                          >
                            {progressionData.volumeChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : progressionData.volumeChange < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            {progressionData.volumeChange > 0 ? "+" : ""}
                            {Math.round(progressionData.volumeChange)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-muted/30 rounded-(--radius) border border-border/50">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        Max Weight
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">
                          {progressionData.latest.maxWeight} kg
                        </span>
                        {progressionData.isWeightPR && (
                          <Trophy className="h-3 w-3 text-accent" />
                        )}
                        {progressionData.weightChange !== null && (
                          <span
                            className={cn(
                              "text-[10px] font-medium flex items-center gap-0.5",
                              progressionData.weightChange > 0
                                ? "text-accent"
                                : progressionData.weightChange < 0
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                            )}
                          >
                            {progressionData.weightChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : progressionData.weightChange < 0 ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : null}
                            {progressionData.weightChange > 0 ? "+" : ""}
                            {Math.round(progressionData.weightChange)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Personal Records */}
                  <div className="p-2 bg-muted/20 rounded-(--radius) border border-border/50">
                    <div className="text-[10px] text-muted-foreground mb-2">
                      Personal Records
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <div className="text-muted-foreground">Best Volume</div>
                        <div className="font-semibold text-xs">
                          {Math.round(progressionData.bestVolume)} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Best Weight</div>
                        <div className="font-semibold text-xs">
                          {progressionData.bestWeight} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Best Reps</div>
                        <div className="font-semibold text-xs">
                          {progressionData.bestReps} reps
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session Count */}
                  <div className="text-[10px] text-muted-foreground text-center pt-1">
                    {progressionData.totalSessions}{" "}
                    {progressionData.totalSessions === 1
                      ? "session"
                      : "sessions"}{" "}
                    tracked
                  </div>
                </div>
              </div>
            )}

            {!isLoading && past3Logs.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-xs">
                No history available for this exercise yet.
              </div>
            )}
          </>
        )}
      </div>

      {/* Expanded Image Dialog */}
      {expandedImageIndex !== null &&
        exerciseImages &&
        exerciseImages.length > 0 && (
          <div
            className="fixed inset-0 z-100 bg-background/95 flex items-center justify-center"
            onClick={() => setExpandedImageIndex(null)}
          >
            <button
              onClick={() => setExpandedImageIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-(--radius) bg-background border border-border hover:bg-muted transition-colors shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>

            {exerciseImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImageIndex(
                      expandedImageIndex === 0
                        ? exerciseImages.length - 1
                        : expandedImageIndex - 1,
                    );
                  }}
                  className="absolute left-4 z-10 p-2 rounded-(--radius) bg-background/70 border border-border hover:bg-muted transition-colors shadow-sm"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImageIndex(
                      (expandedImageIndex + 1) % exerciseImages.length,
                    );
                  }}
                  className="absolute right-4 z-10 p-2 rounded-(--radius) bg-background/70 border border-border hover:bg-muted transition-colors shadow-sm"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div
              className="relative w-full max-w-4xl h-[80vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exerciseImages[expandedImageIndex]}`}
                alt={`${exerciseName} - ${expandedImageIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>

            {exerciseImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted-foreground bg-background border border-border px-3 py-1.5 rounded-(--radius) shadow-sm">
                {expandedImageIndex + 1} / {exerciseImages.length}
              </div>
            )}
          </div>
        )}
    </DialogContent>
  );
}
