import "i18next";
import type { en } from "./locales/en";

// Keys are checked against the English files: a typo in t("...") fails
// the build instead of showing a raw key to a user.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: typeof en;
    returnNull: false;
  }
}
