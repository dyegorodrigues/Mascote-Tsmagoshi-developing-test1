import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@creature/core": resolve(__dirname, "../../packages/creature-core/src/index.ts"),
      "@creature/sprites": resolve(__dirname, "../../packages/creature-sprites/src/index.ts"),
      "@creature/react": resolve(__dirname, "../../packages/creature-react/src/index.tsx"),
    },
  },
  server: { port: 5180 },
});
