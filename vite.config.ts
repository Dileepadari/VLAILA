/**
 * Vite configuration.
 *
 * Previously this delegated to a vendor wrapper that assembled the plugin
 * chain implicitly. Everything it did outside its own hosted sandbox is now
 * spelled out here, so the build has no hidden steps and no dependency on a
 * platform this project does not run on.
 *
 * Deliberately not carried over, because they only ever activated inside that
 * sandbox and were inert anywhere else: the nitro deploy plugin (build-time,
 * Cloudflare preset), a component tagger, an HMR gate, a dev-server bridge and
 * two dev error loggers that reported back to the host.
 */

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Keep server-only modules out of the client bundle, and fail the build
      // rather than shipping them by accident.
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts, our
      // SSR error wrapper. wrangler.jsonc's `main` alone is not enough.
      server: { entry: "server" },
    }),
    viteReact(),
  ],

  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
    // React and the TanStack query core must each resolve to a single copy.
    // Two copies of React give "invalid hook call"; two of query-core give a
    // silently empty cache under SSR.
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },

  server: {
    host: "::",
    port: 8080,
    strictPort: true,
  },
});
