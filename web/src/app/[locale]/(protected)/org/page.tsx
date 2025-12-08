"use client";

import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { useOrg } from "@/hooks";
import { formatDate } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationPage() {
  const t = useTranslations("org");
  const { org, isLoading } = useOrg();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-48" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>

      {/* Organization details card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("name")}
              </dt>
              <dd className="text-lg font-semibold">{org.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("slug")}
              </dt>
              <dd className="font-mono text-lg">{org.slug}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("createdAt")}
              </dt>
              <dd className="text-lg">{formatDate(org.created_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
