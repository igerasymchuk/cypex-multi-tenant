"use client";

import useSWR from "swr";
import { dataApi } from "@/lib/api";
import { useAuth } from "./use-auth";
import type { Org } from "@/types";

export function useOrg() {
  const { token, isAuthenticated } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<Org[]>(
    isAuthenticated && token ? ["org", token] : null,
    () => dataApi.getOrg(token!)
  );

  return {
    org: data?.[0] ?? null,
    error,
    isLoading,
    mutate,
  };
}
