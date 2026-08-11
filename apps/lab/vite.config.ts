import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  // Os sprites vivem na raiz do repositorio, nao dentro do app: eles sao
  // compartilhados por qualquer aplicacao que use o motor. Sem esta linha o
  // Vite procura em apps/lab/public, nao acha, e devolve o index.html — o que
  // faz o XML "carregar" com status 200 e falhar no parse.
  publicDir: resolve(__dirname, "../../public"),
  resolve: {
    alias: {
      "@creature/core": resolve(__dirname, "../../packages/creature-core/src/index.ts"),
      "@creature/sprites": resolve(__dirname, "../../packages/creature-sprites/src/index.ts"),
      "@creature/react": resolve(__dirname, "../../packages/creature-react/src/index.tsx"),
    },
  },
  server: { port: 5180 },
});
