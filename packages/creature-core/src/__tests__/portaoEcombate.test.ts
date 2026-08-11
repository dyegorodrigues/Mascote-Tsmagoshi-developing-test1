import { describe, it, expect } from "vitest";
import {
  CATALOGO,
  catalogoPublicavel,
  originais,
  prototipos,
  ANIM_MINIMO_VIDA,
  comboConnects,
  frameAdvantageOnHit,
  totalFrames,
  overlaps,
  worldBox,
  resolverAcerto,
  ordemDeDesenho,
} from "../index";
import { MOVESET_BASE, COMBO_BASICO } from "../combat/moveset";

/**
 * ## O portão de publicação
 *
 * Os personagens de protótipo usam arte de terceiros e não podem ir a público.
 * Confiar na memória de alguém para removê-los é exatamente o tipo de coisa que
 * dá errado no pior dia possível. Estes testes são o mecanismo.
 */
describe("portão de publicação", () => {
  it("o catálogo publicável não contém nenhum personagem de protótipo", () => {
    expect(catalogoPublicavel().every((c) => c.origin === "original")).toBe(true);
  });

  it("existe ao menos um personagem original — o produto não pode depender de protótipo", () => {
    expect(originais().length).toBeGreaterThan(0);
  });

  it("todo personagem declara origem explícita; nenhum fica no limbo", () => {
    for (const c of CATALOGO) expect(["prototype", "original"]).toContain(c.origin);
  });

  it("nenhum personagem original aponta para sprite de protótipo (PMD)", () => {
    for (const c of originais()) expect(c.sprite.kind).not.toBe("pmd");
  });

  it("numa build de produção, o catálogo de protótipo tem de estar vazio", () => {
    // Vermelho de propósito quando CREATURE_BUILD=production e ainda houver
    // protótipo: é a trava que impede o vazamento acidental.
    if (process.env.CREATURE_BUILD === "production") {
      expect(prototipos()).toHaveLength(0);
    } else {
      expect(prototipos().length).toBeGreaterThan(0);
    }
  });
});

/**
 * ## A prova da troca
 *
 * Abstração com uma implementação só sempre vaza. Enquanto o motor rodar com
 * um personagem que NÃO é PMD ao lado dos que são, a troca futura da arte está
 * provada — e é uma operação de dados, não uma refatoração.
 */
