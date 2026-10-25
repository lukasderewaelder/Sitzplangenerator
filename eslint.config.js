import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "index.html", "sw.js", "test-results/**", "playwright-report/**"] },
  js.configs.recommended,
  {
    files: ["app/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.browser, __APP_VERSION__: "readonly" } },
    rules: {
      // Der Altbestand schreibt bewusst leere catch-Blöcke (Speicher/Browser kann fehlen).
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
      "no-useless-escape": "off",
      "no-cond-assign": ["error", "except-parens"],
      "no-prototype-builtins": "off",
      "no-control-regex": "off",
      "no-undef": "error",
    },
  },
  {
    files: ["tools/**/*.mjs", "tests/**/*.mjs", "tests/**/*.js", "*.config.js", "*.config.mjs", "vite.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node, ...globals.browser } },
  },
];
