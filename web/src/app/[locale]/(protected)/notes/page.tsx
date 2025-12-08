"use client";

import { useTranslations } from "next-intl";
import { FileText } from "lucide-react";
import { useNotes, useUsers } from "@/hooks";
import { NotesTable } from "@/components/notes/notes-table";

export default function NotesPage() {
  const t = useTranslations("notes");
  const { notes, isLoading: notesLoading, mutate } = useNotes();
  const { users, isLoading: usersLoading } = useUsers();

  const isLoading = notesLoading || usersLoading;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""} in your
            organization
          </p>
        </div>
      </div>

      {/* Notes table */}
      <NotesTable
        notes={notes}
        users={users}
        isLoading={isLoading}
        onMutate={mutate}
      />
    </div>
  );
}
