"use client";

import { cn } from "@/lib/utils";
import { Pause, Play, Square, Timer } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";
import { type PointerEvent, useEffect, useRef, useState } from "react";

const PILL_WIDTH_ESTIMATE = 280;
const PILL_HEIGHT_ESTIMATE = 56;
const EDGE_GAP = 16;

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
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const pillRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      if (!position) {
        return;
      }

      const rect = pillRef.current?.getBoundingClientRect();
      const width = rect?.width ?? PILL_WIDTH_ESTIMATE;
      const height = rect?.height ?? PILL_HEIGHT_ESTIMATE;
      const maxX = Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP);
      const maxY = Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP);

      setPosition({
        x: Math.min(Math.max(position.x, EDGE_GAP), maxX),
        y: Math.min(Math.max(position.y, EDGE_GAP), maxY),
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [position]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    draggingRef.current = true;
    const rect = pillRef.current?.getBoundingClientRect();
    const currentX =
      rect?.left ??
      position?.x ??
      Math.max(EDGE_GAP, window.innerWidth - PILL_WIDTH_ESTIMATE - EDGE_GAP);
    const currentY = rect?.top ?? position?.y ?? EDGE_GAP;
    dragOffsetRef.current = {
      x: event.clientX - currentX,
      y: event.clientY - currentY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) {
      return;
    }

    const rect = pillRef.current?.getBoundingClientRect();
    const width = rect?.width ?? PILL_WIDTH_ESTIMATE;
    const height = rect?.height ?? PILL_HEIGHT_ESTIMATE;
    const maxX = Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP);
    const maxY = Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP);
    const nextX = event.clientX - dragOffsetRef.current.x;
    const nextY = event.clientY - dragOffsetRef.current.y;

    setPosition({
      x: Math.min(Math.max(nextX, EDGE_GAP), maxX),
      y: Math.min(Math.max(nextY, EDGE_GAP), maxY),
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!showTimerPill) {
    return null;
  }

  return (
    <div
      ref={pillRef}
      className="fixed z-50 animate-in slide-in-from-top-2 duration-300 select-none touch-none"
      style={
        position
          ? { left: position.x, top: position.y }
          : { right: EDGE_GAP, top: EDGE_GAP }
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-full border-2 shadow-lg",
          isTimerRunning
            ? "bg-sidebar border-sidebar-primary text-sidebar-foreground"
            : "bg-sidebar border-sidebar-border text-sidebar-foreground/70",
        )}
      >
        <Timer className="h-4 w-4 shrink-0 text-sidebar-primary" />
        <div className="flex flex-col items-start min-w-[80px]">
          <span className="text-base font-mono font-bold tabular-nums text-sidebar-primary">
            {countdownFormatted}
          </span>
          {timerExerciseName && (
            <span className="text-[10px] leading-tight text-sidebar-foreground/60 truncate max-w-[120px]">
              {timerExerciseName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isTimerRunning ? (
            <button
              onClick={pauseRestTime}
              className="h-7 w-7 shrink-0 hover:bg-sidebar-primary/20 rounded-full flex items-center justify-center cursor-pointer transition-colors text-sidebar-primary"
              aria-label="Pause timer"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={resumeRestTime}
              className="h-7 w-7 shrink-0 hover:bg-sidebar-primary/20 rounded-full flex items-center justify-center cursor-pointer transition-colors text-sidebar-primary"
              aria-label="Resume timer"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={stopRestTime}
            className="h-7 w-7 shrink-0 hover:bg-destructive/15 rounded-full flex items-center justify-center cursor-pointer transition-colors text-destructive"
            aria-label="Stop timer"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
