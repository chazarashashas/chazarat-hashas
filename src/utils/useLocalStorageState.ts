import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "chazarat-hashas:";

/** Dispatched by useCloudSync after it writes a merged value straight to
    localStorage — the native "storage" event only fires in *other* tabs,
    never the tab that made the write, so every useLocalStorageState
    instance needs to be told explicitly to re-read its key. */
export const STORAGE_SYNC_EVENT = "chazarat-hashas:storage-sync";

/**
 * Like useState, but backed by localStorage so the value survives a reload.
 * Also re-reads its value when notified via STORAGE_SYNC_EVENT, so an
 * external write (the cloud-sync merge on login) updates every mounted
 * screen in place — no page reload, so no getting bounced back to Home.
 */
export function useLocalStorageState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable (private browsing, etc.) — the note
      // just won't survive a reload this session, nothing more to do.
    }
  }, [key, value]);

  useEffect(() => {
    function handleSync() {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw != null) setValue(JSON.parse(raw) as T);
      } catch {
        // Corrupt value written externally — keep whatever's already here.
      }
    }
    window.addEventListener(STORAGE_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(STORAGE_SYNC_EVENT, handleSync);
  }, [key]);

  return [value, setValue];
}
