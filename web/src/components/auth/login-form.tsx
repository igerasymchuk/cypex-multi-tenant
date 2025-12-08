"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Hardcoded organizations for demo
const ORGANIZATIONS = [
  { slug: "cybertec", name: "Cybertec" },
  { slug: "ivan-corp", name: "Ivan Corp" },
];

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  orgSlug: z.string().min(1, "Please select an organization"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const locale = useLocale();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      orgSlug: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.orgSlug);
      toast.success("Login successful!");
      router.push(`/${locale}/dashboard`);
    } catch {
      toast.error(t("loginError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">{t("loginTitle")}</CardTitle>
        <CardDescription>{t("loginSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="orgSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("organization")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectOrganization")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORGANIZATIONS.map((org) => (
                        <SelectItem key={org.slug} value={org.slug}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("loggingIn") : t("login")}
            </Button>
          </form>
        </Form>

        {/* Demo credentials hint */}
        <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
          <p className="font-medium text-muted-foreground">{t("loginHint")}:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>{t("loginHintCybertec")}</li>
            <li>{t("loginHintIvanCorp")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
