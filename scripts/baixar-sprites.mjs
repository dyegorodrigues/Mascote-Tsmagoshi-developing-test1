#!/usr/bin/env node
/**
 * Baixa uma vez os sprites usados pelo catálogo para `public/sprites/pmd/`.
 *
 * Resolve três problemas de uma vez: o laboratório passa a funcionar offline
 * (tablet sem wifi), abre rápido, e deixa de depender de um repositório de
 * terceiros continuar no ar.
 *
 * É também a preparação da troca: a arte definitiva usa a mesma estrutura de
 * pasta, então o carregador não muda.
 *
 *   node scripts/baixar-sprites.mjs
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";

const BASE = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite";
const DESTINO = "public/sprites/pmd";

// Índices usados por catalog/prototype-pmd.ts.
const INDICES = [25, 26, 1, 2, 4, 5, 7, 8, 447];

const existe = (p) => access(p).then(() => true, () => false);

async function baixar(url, destino) {
  if (await existe(destino)) return "cache";
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, Buffer.from(await r.arrayBuffer()));
  return "ok";
}

for (const idx of INDICES) {
  const id = String(idx).padStart(4, "0");
  const dir = join(DESTINO, id);
  try {
    const xmlUrl = `${BASE}/${id}/AnimData.xml`;
    const xmlPath = join(dir, "AnimData.xml");
    await baixar(xmlUrl, xmlPath);
    const xml = await fetch(xmlUrl).then((r) => r.text());

    const nomes = [...xml.matchAll(/<Name>([^<]+)<\/Name>/g)].map((m) => m[1]);
    let n = 0;
    for (const nome of [...new Set(nomes)]) {
      try {
        await baixar(`${BASE}/${id}/${nome}-Anim.png`, join(dir, `${nome}-Anim.png`));
        n++;
      } catch { /* nem toda animação existe para todo personagem */ }
    }
    console.log(`  ${id}: ${n} animações`);
  } catch (e) {
    console.warn(`  ${id}: falhou — ${e.message}`);
  }
}
console.log(`\nPronto. Os sprites agora vivem em ${DESTINO}/ e o app funciona offline.`);
