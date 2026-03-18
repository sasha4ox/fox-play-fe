import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

/** React Compiler rules: warn until refactors (setState in effect, refs in render, memoization). Tighten to "error" over time. */
const reactCompilerRulesGradual = {
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/set-state-in-render": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react-hooks/refs": "warn",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  { rules: reactCompilerRulesGradual },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
