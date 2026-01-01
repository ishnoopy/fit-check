"use client";

import { useUser } from "@/app/providers";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarIcon,
  ChartBarIcon,
  DumbbellIcon,
  HomeIcon,
  LogOutIcon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    { href: "/log", icon: CalendarIcon, label: "Log" },
    { href: "/utility", icon: WrenchIcon, label: "Utility" },
    { href: "/stats", icon: ChartBarIcon, label: "Stats" },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 sm:px-4 sm:pb-4",
        className
      )}
    >
      <div className="mx-auto max-w-2xl bg-background/95 backdrop-blur-xl border border-border/50 rounded-full shadow-lg shadow-black/10 dark:shadow-black/30">
        <div className="flex justify-around items-center py-3 gap-2 px-2">
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
                    "flex flex-col items-center justify-center gap-1 rounded-full py-2 px-3 transition-colors relative",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Pulsating ring animation */}
                  {showPulse && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary/20 border-2 border-primary/40"
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary/10 border border-primary/30"
                        animate={{
                          scale: [1, 1.15, 1],
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.3,
                        }}
                      />
                    </>
                  )}

                  {/* Icon with relative positioning to show badge */}
                  <div className="relative">
                    <item.icon className="h-5 w-5 relative z-10" />
                    {showPulse && (
                      <motion.div
                        className="absolute -top-1 -right-1 z-20"
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <SparklesIcon className="h-3 w-3 text-primary fill-primary" />
                      </motion.div>
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
                      animate={{
                        opacity: [0.8, 1, 0.8],
                        scaleY: [1, 1.2, 1],
                      }}
                      transition={{
                        layout: {
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        },
                        opacity: {
                          duration: 2,
                          ease: "easeInOut",
                          repeat: Infinity,
                        },
                        scaleY: {
                          duration: 2,
                          ease: "easeInOut",
                          repeat: Infinity,
                        },
                      }}
                      style={{
                        boxShadow:
                          "0 2px 12px hsl(var(--primary) / 0.4), 0 0 20px hsl(var(--primary) / 0.2)",
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
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
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
                <span className="text-xs font-medium hidden sm:inline">
                  Profile
                </span>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer rounded-xl">
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="cursor-pointer rounded-xl"
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
                className="cursor-pointer rounded-xl"
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
