import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const PREFIX = "chazarat-hashas:";

/**
 * Like useState, but backed by localStorage so the value survives a reload.
 * This is a stand-in for real per-account persistence (Phase 3) — good
 * enough for now, and a straightforward swap-out once accounts exist.
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

  return [value, setValue];
}
