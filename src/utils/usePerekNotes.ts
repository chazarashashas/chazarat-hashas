import { useLocalStorageState } from "./useLocalStorageState";

/**
 * Shared note storage for Mishna Notes — lifted out of PerekNamesScreen so any
 * screen can read or write the same notes (e.g. Mishna Quiz linking to the
 * perek it just revealed). Every consumer reads the same localStorage keys,
 * which is enough to stay in sync here since the app only ever has one
 * section mounted at a time.
 */
export function usePerekNotes() {
  const [perekNotes, setPerekNotes] = useLocalStorageState<Record<string, string[]>>("perekNotes", {});
  const [masechetSentences, setMasechetSentences] = useLocalStorageState<Record<string, string>>(
    "masechetSentences",
    {},
  );

  function getPerekNote(masechetEn: string, perek: number): string {
    return perekNotes[masechetEn]?.[perek - 1] ?? "";
  }

  function setPerekNote(masechetEn: string, perek: number, value: string) {
    setPerekNotes((prev) => {
      const existing = prev[masechetEn] ?? [];
      const next = [...existing];
      next[perek - 1] = value;
      return { ...prev, [masechetEn]: next };
    });
  }

  return {
    perekNotes,
    setPerekNotes,
    masechetSentences,
    setMasechetSentences,
    getPerekNote,
    setPerekNote,
  };
}
