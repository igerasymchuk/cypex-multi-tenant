"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/org", icon: Building2, labelKey: "organization" },
  { href: "/users", icon: Users, labelKey: "users" },
  { href: "/notes", icon: FileText, labelKey: "notes" },
  { href: "/my-notes", icon: UserCircle, labelKey: "myNotes" },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("nav");

  const getLocalizedHref = (href: string) => `/${locale}${href}`;

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b px-6 py-4">
        <SheetTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">C</span>
          </div>
          <span>Cypex Demo</span>
        </SheetTitle>
      </SheetHeader>
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const localizedHref = getLocalizedHref(item.href);
          const isActive = pathname === localizedHref;
          return (
            <Link
              key={item.href}
              href={localizedHref}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
