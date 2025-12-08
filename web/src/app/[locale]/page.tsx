"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks";

export default function LocaleHomePage() {
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace(`/${locale}/dashboard`);
      } else {
        router.replace(`/${locale}/login`);
      }
    }
  }, [isAuthenticated, isLoading, router, locale]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}
