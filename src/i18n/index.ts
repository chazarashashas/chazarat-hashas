import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { en } from "./locales/en";
import { he } from "./locales/he";
import { LOCAL_WRITE_EVENT, STORAGE_SYNC_EVENT } from "../utils/useLocalStorageState";

/**
 * The Hebrew interface: on. Turning it off sends everyone back to English
 * (`?lang=he` still previews it). The completeness test (i18n.test.ts)
 * refuses to pass with this on and any Hebrew string missing, so a new
 * English string without its Hebrew fails the build.
 */
export const HEBREW_ENABLED = true;

export type UiLanguage = "en" | "he";

/** Shared with useLocalStorageState's prefix, so cloud sync can carry it. */
export const LANGUAGE_KEY = "chazarat-hashas:uiLanguage";
const PREVIEW_KEY = "chazarat-hashas:uiLanguagePreview";

function isUiLanguage(v: unknown): v is UiLanguage {
  return v === "en" || v === "he";
}

/** The person's own choice from My Account, if they've made one. */
export function savedLanguage(): UiLanguage | null {
  try {
    const raw = localStorage.getItem(LANGUAGE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return isUiLanguage(v) ? v : null;
  } catch {
    return null;
  }
}

/** Hebrew when the phone or browser is set to Hebrew ("iw" is its old code). */
export function deviceLanguage(languages: readonly string[] = navigator.languages ?? [navigator.language]): UiLanguage {
  return languages.some((l) => /^(he|iw)\b/i.test(l)) ? "he" : "en";
}

/** `?lang=he` / `?lang=en` — held for the rest of the visit. */
function previewLanguage(): UiLanguage | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (isUiLanguage(fromUrl)) {
      sessionStorage.setItem(PREVIEW_KEY, fromUrl);
      return fromUrl;
    }
    const held = sessionStorage.getItem(PREVIEW_KEY);
    return isUiLanguage(held) ? held : null;
  } catch {
    return null;
  }
}

export function resolveLanguage(): UiLanguage {
  const preview = previewLanguage();
  if (preview) return preview;
  if (!HEBREW_ENABLED) return "en";
  return savedLanguage() ?? deviceLanguage();
}

export function directionOf(lang: string): "rtl" | "ltr" {
  return lang === "he" ? "rtl" : "ltr";
}

/** The whole page's language and direction — set before the first render
    so a Hebrew visit never flashes left-to-right. */
function applyToDocument(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir = directionOf(lang);
}

void i18n.use(initReactI18next).init({
  resources: { en, he },
  lng: resolveLanguage(),
  fallbackLng: "en",
  defaultNS: "common",
  // Shared words (Cancel, Save…) resolve from common when a screen's own
  // namespace lacks them — matches fallbackNS in i18next.d.ts.
  fallbackNS: "common",
  ns: Object.keys(en),
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});
applyToDocument(i18n.language);
i18n.on("languageChanged", applyToDocument);

// Signing in on a new device brings the account's choice down (cloud sync
// writes it to storage and announces it) — follow it.
window.addEventListener(STORAGE_SYNC_EVENT, () => {
  const next = resolveLanguage();
  if (next !== i18n.language) void i18n.changeLanguage(next);
});

/** Switch languages and remember it — on this device, and (through cloud
    sync) on the account. My Account's switch. */
export function setUiLanguage(lang: UiLanguage) {
  try {
    localStorage.setItem(LANGUAGE_KEY, JSON.stringify(lang));
    sessionStorage.removeItem(PREVIEW_KEY);
    window.dispatchEvent(new Event(LOCAL_WRITE_EVENT));
  } catch {
    // Storage blocked — the switch still applies for this visit.
  }
  void i18n.changeLanguage(lang);
}

/** For the few things CSS can't mirror by itself — a sliding thumb's
    translateX, an arrow drawn in code. */
export function useDirection(): "rtl" | "ltr" {
  const { i18n: instance } = useTranslation();
  return directionOf(instance.language);
}

/** A seder or masechet's name in the interface's language — the data
    already carries both (`{ he: "ברכות", en: "Berachot" }`). */
export function useName(): (item: { he: string; en: string }) => string {
  const { i18n: instance } = useTranslation();
  return (item) => (instance.language === "he" ? item.he : item.en);
}

/** Dates and numbers for the interface's language. English keeps the
    device's own format (undefined), as it always has; Hebrew is he-IL. */
export function useLocale(): string | undefined {
  const { i18n: instance } = useTranslation();
  return instance.language === "he" ? "he-IL" : undefined;
}

export default i18n;
