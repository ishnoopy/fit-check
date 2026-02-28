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
  const [countdown, setCountdown] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerExerciseId, setTimerExerciseId] = useState<string | null>(null);
  const [timerExerciseName, setTimerExerciseName] = useState<string | null>(null);
  const [showTimerPill, setShowTimerPill] = useState<boolean>(false);

  // Initialize audio element on mount
  useEffect(() => {
    audioRef.current = new Audio("/notif-sound.mp3");
  }, []);

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

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTimerExerciseId(exerciseId);
    setTimerExerciseName(exerciseName);
    setCountdown(restTime);
    setIsTimerRunning(true);
    setShowTimerPill(true);

    let countdownInSeconds = restTime;

    intervalRef.current = setInterval(() => {
      countdownInSeconds -= 1;
      setCountdown(countdownInSeconds);

      if (countdownInSeconds <= 0) {
        setIsTimerRunning(false);
        setCountdown(0);
        setTimerExerciseId(null);
        setTimerExerciseName(null);
        setShowTimerPill(false);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (audioRef.current) {
          audioRef.current.play();
        }
        toast.success("Rest time complete! 💪");
      }
    }, 1000);
  };

  const pauseRestTime = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTimerRunning(false);
  };

  const resumeRestTime = () => {
    if (isTimerRunning || countdown <= 0) {
      return;
    }

    setIsTimerRunning(true);
    let countdownInSeconds = countdown;

    intervalRef.current = setInterval(() => {
      countdownInSeconds -= 1;
      setCountdown(countdownInSeconds);

      if (countdownInSeconds <= 0) {
        setIsTimerRunning(false);
        setCountdown(0);
        setTimerExerciseId(null);
        setTimerExerciseName(null);
        setShowTimerPill(false);

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (audioRef.current) {
          audioRef.current.play();
        }
        toast.success("Rest time complete! 💪");
      }
    }, 1000);
  };

  const stopRestTime = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTimerRunning(false);
    setCountdown(0);
    setTimerExerciseId(null);
    setTimerExerciseName(null);
    setShowTimerPill(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
