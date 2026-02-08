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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

/**
 * Props for individual step configuration
 */
interface MultiStepDialogStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
  canSkip?: boolean;
  validate?: () => boolean | Promise<boolean>;
}

/**
 * Props for the MultiStepDialog component
 */
interface MultiStepDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  steps: MultiStepDialogStep[];
  onComplete?: () => void | Promise<void>;
  onCancel?: () => void;
  showProgress?: boolean;
  showStepNumbers?: boolean;
  canGoBack?: boolean;
  className?: string;
  cancelText?: string;
  nextText?: string;
  previousText?: string;
  finishText?: string;
  skipText?: string;
  modal?: boolean;
}

/**
 * Context for managing multi-step dialog state
 */
interface MultiStepDialogContextValue {
  currentStepIndex: number;
  totalSteps: number;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (stepIndex: number) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const MultiStepDialogContext = React.createContext<
  MultiStepDialogContextValue | undefined
>(undefined);

/**
 * Hook to access multi-step dialog context
 */
export function useMultiStepDialog(): MultiStepDialogContextValue {
  const context = React.useContext(MultiStepDialogContext);
  if (!context) {
    throw new Error(
      "useMultiStepDialog must be used within MultiStepDialog component"
    );
  }
  return context;
}

/**
 * Multi-step dialog component with progress tracking and navigation
 */
export function MultiStepDialog({
  isOpen,
  onOpenChange,
  steps,
  onComplete,
  onCancel,
  showProgress = true,
  showStepNumbers = true,
  canGoBack = true,
  className,
  cancelText = "Cancel",
  nextText = "Next",
  previousText = "Previous",
  finishText = "Finish",
  skipText = "Skip",
  modal = false,
}: MultiStepDialogProps): React.ReactElement {
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0);
  const [isValidating, setIsValidating] = React.useState<boolean>(false);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  const goToStep = React.useCallback(
    (stepIndex: number) => {
      if (stepIndex >= 0 && stepIndex < steps.length) {
        setCurrentStepIndex(stepIndex);
      }
    },
    [steps.length]
  );

  const goToNextStep = React.useCallback(async () => {
    if (currentStep.validate) {
      setIsValidating(true);
      try {
        const isValid = await currentStep.validate();
        if (!isValid) {
          setIsValidating(false);
          return;
        }
      } catch (error) {
        console.error("Validation error:", error);
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStep, isLastStep]);

  const goToPreviousStep = React.useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleClose = React.useCallback(() => {
    setCurrentStepIndex(0);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleComplete = React.useCallback(async () => {
    if (currentStep.validate) {
      setIsValidating(true);
      try {
        const isValid = await currentStep.validate();
        if (!isValid) {
          setIsValidating(false);
          return;
        }
      } catch (error) {
        console.error("Validation error:", error);
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    if (onComplete) {
      setIsValidating(true);
      try {
        await onComplete();
      } catch (error) {
        console.error("Error in onComplete:", error);
        setIsValidating(false);
        return; // Don't close the dialog if onComplete fails
      }
      setIsValidating(false);
    }
    handleClose();
  }, [currentStep, onComplete, handleClose]);

  const handleSkip = React.useCallback(() => {
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [isLastStep]);

  const handleCancel = React.useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    handleClose();
  }, [onCancel, handleClose]);

  const contextValue: MultiStepDialogContextValue = React.useMemo(
    () => ({
      currentStepIndex,
      totalSteps: steps.length,
      goToNextStep,
      goToPreviousStep,
      goToStep,
      isFirstStep,
      isLastStep,
    }),
    [
      currentStepIndex,
      steps.length,
      goToNextStep,
      goToPreviousStep,
      goToStep,
      isFirstStep,
      isLastStep,
    ]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={modal}>
      <DialogContent
        className={cn("sm:max-w-[600px]", className)}
        forceShowOverlay={!modal}
      >
        <MultiStepDialogContext.Provider value={contextValue}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {showStepNumbers && (
                  <span className="text-muted-foreground mr-2 text-sm font-normal">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                )}
                {currentStep.title}
              </DialogTitle>
            </div>
            {currentStep.description && (
              <DialogDescription>{currentStep.description}</DialogDescription>
            )}
          </DialogHeader>

          {showProgress && (
            <div className="py-2">
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          <div className="py-4">{currentStep.content}</div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                {cancelText}
              </Button>
              {canGoBack && !isFirstStep && (
                <Button
                  variant="outline"
                  onClick={goToPreviousStep}
                  disabled={isValidating}
                >
                  <ChevronLeftIcon />
                  {previousText}
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep.canSkip && !isLastStep && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isValidating}
                >
                  {skipText}
                </Button>
              )}
              {!isLastStep ? (
                <Button
                  onClick={goToNextStep}
                  disabled={isValidating}
                  className="min-w-[100px]"
                >
                  {nextText}
                  <ChevronRightIcon />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isValidating}
                  className="min-w-[100px]"
                >
                  {finishText}
                </Button>
              )}
            </div>
          </DialogFooter>
        </MultiStepDialogContext.Provider>
      </DialogContent>
    </Dialog>
  );
}
