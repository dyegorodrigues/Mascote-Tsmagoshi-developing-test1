#!/usr/bin/env node
/**
 * Gera a ficha de encomenda de arte de um personagem.
 *
 *   npm run ficha tigre companheiro
 *   npm run ficha lobo luta
 *
 * A saída é para colar direto numa ferramenta de geração ou mandar para um
 * artista. Todas as medidas vêm do contrato, então dois personagens pedidos em
 * dias diferentes saem com o mesmo tamanho e o mesmo pivô.
 */
const { gerarFicha, ELENCO, PACOTES } = await import("../packages/creature-core/src/index.ts");

const [quem, pacote = "companheiro"] = process.argv.slice(2);

if (!quem || !ELENCO[quem]) {
  console.log("Uso: node scripts/ficha.mjs <personagem> [pacote]\n");
  console.log("Personagens:", Object.keys(ELENCO).join(", "));
  console.log("Pacotes:    ", Object.keys(PACOTES).join(", "));
  process.exit(quem ? 1 : 0);
}
if (!PACOTES[pacote]) {
  console.error(`Pacote desconhecido: ${pacote}. Use: ${Object.keys(PACOTES).join(", ")}`);
  process.exit(1);
}

console.log(gerarFicha({ ...ELENCO[quem], pacote }));
