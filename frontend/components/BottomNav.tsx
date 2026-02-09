"use client";

import { useUser } from "@/app/providers";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import logo from "@/public/fit-check-logo.png";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  ChartBarIcon,
  ChevronUpIcon,
  DumbbellIcon,
  HomeIcon,
  LogOutIcon,
  MessageCircleIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
      href: "/coach",
      icon: MessageCircleIcon,
      label: "Coach",
      isCenter: true,
    },
    { href: "/log", icon: CalendarIcon, label: "Log" },
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
        "fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 sm:px-3 sm:pb-3",
        className,
      )}
      style={{ pointerEvents: isVisible ? "auto" : "none" }}
    >
      <div className="mx-auto max-w-2xl bg-background/90 backdrop-blur border border-border shadow-sm rounded-full">
        <div className="flex justify-around items-center py-2 gap-1 px-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const showPulse = item.showPulse && !isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 relative"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 rounded-full py-1.5 px-2 transition-colors relative",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {/* Icon with relative positioning to show badge */}
                  <div className="relative">
                    {item.isCenter ? (
                      <div
                        className={cn(
                          "relative z-10 size-8 rounded-full flex items-center justify-center border",
                          isActive
                            ? "bg-primary/10 border-primary/30"
                            : "bg-background/70 border-border",
                        )}
                      >
                        <Image
                          src={logo}
                          alt="FitCheck Coach"
                          width={26}
                          height={26}
                          className="size-6 object-contain"
                          priority
                        />
                      </div>
                    ) : (
                      <item.icon className="h-4 w-4 relative z-10" />
                    )}
                    {showPulse && (
                      <span className="absolute -top-0.5 -right-0.5 z-20 size-2 bg-primary" />
                    )}
                  </div>

                  <span className="text-xs font-medium relative z-10 hidden sm:inline">
                    {item.label}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full mx-auto w-1/2"
                      initial={false}
                      animate={{ opacity: 1 }}
                      transition={{
                        layout: {
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        },
                      }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-2 px-3 transition-colors",
                  pathname === "/profile"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
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
                  <span className="absolute -bottom-1 -right-1 z-10 inline-flex size-4 items-center justify-center rounded-full border border-border bg-background">
                    <ChevronUpIcon className="size-3 text-muted-foreground" />
                  </span>
                </div>
                <span className="text-xs font-medium hidden sm:inline">
                  Profile
                </span>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-lg">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer rounded-lg">
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/utility" className="cursor-pointer rounded-lg">
                  <WrenchIcon className="mr-2 h-4 w-4" /> Utility
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/stats" className="cursor-pointer rounded-lg">
                  <ChartBarIcon className="mr-2 h-4 w-4" /> Stats
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setTheme(isDark ? "light" : "dark")}
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
                onClick={handleSignOut}
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
