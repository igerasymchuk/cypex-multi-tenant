"use client";

import { useTranslations } from "next-intl";
import { UserCircle } from "lucide-react";
import { useNotesForMe, useUsers } from "@/hooks";
import { NotesTable } from "@/components/notes/notes-table";

export default function MyNotesPage() {
  const t = useTranslations("myNotes");
  const { notes, isLoading: notesLoading, mutate } = useNotesForMe();
  const { users, isLoading: usersLoading } = useUsers();

  const isLoading = notesLoading || usersLoading;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <UserCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Notes table - show create button since these are user's own notes */}
      <NotesTable
        notes={notes}
        users={users}
        isLoading={isLoading}
        onMutate={mutate}
        showCreateButton={true}
      />
    </div>
  );
}
