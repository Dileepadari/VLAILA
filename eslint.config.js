import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // .venv and .pytest_cache are the Python side of this repo; without them
  // eslint walks into pip's vendored JavaScript and reports formatting errors
  // in urllib3. embed/dist and routeTree.gen.ts are build output.
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      ".venv",
      ".pytest_cache",
      ".tanstack",
      "embed/dist",
      "src/routeTree.gen.ts",
      "server",
    ],
  },
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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // A warning, not an error, so lint can gate CI on the things that are
      // actually wrong. The remaining `any`s are a raw KB entry (an untyped
      // JSON document whose real fix is generating types from kb/schema.json)
      // and DOM interop in the embed bundle. Both are genuine work, not a
      // lint fix, and neither should block a build in the meantime.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  eslintPluginPrettier,
);
