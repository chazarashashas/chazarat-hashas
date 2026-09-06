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
  // The notebook is deliberately a separate store from perekNotes — that
  // field is the short, memorable *name* for a perek; this is open-ended
  // writing, kept out of the way (opened on demand, not shown inline)
  // rather than folded into the same short field.
  const [perekNotebook, setPerekNotebook] = useLocalStorageState<Record<string, string[]>>(
    "perekNotebook",
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

  function getPerekNotebook(masechetEn: string, perek: number): string {
    return perekNotebook[masechetEn]?.[perek - 1] ?? "";
  }

  function setPerekNotebookEntry(masechetEn: string, perek: number, value: string) {
    setPerekNotebook((prev) => {
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
    perekNotebook,
    setPerekNotebook,
    getPerekNote,
    setPerekNote,
    getPerekNotebook,
    setPerekNotebookEntry,
  };
}
