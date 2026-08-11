#!/usr/bin/env node
/**
 * Empacota o protótipo num ARQUIVO HTML ÚNICO, com sprites e retratos embutidos.
 *
 * ## Por que isto existe
 *
 * O autor trabalha de tablet. Um repositório que exige `npm install` para ser
 * visto e' um repositório que ele nao consegue abrir — e trabalho que ele nao
 * consegue ver e' trabalho que nao existe para ele.
 *
 * A saida e' um HTML de ~1,1 MB que abre em qualquer lugar, sem servidor, sem
 * instalacao, e funciona offline porque as imagens viram data URI.
 *
 *   node scripts/empacotar.mjs      → dist/bicho-vivo.html
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PERS = {
  "0025": ["Faisca", "elétrico", "#FACC15"],
  "0004": ["Brasa",  "fogo",     "#FB923C"],
  "0001": ["Broto",  "planta",   "#4ADE80"],
  "0007": ["Gota",   "água",     "#38BDF8"],
};

const b64 = (p) => "data:image/png;base64," + readFileSync(p).toString("base64");
const tag = (xml, t) => xml.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1];

const dados = {};
for (const [pid, [nome, elem, cor]] of Object.entries(PERS)) {
  const dir = join("public/sprites/pmd", pid);
  const xml = readFileSync(join(dir, "AnimData.xml"), "utf8");
  const blocos = [...xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)].map((m) => m[1]);
  const porNome = Object.fromEntries(blocos.map((b) => [tag(b, "Name"), b]));

  const anims = {};
  for (const [nomeAnim, bloco] of Object.entries(porNome)) {
    // `CopyOf` faz uma animacao reaproveitar a folha de outra: e' recurso do
    // formato, e ignora-lo faria metade das animacoes sumirem.
    const copia = tag(bloco, "CopyOf");
    const alvo = copia ? porNome[copia] ?? bloco : bloco;
    const png = join(dir, `${tag(alvo, "Name")}-Anim.png`);
    if (!existsSync(png)) continue;
    anims[nomeAnim.toLowerCase()] = {
      w: +(tag(alvo, "FrameWidth") ?? 40),
      h: +(tag(alvo, "FrameHeight") ?? 40),
      d: [...alvo.matchAll(/<Duration>(\d+)<\/Duration>/g)].map((m) => +m[1]) || [10],
      src: b64(png),
    };
  }

  const pdir = join("public/sprites/portrait", pid);
  const retratos = {};
  if (existsSync(pdir))
    for (const f of readdirSync(pdir).filter((f) => f.endsWith(".png")))
      retratos[f.slice(0, -4)] = b64(join(pdir, f));

  dados[pid] = { nome, elem, cor, anims, retratos };
  console.log(`  ${pid} ${nome}: ${Object.keys(anims).length} animações · ${Object.keys(retratos).length} retratos`);
}

const html = readFileSync("apps/standalone/template.html", "utf8")
  .replace("/*__SPRITES__*/", JSON.stringify(dados));

mkdirSync("dist", { recursive: true });
writeFileSync("dist/bicho-vivo.html", html);
console.log(`\ndist/bicho-vivo.html — ${(html.length / 1024 / 1024).toFixed(2)} MB`);
