"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Note } from "@/types";

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().optional(),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface NoteFormProps {
  note?: Note;
  onSubmit: (data: NoteFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function NoteForm({
  note,
  onSubmit,
  onCancel,
  isSubmitting,
}: NoteFormProps) {
  const t = useTranslations("notes");
  const tCommon = useTranslations("common");

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: note?.title || "",
      body: note?.body || "",
    },
  });

  const handleSubmit = async (data: NoteFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("noteTitle")}</FormLabel>
              <FormControl>
                <Input placeholder={t("titlePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("body")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("bodyPlaceholder")}
                  className="min-h-32 resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? tCommon("loading") : tCommon("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
