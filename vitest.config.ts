import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Les tests d'intégration font de vrais aller-retours réseau vers Railway.
    testTimeout: 20_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
