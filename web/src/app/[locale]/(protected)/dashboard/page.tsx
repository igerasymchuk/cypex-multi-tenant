"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Plus } from "lucide-react";
import { useAuth, useNotes, useNotesForMe, useUsers } from "@/hooks";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentNotes } from "@/components/dashboard/recent-notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { user } = useAuth();
  const { notes, isLoading: notesLoading } = useNotes();
  const { notes: myNotes, isLoading: myNotesLoading } = useNotesForMe();
  const { users, isLoading: usersLoading } = useUsers();

  const isLoading = notesLoading || myNotesLoading || usersLoading;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("welcome")}, {user?.email}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <StatsCards
        totalNotes={notes.length}
        myNotesCount={myNotes.length}
        usersCount={users.length}
        isLoading={isLoading}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent notes */}
        <RecentNotes notes={notes} isLoading={notesLoading} />

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start">
              <Link href={`/${locale}/notes`}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createNote")}
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start">
              <Link href={`/${locale}/notes`}>{t("viewAllNotes")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
