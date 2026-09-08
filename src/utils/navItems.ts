export interface NavItemDef {
  id: string;
  label: string;
}

/** Each item's own section hue for its active fill — shared by the
    sidebar and the phone bottom bar, including the shared terracotta
    between Chevrusa and L'Iluy Nishmat (both group-commitment features). */
export const HUE: Record<string, string> = {
  home: "var(--hue-home)",
  limmud: "var(--hue-limmud)",
  review: "var(--hue-review)",
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
};

/** Mirrors Home's own "My Mishna" / "Practice" split — a student who's
    already parsed Home's two sections shouldn't have to learn a second,
    different grouping in the sidebar or the phone "More" sheet. */
export const NAV_GROUPS: { label: string; items: NavItemDef[] }[] = [
  {
    label: "My Mishna",
    items: [
      { id: "home", label: "Home" },
      { id: "limmud", label: "Daily Limmud" },
      { id: "map", label: "Explore Shas" },
      { id: "review", label: "Review" },
      { id: "perek", label: "Mishna Notes" },
      { id: "progress", label: "My Siyumim" },
      { id: "chevrusa", label: "Chevrusa" },
      { id: "chabura", label: "Chabura" },
    ],
  },
  {
    label: "Practice",
    items: [
      { id: "sedarim", label: "Sidrei Hamishna" },
      { id: "mishna", label: "Mishna Quiz" },
      { id: "sort", label: "Seder Sort" },
      { id: "recall", label: "Mishna Chazara" },
      { id: "dash", label: "Shas Dash" },
      { id: "liluy", label: "L'Iluy Nishmat" },
      { id: "resources", label: "Resources" },
    ],
  },
];

/** Login sits alone at the very bottom of the rail, separate from both
    groups — account access is conventionally placed apart from feature
    navigation, not buried mid-list (user feedback). */
export const LOGIN_ITEM: NavItemDef = { id: "login", label: "My Account" };
export const ADMIN_ITEM: NavItemDef = { id: "admin", label: "Admin" };
export const REBBE_ITEM: NavItemDef = { id: "rebbe", label: "Dashboard" };

export const ALL_NAV_ITEMS: NavItemDef[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  LOGIN_ITEM,
  ADMIN_ITEM,
  REBBE_ITEM,
];

export function navLabel(id: string): string {
  return ALL_NAV_ITEMS.find((i) => i.id === id)?.label ?? id;
}

/** The daily loop — nobody is told which destinations matter more than
    theirs (ANDROID-BRIEF.md §7). */
export const DEFAULT_BOTTOM_BAR_IDS = ["home", "limmud", "map", "review"];
