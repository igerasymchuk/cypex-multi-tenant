"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks";
import { AppShell } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [isAuthenticated, isLoading, router, locale]);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        {/* Sidebar skeleton */}
        <div className="hidden w-64 border-r bg-card p-4 md:block">
          <Skeleton className="mb-4 h-12 w-full" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col">
          <div className="h-16 border-b bg-card px-4">
            <Skeleton className="mt-4 h-8 w-32" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="mb-4 h-8 w-48" />
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
