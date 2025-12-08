"use client";

import useSWR from "swr";
import { dataApi } from "@/lib/api";
import { useAuth } from "./use-auth";
import type { AppUser } from "@/types";

export function useUsers() {
  const { token, isAuthenticated } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<AppUser[]>(
    isAuthenticated && token ? ["users", token] : null,
    () => dataApi.getUsers(token!)
  );

  return {
    users: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
