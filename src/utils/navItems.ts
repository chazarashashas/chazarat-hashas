import { useTranslation } from "react-i18next";
import type { en } from "../i18n/locales/en";

export interface NavItemDef {
  id: string;
  /** English — the source of the shell:nav strings, and the fallback. */
  label: string;
}

type NavId = keyof typeof en.shell.nav;
export type NavGroupKey = keyof typeof en.shell.navGroup;

/** Nav labels in the interface's language — by id, so every place that
    shows a destination (sidebar, bottom bar, More sheet, My Account's
    bottom-bar picker) names it the same way. */
export function useNavLabels() {
  const { t } = useTranslation("shell");
  return {
    item: (item: NavItemDef): string => t(`nav.${item.id as NavId}`, { defaultValue: item.label }),
    group: (key: NavGroupKey): string => t(`navGroup.${key}`),
  };
}

/** Each item's own section hue for its active fill — shared by the
    sidebar and the phone bottom bar, including the shared terracotta
    between Chevrusa and L'Iluy Nishmat (both group-commitment features). */
export const HUE: Record<string, string> = {
  home: "var(--hue-home)",
  limmud: "var(--hue-limmud)",
  map: "var(--hue-explore)",
  perek: "var(--hue-notes)",
  progress: "var(--hue-siyumim)",
  liluy: "var(--hue-chevrusa)",
  chevrusa: "var(--hue-chevrusa)",
  chabura: "var(--hue-chevrusa)",
  login: "var(--hue-login)",
  sedarim: "var(--hue-sedarim)",
  mishna: "var(--hue-quiz)",
  sort: "var(--hue-sort)",
  recall: "var(--hue-chazara)",
  dash: "var(--hue-dash)",
  resources: "var(--hue-resources)",
  admin: "var(--hue-login)",
  rebbe: "var(--hue-login)",
  guide: "var(--hue-guide)",
};

/** Mirrors Home's own "My Mishna" / "Practice" split — a student who's
    already parsed Home's two sections shouldn't have to learn a second,
    different grouping in the sidebar or the phone "More" sheet. */
export const NAV_GROUPS: { key: NavGroupKey; label: string; items: NavItemDef[] }[] = [
  {
    key: "myMishna",
    label: "My Mishna",
    items: [
      { id: "home", label: "Home" },
      { id: "limmud", label: "Daily Limmud" },
      { id: "map", label: "Explore Shas" },
      { id: "perek", label: "Mishna Notes" },
      { id: "progress", label: "My Siyumim" },
      { id: "chevrusa", label: "Chevrusa" },
      { id: "chabura", label: "Chabura" },
    ],
  },
  {
    key: "practice",
    label: "Practice",
    items: [
      { id: "sedarim", label: "Sidrei Hamishna" },
      { id: "mishna", label: "Mishna Quiz" },
      { id: "sort", label: "Seder Sort" },
      { id: "recall", label: "Mishna Chazara" },
      { id: "dash", label: "Shas Dash" },
    ],
  },
  /* Everything that is neither a tracked personal screen nor a drill:
     reference material, the account, and the one feature that belongs to
     other people's siyumim rather than your own practice. */
  {
    key: "more",
    label: "More",
    items: [
      { id: "liluy", label: "L'Iluy Nishmat" },
      { id: "resources", label: "Resources" },
      { id: "guide", label: "Guide" },
      { id: "login", label: "My Account" },
    ],
  },
];

/** Both of these now live inside the "More" group above; the consts stay
    because the phone's More sheet lists them separately from the groups
    it renders. Login is last inside More, keeping account access at the
    end of the list rather than buried mid-way (user feedback). */
export const LOGIN_ITEM: NavItemDef = { id: "login", label: "My Account" };
export const GUIDE_ITEM: NavItemDef = { id: "guide", label: "Guide" };
/** Only ever shown to accounts that have the role, so these stay out of
    NAV_GROUPS and are appended by the shell when they apply. */
export const ADMIN_ITEM: NavItemDef = { id: "admin", label: "Admin" };
export const REBBE_ITEM: NavItemDef = { id: "rebbe", label: "Dashboard" };

export const ALL_NAV_ITEMS: NavItemDef[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  ADMIN_ITEM,
  REBBE_ITEM,
];

export function navLabel(id: string): string {
  return ALL_NAV_ITEMS.find((i) => i.id === id)?.label ?? id;
}

/** The daily loop — nobody is told which destinations matter more than
    theirs (ANDROID-BRIEF.md §7). */
export const DEFAULT_BOTTOM_BAR_IDS = ["home", "limmud", "map", "progress"];
