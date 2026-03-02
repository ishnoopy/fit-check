"use client";

import { api } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import {
  QueryClientProvider,
  useQuery
} from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState } from "react";

interface User {
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  profileCompleted: boolean;
  age?: number;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  weight?: number;
  height?: number;
  fitnessGoal?:
  | "strength"
  | "hypertrophy"
  | "fat_loss"
  | "endurance"
  | "general_fitness";
  activityLevel?:
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extremely_active";
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  authProvider?: "local" | "google";
  googleId?: string;
  isPioneer?: boolean;
  hasGymAccess?: boolean;
  selfMotivationNote?: string;
  onboardingPromiseAccepted?: boolean;
  referralCode?: string;
  successfulReferralCount?: number;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = ["/login", "/signup", "/register", "/"].includes(
    pathname,
  );

  const fetchUser = async () => {
    return api.get<{ data: User }>("/api/auth/me");
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
    enabled: !isPublicRoute,
    retry: false,
  });

  return (
    <UserContext.Provider value={{ user: user?.data || null, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside <UserProvider>");
  }
  return ctx;
}

// General Context
// This is to store different data that is used across the app
interface GeneralContextType {
  activePlanId: string | null;
  setActivePlanId: (planId: string | null) => void;
}

const GeneralContext = createContext<GeneralContextType | null>(null);

export function GeneralProvider({ children }: { children: React.ReactNode }) {
  const [activePlanId, setActivePlanId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activePlanId");
    }
    return null;
  });

  return (
    <GeneralContext.Provider value={{ activePlanId, setActivePlanId }}>
      {children}
    </GeneralContext.Provider>
  );
}

export function useGeneral() {
  const ctx = useContext(GeneralContext);
  if (!ctx) {
    throw new Error("useGeneral must be used inside <GeneralProvider>");
  }
  return ctx;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <UserProvider>
          <GeneralProvider>{children}</GeneralProvider>
        </UserProvider>
      </NextThemesProvider>
    </QueryClientProvider>
  );
}
