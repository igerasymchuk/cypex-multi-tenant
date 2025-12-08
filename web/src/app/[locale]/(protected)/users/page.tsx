"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { useUsers } from "@/hooks";
import { UsersTable } from "@/components/users/users-table";

export default function UsersPage() {
  const t = useTranslations("users");
  const { users, isLoading } = useUsers();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} user{users.length !== 1 ? "s" : ""} in your
            organization
          </p>
        </div>
      </div>

      {/* Users table */}
      <UsersTable users={users} isLoading={isLoading} />
    </div>
  );
}
