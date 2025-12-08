"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { useAuth, useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { NoteForm } from "./note-form";
import { DeleteNoteDialog } from "./delete-note-dialog";
import { toast } from "sonner";
import type { Note, AppUser } from "@/types";

interface NotesTableProps {
  notes: Note[];
  users: AppUser[];
  isLoading: boolean;
  onMutate: () => void;
  showCreateButton?: boolean;
}

export function NotesTable({
  notes,
  users,
  isLoading,
  onMutate,
  showCreateButton = true,
}: NotesTableProps) {
  const t = useTranslations("notes");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const { createNote, isCreating } = useCreateNote();
  const { updateNote, isUpdating } = useUpdateNote();
  const { deleteNote, isDeleting } = useDeleteNote();

  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);

  const isAdmin = user?.role === "admin";

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(search.toLowerCase())
  );

  const getUserEmail = (authorId: string) => {
    const author = users.find((u) => u.id === authorId);
    return author?.email || "Unknown";
  };

  const handleCreate = async (data: { title: string; body?: string }) => {
    try {
      await createNote(data);
      toast.success(t("noteCreated"));
      setCreateDialogOpen(false);
      onMutate();
    } catch {
      toast.error("Failed to create note");
    }
  };

  const handleUpdate = async (data: { title: string; body?: string }) => {
    if (!editingNote) return;
    try {
      await updateNote({ id: editingNote.id, data });
      toast.success(t("noteUpdated"));
      setEditingNote(null);
      onMutate();
    } catch {
      toast.error("Failed to update note");
    }
  };

  const handleDelete = async () => {
    if (!deletingNote) return;
    try {
      await deleteNote(deletingNote.id);
      toast.success(t("noteDeleted"));
      setDeletingNote(null);
      onMutate();
    } catch {
      toast.error("Failed to delete note");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("noteTitle")}</TableHead>
                <TableHead>{t("author")}</TableHead>
                <TableHead>{t("createdAt")}</TableHead>
                <TableHead>{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search and actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tCommon("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {showCreateButton && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("createNote")}
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("noteTitle")}</TableHead>
                <TableHead>{t("author")}</TableHead>
                <TableHead>{t("createdAt")}</TableHead>
                <TableHead>{t("updatedAt")}</TableHead>
                <TableHead className="w-24">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {notes.length === 0 ? (
                      <div className="space-y-2">
                        <p>{t("noNotes")}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("createFirst")}
                        </p>
                      </div>
                    ) : (
                      tCommon("noResults")
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredNotes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{note.title}</p>
                        {note.body && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {note.body}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getUserEmail(note.author_id)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(note.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(note.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingNote(note)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">{tCommon("edit")}</span>
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingNote(note)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{tCommon("delete")}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createNote")}</DialogTitle>
          </DialogHeader>
          <NoteForm
            onSubmit={handleCreate}
            onCancel={() => setCreateDialogOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editNote")}</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <NoteForm
              note={editingNote}
              onSubmit={handleUpdate}
              onCancel={() => setEditingNote(null)}
              isSubmitting={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <DeleteNoteDialog
        open={!!deletingNote}
        onOpenChange={() => setDeletingNote(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        noteTitle={deletingNote?.title || ""}
      />
    </>
  );
}
