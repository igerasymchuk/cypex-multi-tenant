"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuth } from "@/hooks";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [isAuthenticated, isLoading, router, locale]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <LoginForm />
    </div>
  );
}
