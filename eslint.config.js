import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "android"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // ReviewScreen.tsx is intentionally untouched pending the user's own
    // planned changes there — this override, not an edit to the file
    // itself, is what lets CI gate on lint everywhere else in the
    // meantime. Remove once that screen gets its pass.
    files: ["src/components/Review/ReviewScreen.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  eslintConfigPrettier,
);
