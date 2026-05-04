"use client";

import { formatSecondsToMinutesSeconds } from "@/lib/utils";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface TimerContextType {
  countdown: number;
  countdownFormatted: string;
  isTimerRunning: boolean;
  timerExerciseId: string | null;
  timerExerciseName: string | null;
  showTimerPill: boolean;
  startRestTime: (exerciseId: string, exerciseName: string, restTime: number) => void;
  pauseRestTime: () => void;
  resumeRestTime: () => void;
  stopRestTime: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerEndTimeRef = useRef<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerExerciseId, setTimerExerciseId] = useState<string | null>(null);
  const [timerExerciseName, setTimerExerciseName] = useState<string | null>(null);
  const [showTimerPill, setShowTimerPill] = useState<boolean>(false);

  // Initialize audio element on mount
  useEffect(() => {
    audioRef.current = new Audio("/notif-sound.mp3");
  }, []);

  const clearTimerInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const completeRestTime = () => {
    clearTimerInterval();
    timerEndTimeRef.current = null;
    setIsTimerRunning(false);
    setCountdown(0);
    setTimerExerciseId(null);
    setTimerExerciseName(null);
    setShowTimerPill(false);

    if (audioRef.current) {
      audioRef.current.play();
    }
    toast.success("Rest time complete! 💪");
  };

  const syncCountdown = () => {
    if (timerEndTimeRef.current === null) {
      return;
    }

    const remainingSeconds = Math.max(
      0,
      Math.ceil((timerEndTimeRef.current - Date.now()) / 1000),
    );

    setCountdown(remainingSeconds);

    if (remainingSeconds <= 0) {
      completeRestTime();
    }
  };

  const startTicking = () => {
    clearTimerInterval();
    syncCountdown();

    if (timerEndTimeRef.current === null) {
      return;
    }

    intervalRef.current = setInterval(syncCountdown, 250);
  };

  const startRestTime = (exerciseId: string, exerciseName: string, restTime: number) => {
    // Prevent starting a new timer if one is already running
    if (isTimerRunning) {
      toast.error("A timer is already running");
      return;
    }

    if (restTime <= 0) {
      toast.error("No rest time set for this exercise");
      return;
    }

    clearTimerInterval();
    setTimerExerciseId(exerciseId);
    setTimerExerciseName(exerciseName);
    setCountdown(restTime);
    setIsTimerRunning(true);
    setShowTimerPill(true);
    timerEndTimeRef.current = Date.now() + restTime * 1000;
    startTicking();
  };

  const pauseRestTime = () => {
    if (timerEndTimeRef.current !== null) {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((timerEndTimeRef.current - Date.now()) / 1000),
      );
      setCountdown(remainingSeconds);
    }

    clearTimerInterval();
    timerEndTimeRef.current = null;
    setIsTimerRunning(false);
  };

  const resumeRestTime = () => {
    if (isTimerRunning || countdown <= 0) {
      return;
    }

    setIsTimerRunning(true);
    timerEndTimeRef.current = Date.now() + countdown * 1000;
    startTicking();
  };

  const stopRestTime = () => {
    clearTimerInterval();
    timerEndTimeRef.current = null;
    setIsTimerRunning(false);
    setCountdown(0);
    setTimerExerciseId(null);
    setTimerExerciseName(null);
    setShowTimerPill(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimerInterval();
    };
  }, []);

  return (
    <TimerContext.Provider
      value={{
        countdown,
        countdownFormatted: formatSecondsToMinutesSeconds(countdown),
        isTimerRunning,
        timerExerciseId,
        timerExerciseName,
        showTimerPill,
        startRestTime,
        pauseRestTime,
        resumeRestTime,
        stopRestTime,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
