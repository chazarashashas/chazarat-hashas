import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useLocalStorageState } from "./useLocalStorageState";

export interface Announcement {
  message: string;
  updatedAt: string;
}

/**
 * The one message an admin can put at the top of the app for everyone
 * (admin_panel_v2_schema.sql's app_announcement). Read once per app open;
 * RLS only returns it while it is switched on. Dismissing hides that
 * version of the message on this device — a new or edited message shows
 * again. Before the SQL is run the table doesn't exist, and this simply
 * shows nothing.
 */
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissedAt, setDismissedAt] = useLocalStorageState<string | null>("announcementDismissedAt", null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from("app_announcement")
      .select("message, active, updated_at")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const message = typeof data.message === "string" ? data.message.trim() : "";
        if (data.active && message) setAnnouncement({ message, updatedAt: data.updated_at as string });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = announcement && announcement.updatedAt !== dismissedAt ? announcement : null;
  return {
    announcement: shown,
    dismiss: () => announcement && setDismissedAt(announcement.updatedAt),
  };
}
