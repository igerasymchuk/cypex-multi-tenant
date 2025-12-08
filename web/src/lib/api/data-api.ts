import { ApiClient, getDataApiUrl } from "./client";
import type {
  Org,
  AppUser,
  Note,
  CreateNoteDto,
  UpdateNoteDto,
} from "@/types";

class DataApi {
  private client: ApiClient;

  constructor() {
    this.client = new ApiClient(getDataApiUrl());
  }

  // Organization
  async getOrg(token: string): Promise<Org[]> {
    return this.client.get<Org[]>("/org", token);
  }

  // Users
  async getUsers(token: string): Promise<AppUser[]> {
    return this.client.get<AppUser[]>("/app_user", token);
  }

  // Notes
  async getNotes(token: string): Promise<Note[]> {
    return this.client.get<Note[]>("/note?order=created_at.desc", token);
  }

  async getNote(id: string, token: string): Promise<Note[]> {
    return this.client.get<Note[]>(`/note?id=eq.${id}`, token);
  }

  async createNote(data: CreateNoteDto, token: string): Promise<Note[]> {
    return this.client.fetch<Note[]>("/note", {
      method: "POST",
      body: JSON.stringify(data),
      token,
      headers: {
        Prefer: "return=representation",
      },
    });
  }

  async updateNote(
    id: string,
    data: UpdateNoteDto,
    token: string
  ): Promise<Note[]> {
    return this.client.fetch<Note[]>(`/note?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
      token,
      headers: {
        Prefer: "return=representation",
      },
    });
  }

  async deleteNote(id: string, token: string): Promise<void> {
    await this.client.delete(`/note?id=eq.${id}`, token);
  }

  // RPC Functions
  async getNotesForMe(token: string): Promise<Note[]> {
    return this.client.post<Note[]>("/rpc/notes_for_me", undefined, token);
  }
}

export const dataApi = new DataApi();
