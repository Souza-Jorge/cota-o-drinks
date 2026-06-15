// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // MUI v9 imports this package subpath without a file extension. Node's
        // ESM SSR resolver treats it as a directory import, so point it at the
        // concrete ESM file before SSR evaluates @mui/material/internal/Transition.
        "react-transition-group/TransitionGroupContext":
          "react-transition-group/esm/TransitionGroupContext.js",
      },
    },
    ssr: {
      // Bundle MUI + react-transition-group through Vite so its ESM/CJS
      // resolution issues don't blow up the Node SSR runtime.
      noExternal: [
        "@mui/material",
        "@mui/system",
        "@mui/base",
        "@mui/utils",
        "@mui/icons-material",
        "@mui/x-date-pickers",
        "@mui/private-theming",
        "@mui/styled-engine",
        "react-transition-group",
      ],
    },
  },
});
