"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type TimerMode = "stopwatch" | "countdown";

export default function UtilityPage() {
  const [mode, setMode] = useState<TimerMode>("countdown");
  const [time, setTime] = useState(0);
  const [initialTime, setInitialTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.loop = true; // Loop the alarm
      audioRef.current
        .play()
        .then(() => {
          setIsRinging(true);
        })
        .catch((e) => console.log("Audio play failed:", e));
    }
  }, [soundEnabled]);

  const stopRinging = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false;
    }
    setIsRinging(false);
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          if (mode === "countdown") {
            if (prevTime <= 1) {
              setIsRunning(false);
              playSound();
              return 0;
            }
            return prevTime - 1;
          } else {
            return prevTime + 1;
          }
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, mode, playSound]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleStartPause = () => {
    if (!isRunning && time === 0 && mode === "countdown") {
      return; // Do nothing if no time is set
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(mode === "countdown" ? initialTime : 0);
  };

  const handleClear = () => {
    setIsRunning(false);
    setTime(0);
    setInitialTime(0);
  };

  const addTime = (seconds: number) => {
    setMode("countdown");
    const newTime = time + seconds;
    setTime(newTime);
    setInitialTime(newTime);
    if (isRunning) {
      setIsRunning(false);
    }
  };

  const subtractTime = (seconds: number) => {
    setMode("countdown");
    const newTime = Math.max(0, time - seconds); // Prevent negative time
    setTime(newTime);
    setInitialTime(newTime);
    if (isRunning) {
      setIsRunning(false);
    }
  };

  const handleCustomTimer = () => {
    const mins = parseInt(customMinutes) || 0;
    const totalSeconds = mins * 60;

    if (totalSeconds > 0) {
      setMode("countdown");
      setInitialTime(totalSeconds);
      setTime(totalSeconds);
      setIsRunning(false);
      setCustomMinutes("");
      setCustomDialogOpen(false);
    }
  };

  const handleModeChange = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTime(0);
    setInitialTime(0);
  };

  const getProgress = () => {
    if (mode === "countdown" && initialTime > 0) {
      return (time / initialTime) * 100;
    }
    return 100;
  };

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (getProgress() / 100) * circumference;

  return (
    <div className="min-h-screen flex items-center justify-center pb-24 px-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} src="/alarm.mp3" />

      <div className="w-full max-w-md space-y-8">
        {/* Mode Toggle */}
        <div className="flex gap-2 justify-center">
          <Button
            variant={mode === "countdown" ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => handleModeChange("countdown")}
          >
            <Timer className="h-4 w-4" />
            Countdown
          </Button>
          <Button
            variant={mode === "stopwatch" ? "default" : "ghost"}
            size="sm"
            className="gap-2"
            onClick={() => handleModeChange("stopwatch")}
          >
            <Clock className="h-4 w-4" />
            Stopwatch
          </Button>
        </div>

        {/* Circular Timer */}
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* SVG Circle */}
            <svg width="280" height="280" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              {/* Progress circle */}
              {mode === "countdown" && (
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-linear"
                />
              )}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-mono font-bold tracking-tight">
                  {formatTime(time)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Time adjustment buttons (countdown only) */}
        {mode === "countdown" && !isRunning && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => addTime(10)}
                className="flex-1"
              >
                +10s
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => addTime(30)}
                className="flex-1"
              >
                +30s
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCustomDialogOpen(true)}
                className="flex-1"
              >
                Custom
              </Button>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => subtractTime(5)}
                className="flex-1"
                disabled={time < 5}
              >
                -5s
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => subtractTime(10)}
                className="flex-1"
                disabled={time < 10}
              >
                -10s
              </Button>
            </div>
          </div>
        )}

        {/* Main controls */}
        <div className="flex gap-3 justify-center items-center">
          <Button
            onClick={handleStartPause}
            size="lg"
            className="flex-1 h-14 text-lg gap-2"
            disabled={!isRunning && time === 0 && mode === "countdown"}
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Start
              </>
            )}
          </Button>
          <Button
            onClick={handleReset}
            size="lg"
            variant="outline"
            className="h-14 px-6"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          {mode === "countdown" && initialTime > 0 && (
            <Button
              onClick={handleClear}
              size="lg"
              variant="outline"
              className="h-14 px-6"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          <Button
            onClick={() => setSoundEnabled(!soundEnabled)}
            size="lg"
            variant="ghost"
            className="h-14 px-6"
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Hint text */}
        {!isRunning && time === 0 && mode === "countdown" && (
          <p className="text-center text-sm text-muted-foreground">
            Set a time to start the countdown
          </p>
        )}
      </div>

      {/* Custom time dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Custom Time</DialogTitle>
            <DialogDescription>
              Enter the number of minutes for your timer
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              placeholder="Minutes"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="text-center text-2xl h-16"
              min="0"
              max="99"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCustomDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCustomTimer}>Set Timer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ringing alarm dialog */}
      <Dialog open={isRinging} onOpenChange={stopRinging}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <Bell className="h-6 w-6 animate-bounce text-primary" />
              Timer Complete!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your countdown has finished
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <Bell className="h-24 w-24 text-primary animate-pulse" />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={stopRinging} size="lg" className="w-full">
              Dismiss Alarm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
