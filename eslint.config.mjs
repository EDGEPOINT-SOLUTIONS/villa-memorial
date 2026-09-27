import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "stub-gateway/**",
      "legacy-mockup/**",
      "next-env.d.ts",
      ".agents/**",
      ".claude/**",
      // The design-audit harness's OUTPUT directory (report.json, shots, and the
      // throwaway probe scripts written while investigating). It is gitignored,
      // so linting it only ever produced warnings about scratch files nobody
      // ships — which trains people to ignore the lint output. The harness's real
      // tools live in scripts/design-audit/ and ARE linted.
      ".design-audit/**",
    ],
  },
];

export default eslintConfig;
