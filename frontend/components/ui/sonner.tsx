"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4 text-chart-4" />,
        info: <InfoIcon className="size-4 text-primary" />,
        warning: <TriangleAlertIcon className="size-4 text-accent" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-primary" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-[24px] border border-border bg-card px-4 py-3 text-foreground shadow-lg",
          title: "text-sm font-black leading-tight text-foreground",
          description:
            "text-sm font-medium leading-snug text-muted-foreground",
          icon: "text-foreground",
          actionButton:
            "rounded-full bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground",
          cancelButton:
            "rounded-full bg-muted px-3 py-1.5 text-xs font-black text-foreground",
          closeButton:
            "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          success: "border-chart-4/40",
          error: "border-destructive/40",
          warning: "border-accent/40",
          info: "border-primary/40",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--card)",
          "--success-text": "var(--foreground)",
          "--success-border": "var(--chart-4)",
          "--error-bg": "var(--card)",
          "--error-text": "var(--foreground)",
          "--error-border": "var(--destructive)",
          "--warning-bg": "var(--card)",
          "--warning-text": "var(--foreground)",
          "--warning-border": "var(--accent)",
          "--info-bg": "var(--card)",
          "--info-text": "var(--foreground)",
          "--info-border": "var(--primary)",
          "--border-radius": "24px",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