describe("prova de que a troca de arte vai funcionar", () => {
  it("o catálogo tem personagem não-PMD convivendo com os de protótipo", () => {
    expect(CATALOGO.some((c) => c.sprite.kind !== "pmd")).toBe(true);
    expect(CATALOGO.some((c) => c.sprite.kind === "pmd")).toBe(true);
  });

  it("as três fontes de sprite estão exercitadas no catálogo", () => {
    const kinds = new Set(CATALOGO.map((c) => c.sprite.kind));
    expect(kinds).toContain("pmd");
    expect(kinds).toContain("atlas");
    expect(kinds).toContain("procedural");
  });

  it("todo personagem tem fallback procedural — a tela nunca fica vazia", () => {
    for (const c of CATALOGO) {
      expect(c.fallback.primary).toMatch(/^#/);
      expect(c.fallback.eye).toMatch(/^#/);
    }
  });

  it("evoluções apontam para personagens que existem", () => {
    const ids = new Set(CATALOGO.map((c) => c.id));
    for (const c of CATALOGO)
      for (const e of c.evolutions ?? []) expect(ids.has(e.targetId)).toBe(true);
  });
});

/**
 * ## Combate
 *
 * Balanceamento verificável por teste em vez de por tentativa e erro. Se
 * alguém deixar um golpe lento demais, a cadeia quebra aqui e não no jogo.
 */
describe("frame data e combos", () => {
  it("a cadeia básica conecta do começo ao fim", () => {
    const r = comboConnects(MOVESET_BASE, COMBO_BASICO);
    expect(r.reason ?? "ok").toBe("ok");
    expect(r.ok).toBe(true);
  });

  it("uma sequência que não é cancelável é recusada, e diz onde", () => {
    const r = comboConnects(MOVESET_BASE, ["chute_H", "soco_L"]);
    expect(r.ok).toBe(false);
    expect(r.failsAt).toBe(0);
  });

  it("golpe leve é seguro ao acertar; golpe forte é arriscado", () => {
    expect(frameAdvantageOnHit(MOVESET_BASE.soco_L)).toBeGreaterThan(0);
    expect(frameAdvantageOnHit(MOVESET_BASE.chute_H)).toBeGreaterThan(0);
    expect(totalFrames(MOVESET_BASE.chute_H)).toBeGreaterThan(totalFrames(MOVESET_BASE.soco_L));
  });

  it("o lançador realmente lança e permite combo aéreo", () => {
    expect(MOVESET_BASE.lancador.hit.launcher).toBe(true);
    expect(MOVESET_BASE.lancador.cancels?.into).toContain("aereo_L");
  });

  it("o hyper custa barra e tem invencibilidade de início", () => {
    expect(MOVESET_BASE.hyper_236236.meterCost).toBe(1);
    expect(MOVESET_BASE.hyper_236236.invulnerable).toBeGreaterThan(0);
  });

  it("todo golpe tem ao menos uma caixa de acerto", () => {
    for (const m of Object.values(MOVESET_BASE)) expect(m.hitboxes.length).toBeGreaterThan(0);
  });

  it("golpe baixo só é defendido agachado", () => {
    expect(MOVESET_BASE.chute_baixo.hit.guard).toBe("baixo");
  });

  it("caixas espelham corretamente conforme o lado para onde o personagem olha", () => {
    const box = { x: 20, y: -40, w: 30, h: 20 };
    const dir = worldBox(box, { x: 100, y: 0 }, true);
    const esq = worldBox(box, { x: 100, y: 0 }, false);
    expect(dir.x).toBe(120);
    expect(esq.x).toBe(50);
    expect(overlaps(dir, esq)).toBe(false);
  });

  it("personagens de combate declaram os golpes da cadeia básica", () => {
    for (const c of CATALOGO.filter((c) => c.combat)) {
      for (const id of c.combat!.moves) expect(MOVESET_BASE[id]).toBeDefined();
    }
  });
});

describe("contrato mínimo de animação", () => {
  it("a lista de vida cobre o que um Tamagotchi precisa expressar", () => {
    for (const a of ["idle", "walk", "eat", "sleep", "happy", "sad"])
      expect(ANIM_MINIMO_VIDA).toContain(a);
  });
});

/**
 * ## O eixo de profundidade
 *
 * Existe desde já para que o beat 'em up não obrigue a revisitar toda colisão
 * do jogo de luta depois. No versus, `z` fica em 0 e nada muda.
 */
describe("profundidade — a porta que fica aberta para o beat 'em up", () => {
  const lutador = (x: number, z: number, facingRight = true) => ({
    position: { x, y: 0, z },
    facingRight,
    hurtbox: { x: -16, y: -60, w: 32, h: 60 },
  });

  it("no versus, com todo mundo em z=0, o golpe conecta normalmente", () => {
    const r = resolverAcerto(lutador(0, 0), MOVESET_BASE.soco_M, lutador(30, 0));
    expect(r.conecta).toBe(true);
    if (r.conecta) expect(r.dano).toBe(MOVESET_BASE.soco_M.hit.damage);
  });

  it("no beat 'em up, o golpe passa longe de quem está em outra faixa", () => {
    const r = resolverAcerto(lutador(0, 0), MOVESET_BASE.soco_M, lutador(30, 60));
    expect(r.conecta).toBe(false);
    if (!r.conecta) expect(r.motivo).toBe("outra-faixa");
  });

  it("faixas próximas ainda conectam — a tolerância existe para o jogo ser jogável", () => {
    expect(resolverAcerto(lutador(0, 0), MOVESET_BASE.soco_M, lutador(30, 10)).conecta).toBe(true);
  });

  it("fora de alcance horizontal não conecta, mesmo na mesma faixa", () => {
    const r = resolverAcerto(lutador(0, 0), MOVESET_BASE.soco_M, lutador(400, 0));
    expect(r.conecta).toBe(false);
    if (!r.conecta) expect(r.motivo).toBe("longe");
  });

  it("defender reduz muito o dano, mas não zera", () => {
    const livre = resolverAcerto(lutador(0, 0), MOVESET_BASE.soco_M, lutador(30, 0), "nao");
    const bloqueado = resolverAcerto(lutador(0, 0), MOVESET_BASE.soco_M, lutador(30, 0), "em-pe");
    expect(livre.conecta && bloqueado.conecta).toBe(true);
    if (livre.conecta && bloqueado.conecta) {
      expect(bloqueado.dano).toBeLessThan(livre.dano);
      expect(bloqueado.dano).toBeGreaterThan(0);
    }
  });

  it("golpe baixo não é defendido em pé", () => {
    const r = resolverAcerto(lutador(0, 0), MOVESET_BASE.chute_baixo, lutador(28, 0), "em-pe");
    expect(r.conecta).toBe(true);
    if (r.conecta) expect(r.dano).toBe(MOVESET_BASE.chute_baixo.hit.damage);
  });

  it("golpe baixo É defendido agachado", () => {
    const r = resolverAcerto(lutador(0, 0), MOVESET_BASE.chute_baixo, lutador(28, 0), "agachado");
    expect(r.conecta).toBe(true);
    if (r.conecta) expect(r.dano).toBeLessThan(MOVESET_BASE.chute_baixo.hit.damage);
  });

  it("quem está ao fundo é desenhado primeiro", () => {
    const atores = [
      { nome: "frente", position: { x: 0, y: 0, z: 80 } },
      { nome: "fundo", position: { x: 0, y: 0, z: 5 } },
      { nome: "meio", position: { x: 0, y: 0, z: 40 } },
    ];
    expect(ordemDeDesenho(atores).map((a) => a.nome)).toEqual(["fundo", "meio", "frente"]);
  });
});
