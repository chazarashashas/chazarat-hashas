import { useTranslation } from "react-i18next";
import { setUiLanguage } from "../../i18n";

/** A quiet way to switch language from Home: the other language's name,
    in its own script, in the panel's top corner — עברית while reading
    English, English while reading Hebrew. The same setting as My Account's
    switch, so the two never disagree. */
export function LanguageCornerLink() {
  const { t, i18n } = useTranslation("common");
  const other = i18n.language === "he" ? "en" : "he";
  return (
    <button
      type="button"
      className="home-language-link"
      lang={other}
      aria-label={t("language.switchToOther")}
      onClick={() => setUiLanguage(other)}
    >
      {t(`language.${other}`)}
    </button>
  );
}
