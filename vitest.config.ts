import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@creature/core": resolve(__dirname, "packages/creature-core/src/index.ts"),
      "@creature/sprites": resolve(__dirname, "packages/creature-sprites/src/index.ts"),
    },
  },
  test: { globals: true, environment: "node" },
});
