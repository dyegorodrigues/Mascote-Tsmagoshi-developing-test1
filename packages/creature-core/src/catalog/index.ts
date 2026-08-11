import type { CreatureDefinition, CreatureId } from "../types";
import { CATALOGO_ORIGINAL } from "./original";
// ⚠️ Linha temporária. Apagar junto com o arquivo antes de publicar.
import { CATALOGO_PROTOTIPO } from "./prototype-pmd";

/**
 * Registro de personagens.
 *
 * Deliberadamente um array concatenado e não um `Record` gigante: o catálogo é
 * DADO, e a origem de cada dado é rastreável pelo arquivo de onde veio. Isso é
 * o que torna "remover todos os personagens de protótipo" uma operação de uma
 * linha em vez de uma varredura manual.
 */
export const CATALOGO: CreatureDefinition[] = [
  ...CATALOGO_ORIGINAL,
  ...CATALOGO_PROTOTIPO,
];

const porId = new Map(CATALOGO.map((c) => [c.id, c]));

export function getCreature(id: CreatureId): CreatureDefinition {
  const c = porId.get(id);
  if (!c) throw new Error(`Personagem desconhecido: ${id}`);
  return c;
}

export function existeCreature(id: CreatureId): boolean {
  return porId.has(id);
}

export const originais = () => CATALOGO.filter((c) => c.origin === "original");
export const prototipos = () => CATALOGO.filter((c) => c.origin === "prototype");

/**
 * Catálogo que pode ir a público.
 *
 * A build de produção usa esta função em vez de `CATALOGO`. Se sobrar algum
 * personagem de protótipo no bundle, foi porque alguém importou o array cru —
 * e o teste do portão pega isso.
 */
export function catalogoPublicavel(): CreatureDefinition[] {
  return CATALOGO.filter((c) => c.origin === "original");
}

export { CATALOGO_ORIGINAL, CATALOGO_PROTOTIPO };
