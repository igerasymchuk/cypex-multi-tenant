"use client";

import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { dataApi } from "@/lib/api";
import { useAuth } from "./use-auth";
import type { Note, CreateNoteDto, UpdateNoteDto } from "@/types";

export function useNotes() {
  const { token, isAuthenticated } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<Note[]>(
    isAuthenticated && token ? ["notes", token] : null,
    () => dataApi.getNotes(token!)
  );

  return {
    notes: data ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useNotesForMe() {
  const { token, isAuthenticated } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<Note[]>(
    isAuthenticated && token ? ["notes-for-me", token] : null,
    () => dataApi.getNotesForMe(token!)
  );

  return {
    notes: data ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useCreateNote() {
  const { token } = useAuth();

  const { trigger, isMutating, error } = useSWRMutation(
    ["notes", token],
    async (_key, { arg }: { arg: CreateNoteDto }) => {
      if (!token) throw new Error("Not authenticated");
      return dataApi.createNote(arg, token);
    }
  );

  return {
    createNote: trigger,
    isCreating: isMutating,
    error,
  };
}

export function useUpdateNote() {
  const { token } = useAuth();

  const { trigger, isMutating, error } = useSWRMutation(
    ["notes", token],
    async (_key, { arg }: { arg: { id: string; data: UpdateNoteDto } }) => {
      if (!token) throw new Error("Not authenticated");
      return dataApi.updateNote(arg.id, arg.data, token);
    }
  );

  return {
    updateNote: trigger,
    isUpdating: isMutating,
    error,
  };
}

export function useDeleteNote() {
  const { token } = useAuth();

  const { trigger, isMutating, error } = useSWRMutation(
    ["notes", token],
    async (_key, { arg }: { arg: string }) => {
      if (!token) throw new Error("Not authenticated");
      return dataApi.deleteNote(arg, token);
    }
  );

  return {
    deleteNote: trigger,
    isDeleting: isMutating,
    error,
  };
}
