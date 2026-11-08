import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const domains = ["identity", "patients", "appointments", "scheduling", "notifications", "reports"];
const publicServerModules = { scheduling: "services|availability|impact" };

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["src/generated/**", ".next/**", "node_modules/**"],
  },
  {
    files: ["src/server/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/app/**", "@/modules/**", "@/components/**"],
          message: "Shared infrastructure and pure helpers must not depend on application or domain modules.",
        }],
      }],
    },
  },
  {
    files: ["src/**/*.client.tsx", "src/modules/**/contracts.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/server/**", "@/generated/**", "@/modules/*/server", "@/config/env"],
          message: "Client code and public contracts cannot import server infrastructure, Prisma or secrets.",
        }],
      }],
    },
  },
  ...domains.map(domain => ({
    files: [`src/modules/${domain}/**/*.{ts,tsx}`],
    ignores: [`src/modules/${domain}/contracts.ts`],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: domains.filter(other => other !== domain).map(other => ({
          regex: `^@/modules/${other}/(?!(server|contracts|${publicServerModules[other] ?? "(?!)"})$)`,
          message: "Cross-module calls must use an explicitly allowed domain service or browser-safe contracts.",
        })),
      }],
    },
  })),
];

export default eslintConfig;
