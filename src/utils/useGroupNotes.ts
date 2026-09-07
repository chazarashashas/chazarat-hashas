import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";

export interface GroupNoteComment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface GroupNote {
  id: string;
  authorId: string;
  authorName: string;
  perek: number;
  mishnah: number;
  body: string;
  createdAt: string;
  editedAt: string | null;
  comments: GroupNoteComment[];
}

function friendlyNoteError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You don't have permission to do that.";
  }
  return "Couldn't save that — please try again.";
}

/** Shared notes for one chevrusa/chabura's masechet — every note carries
    who wrote it, only its author can edit it, and anyone in the group
    can reply underneath. See group_notes_schema.sql. */
export function useGroupNotes(groupId: string, masechetEn: string) {
  const { session } = useAuth();
  const [notes, setNotes] = useState<GroupNote[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase || !session) return;
    setLoading(true);
    const { data: noteRows } = await supabase
      .from("group_notes")
      .select("id, author_id, perek, mishnah, body, created_at, edited_at")
      .eq("group_id", groupId)
      .eq("masechet_en", masechetEn)
      .order("created_at", { ascending: false });

    const noteIds = (noteRows ?? []).map((n) => n.id as string);
    const { data: commentRows } = noteIds.length
      ? await supabase
          .from("group_note_comments")
          .select("id, note_id, author_id, body, created_at")
          .in("note_id", noteIds)
          .order("created_at", { ascending: true })
      : { data: [] as { id: string; note_id: string; author_id: string; body: string; created_at: string }[] };

    const authorIds = Array.from(
      new Set([...(noteRows ?? []).map((n) => n.author_id as string), ...(commentRows ?? []).map((c) => c.author_id as string)]),
    );
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("id, username, first_name").in("id", authorIds)
      : { data: [] as { id: string; username: string | null; first_name: string | null }[] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.first_name ?? p.username ?? "Someone"]));

    setNotes(
      (noteRows ?? []).map((n) => ({
        id: n.id as string,
        authorId: n.author_id as string,
        authorName: n.author_id === session.user.id ? "You" : (nameById.get(n.author_id as string) ?? "Someone"),
        perek: n.perek as number,
        mishnah: n.mishnah as number,
        body: n.body as string,
        createdAt: n.created_at as string,
        editedAt: (n.edited_at as string | null) ?? null,
        comments: (commentRows ?? [])
          .filter((c) => c.note_id === n.id)
          .map((c) => ({
            id: c.id as string,
            authorId: c.author_id as string,
            authorName: c.author_id === session.user.id ? "You" : (nameById.get(c.author_id as string) ?? "Someone"),
            body: c.body as string,
            createdAt: c.created_at as string,
          })),
      })),
    );
    setLoading(false);
  }, [groupId, masechetEn, session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function addNote(perek: number, mishnah: number, body: string): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";
    if (!body.trim()) return "Write something first.";
    const { error } = await supabase
      .from("group_notes")
      .insert({ group_id: groupId, masechet_en: masechetEn, author_id: session.user.id, perek, mishnah, body: body.trim() });
    if (error) return friendlyNoteError(error.message);
    await refresh();
    return null;
  }

  async function editNote(noteId: string, body: string): Promise<string | null> {
    if (!supabase) return "Accounts aren't connected yet.";
    if (!body.trim()) return "Write something first.";
    const { error } = await supabase
      .from("group_notes")
      .update({ body: body.trim(), edited_at: new Date().toISOString() })
      .eq("id", noteId);
    if (error) return friendlyNoteError(error.message);
    await refresh();
    return null;
  }

  async function addComment(noteId: string, body: string): Promise<string | null> {
    if (!supabase || !session) return "Accounts aren't connected yet.";
    if (!body.trim()) return "Write something first.";
    const { error } = await supabase
      .from("group_note_comments")
      .insert({ note_id: noteId, author_id: session.user.id, body: body.trim() });
    if (error) return friendlyNoteError(error.message);
    await refresh();
    return null;
  }

  return { notes, loading, addNote, editNote, addComment };
}
