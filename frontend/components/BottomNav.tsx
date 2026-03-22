"use client";

import { useUser } from "@/app/providers";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Brain,
  ChartBarIcon,
  ChevronUpIcon,
  DumbbellIcon,
  HomeIcon,
  LogOutIcon,
  MessageCircleIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WebHaptics } from "web-haptics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
interface Plan {
  id: string;
  title: string;
  description?: string;
}

const logout = async () => {
  return api.delete("/api/auth/logout");
};

export default function BottomNav({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const hapticsRef = useRef<WebHaptics | null>(null);

  useEffect(() => {
    hapticsRef.current = new WebHaptics();

    return () => {
      hapticsRef.current?.destroy();
      hapticsRef.current = null;
    };
  }, []);

  const triggerPressHapticFeedback = () => {
    void hapticsRef.current?.trigger("selection");
  };

  // Check if user has any plans
  const { data: plansData } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get<{ data: Plan[] }>("/api/plans"),
    staleTime: 30000, // Cache for 30 seconds
  });

  const hasNoPlans = !plansData?.data || plansData.data.length === 0;

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      localStorage.removeItem("logFormDrafts");
      localStorage.removeItem("activeWorkoutId");
      localStorage.removeItem("activeExerciseId");
      router.push("/login");
    },
    onError: (error) => {
      console.error("Failed to logout", error);
      // Still clear user state and redirect even if request fails
      queryClient.invalidateQueries({ queryKey: ["user"] });
      router.push("/login");
    },
  });

  const handleSignOut = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { href: "/dashboard", icon: HomeIcon, label: "Home" },
    {
      href: "/plans",
      icon: DumbbellIcon,
      label: "Plans",
      showPulse: hasNoPlans,
    },
    {
      href: "/log",
      icon: PlusIcon,
      label: "Log",
      isCenter: true,
    },
    { href: "/stats", icon: ChartBarIcon, label: "Stats" },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;

    lastScrollYRef.current = window.scrollY;

    const onScroll = () => {
      if (rafRef.current != null) return;

      rafRef.current = window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const lastY = lastScrollYRef.current;

        if (currentY < 16) {
          setIsVisible(true);
        } else if (currentY > lastY + 10) {
          setIsVisible(false);
        } else if (currentY < lastY - 10) {
          setIsVisible(true);
        }

        lastScrollYRef.current = currentY;
        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: isVisible ? 0 : 80 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4",
        className,
      )}
      style={{ pointerEvents: isVisible ? "auto" : "none" }}
    >
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-border/60 bg-card/88 px-2 py-2 shadow-lg backdrop-blur-xl dark:border-white/8 dark:bg-[rgba(30,32,38,0.94)]">
        <div className="flex items-center justify-around gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const showPulse = item.showPulse && !isActive;

            const navContent = (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative flex min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-[1.4rem] px-3 py-2.5 transition-colors",
                  isActive
                    ? "bg-foreground text-background shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:bg-background/80 hover:text-foreground dark:hover:bg-white/6 dark:hover:text-white",
                )}
              >
                <div className="relative">
                  {item.isCenter ? (
                    <div
                      className={cn(
                        "relative z-10 flex size-9 items-center justify-center rounded-full border",
                        "border-primary/25 bg-primary text-primary-foreground dark:border-primary/30 dark:bg-primary",
                      )}
                    >
                      <PlusIcon className="size-5" />
                    </div>
                  ) : (
                    <item.icon className="relative z-10 h-4 w-4" />
                  )}
                  {showPulse && (
                    <span className="absolute -right-0.5 -top-0.5 z-20 size-2 rounded-full bg-primary" />
                  )}
                </div>

                <span className="relative z-10 text-[0.72rem] font-medium tracking-[0.08em] uppercase hidden sm:block">
                  {item.label}
                </span>

              </motion.div>
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 relative"
                onClick={triggerPressHapticFeedback}
              >
                {navContent}
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={triggerPressHapticFeedback}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[1.4rem] px-3 py-2.5 transition-colors",
                  pathname === "/profile"
                    ? "bg-foreground text-background shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-muted-foreground hover:bg-background/80 hover:text-foreground dark:hover:bg-white/6 dark:hover:text-white",
                )}
              >
                <div className="relative">
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt="Profile"
                      width={30}
                      height={30}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-5 w-5" />
                  )}
                  <span className="absolute -bottom-1 -right-1 z-10 inline-flex size-4 items-center justify-center rounded-full border border-border bg-card dark:border-white/10 dark:bg-[rgba(20,22,28,0.96)]">
                    <ChevronUpIcon className="size-3 text-muted-foreground dark:text-white/70" />
                  </span>
                </div>
                <span className="text-[0.72rem] font-medium tracking-[0.08em] uppercase hidden sm:block">
                  Profile
                </span>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-lg border-border/60 bg-card/95 dark:border-white/8 dark:bg-[rgba(28,30,36,0.96)]">
              <DropdownMenuItem asChild>
                <Link
                  href="/profile"
                  className="cursor-pointer rounded-lg"
                  onClick={triggerPressHapticFeedback}
                >
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/utility"
                  className="cursor-pointer rounded-lg"
                  onClick={triggerPressHapticFeedback}
                >
                  <WrenchIcon className="mr-2 h-4 w-4" /> Utility
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/coach"
                  className={cn(
                    "cursor-pointer rounded-lg",
                    !user?.isPioneer && "pointer-events-none opacity-50",
                  )}
                  onClick={(event) => {
                    if (!user?.isPioneer) {
                      event.preventDefault();
                      return;
                    }
                    triggerPressHapticFeedback();
                  }}
                >
                  <Brain className="mr-2 h-4 w-4" /> Coach
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/feedback"
                  className="cursor-pointer rounded-lg"
                  onClick={triggerPressHapticFeedback}
                >
                  <MessageCircleIcon className="mr-2 h-4 w-4" /> Feedback
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  triggerPressHapticFeedback();
                  setTheme(isDark ? "light" : "dark");
                }}
                className="cursor-pointer rounded-lg"
              >
                {isDark ? (
                  <SunIcon className="mr-2 h-4 w-4" />
                ) : (
                  <MoonIcon className="mr-2 h-4 w-4" />
                )}
                {isDark ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  triggerPressHapticFeedback();
                  handleSignOut();
                }}
                disabled={logoutMutation.isPending}
                variant="destructive"
                className="cursor-pointer rounded-lg"
              >
                <LogOutIcon className="mr-2 h-4 w-4" />
                {logoutMutation.isPending ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.nav>
  );
}
