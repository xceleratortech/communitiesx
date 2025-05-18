import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:prettier/recommended",
    "plugin:import/recommended",
    "plugin:promise/recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended"
  ),
  {
    ignorePatterns: [".next/**/*", "node_modules/**/*"],
    rules: {
      "no-console": "warn",
      "no-unused-vars": "warn",
      "react/prop-types": "off",
      "import/order": ["warn", { "alphabetize": { "order": "asc" } }]
    }
  }
];

export default eslintConfig;
