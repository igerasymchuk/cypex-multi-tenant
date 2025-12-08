import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@/contexts/auth-context";
import { SWRProvider } from "@/lib/swr-provider";
import { Toaster } from "@/components/ui/sonner";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as "en")) {
    notFound();
  }

  // Get messages for the locale
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <SWRProvider>
          {children}
          <Toaster richColors position="top-right" />
        </SWRProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
