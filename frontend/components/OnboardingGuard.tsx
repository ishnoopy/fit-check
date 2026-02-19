"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/app/providers";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && user && !user.profileCompleted && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [isLoading, pathname, router, user]);

  if (isLoading) {
    return null;
  }

  if (user && !user.profileCompleted && pathname !== "/onboarding") {
    return null;
  }

  return <>{children}</>;
}
