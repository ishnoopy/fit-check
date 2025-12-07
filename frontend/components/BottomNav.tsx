"use client";

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
  SparklesIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
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
  _id: string;
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
        "fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg",
        className
      )}
    >
      <div className="mx-auto max-w-2xl px-4">
        <div className="flex justify-around items-center py-3 gap-2">
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
                    "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 px-3 transition-colors relative",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Pulsating ring animation */}
                  {showPulse && (
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-primary/20 border-2 border-primary/40"
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
                        className="absolute inset-0 rounded-2xl bg-primary/10 border border-primary/30"
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

                  <span className="text-xs font-medium relative z-10">
                    {item.label}
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
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
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 px-3 transition-colors",
                  pathname === "/profile"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserIcon className="h-5 w-5" />
                <span className="text-xs font-medium">Profile</span>
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer rounded-xl">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </Link>
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
