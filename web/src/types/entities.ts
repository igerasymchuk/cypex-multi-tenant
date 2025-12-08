// Domain entities matching PostgREST API
import type { Role } from "./api";

export interface Org {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  org_id: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Note {
  id: string;
  org_id: string;
  author_id: string;
  title: string;
  body: string | null;
  created_at: string;
  updated_at: string;
}

// Form DTOs
export interface CreateNoteDto {
  title: string;
  body?: string;
}

export interface UpdateNoteDto {
  title?: string;
  body?: string;
}
