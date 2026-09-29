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
      // An error now that the nine `any`s are gone. Seven were a raw KB entry
      // typed as Record<string, any>; the fix was generating the shape from
      // kb/schema/experiment.schema.json (`npm run kb:types`) rather than
      // hand-keeping a copy. The rest were Web Speech and dataLayer interop,
      // now declared in embed/src/speech.d.ts and beside their use. Left as a
      // warning it would simply grow back.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  eslintPluginPrettier,
);
