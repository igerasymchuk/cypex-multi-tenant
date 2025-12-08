"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Note } from "@/types";

interface RecentNotesProps {
  notes: Note[];
  isLoading: boolean;
}

export function RecentNotes({ notes, isLoading }: RecentNotesProps) {
  const t = useTranslations("dashboard");
  const tNotes = useTranslations("notes");
  const locale = useLocale();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("recentNotes")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentNotes = notes.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("recentNotes")}</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/notes`}>{t("viewAllNotes")}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recentNotes.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {tNotes("noNotes")}
          </div>
        ) : (
          <div className="space-y-4">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-start gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-medium">
                    {note.title.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium leading-none">{note.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {note.body
                      ? note.body.substring(0, 50) +
                        (note.body.length > 50 ? "..." : "")
                      : "No content"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(note.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
