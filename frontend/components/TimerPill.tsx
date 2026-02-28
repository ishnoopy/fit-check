"use client";

import { cn } from "@/lib/utils";
import { Pause, Play, Square, Timer } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";

export function TimerPill() {
  const {
    countdownFormatted,
    isTimerRunning,
    timerExerciseName,
    showTimerPill,
    pauseRestTime,
    resumeRestTime,
    stopRestTime,
  } = useTimer();

  if (!showTimerPill) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-full border shadow-lg backdrop-blur-sm",
          isTimerRunning
            ? "bg-primary/10 border-primary/30 text-primary"
            : "bg-muted/90 border-border text-muted-foreground",
        )}
      >
        <Timer className="h-4 w-4 shrink-0" />
        <div className="flex flex-col items-start min-w-[80px]">
          <span className="text-xs font-mono font-bold tabular-nums">
            {countdownFormatted}
          </span>
          {timerExerciseName && (
            <span className="text-[10px] leading-tight opacity-70 truncate max-w-[120px]">
              {timerExerciseName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isTimerRunning ? (
            <button
              onClick={pauseRestTime}
              className="h-7 w-7 shrink-0 hover:bg-primary/20 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Pause timer"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={resumeRestTime}
              className="h-7 w-7 shrink-0 hover:bg-primary/20 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Resume timer"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={stopRestTime}
            className="h-7 w-7 shrink-0 hover:bg-destructive/20 text-destructive rounded-full flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Stop timer"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
