import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    // Fresh temp paths for the durable fixture stores (.data/ is the dev demo store).
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  esbuild: {
    // The app's tsconfig uses jsx:"preserve" (Next compiles JSX itself). Vitest's
    // transform pipeline must still compile the shared .tsx components under test
    // (e.g. LandingView), so compile JSX with the automatic runtime like Next does.
    jsx: "automatic",
  },
});
