import { describe, it, expect } from "vitest";
import {
  ANIMACOES, PACOTES, CELULA, ALTURA_PERSONAGEM, PIVO, PROPORCAO_CABECAS,
  quadrosDoPacote, gerarFicha, ELENCO,
} from "../index";

/**
 * O contrato de arte existe para impedir a doença do MvC2 e do MUGEN: peças de
 * origens diferentes que não parecem o mesmo jogo. Estes testes travam as
 * medidas para que ninguém encomende fora do padrão sem perceber.
 */
describe("contrato de arte", () => {
  it("a célula é maior que o personagem — golpe esticado precisa de espaço", () => {
    expect(CELULA.altura).toBeGreaterThan(ALTURA_PERSONAGEM);
    expect(CELULA.largura).toBeGreaterThan(ALTURA_PERSONAGEM);
  });

  it("o pivô fica nos pés, dentro da célula", () => {
    expect(PIVO.x).toBe(CELULA.largura / 2);
    expect(PIVO.y).toBeLessThanOrEqual(CELULA.altura);
    expect(PIVO.y).toBeGreaterThan(ALTURA_PERSONAGEM);
  });

  it("a proporção é de adulto heroico, nunca chibi", () => {
    expect(PROPORCAO_CABECAS).toBeGreaterThanOrEqual(6);
  });

  it("toda animação tem ao menos um quadro e um uso declarado", () => {
    for (const a of ANIMACOES) {
      expect(a.quadros).toBeGreaterThan(0);
      expect(a.uso.length).toBeGreaterThan(0);
      expect(a.descricao.length).toBeGreaterThan(10);
    }
  });

  it("não há animação duplicada", () => {
    const ids = ANIMACOES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("todo id em um pacote existe no catálogo de animações", () => {
    const conhecidas = new Set(ANIMACOES.map((a) => a.id));
    for (const ids of Object.values(PACOTES))
      for (const id of ids) expect(conhecidas.has(id)).toBe(true);
  });

  it("o pacote do companheiro é muito mais barato que o de luta", () => {
    expect(quadrosDoPacote("companheiro")).toBeLessThan(quadrosDoPacote("luta"));
  });
});

describe("ficha de encomenda", () => {
  it("gera ficha para todo o elenco, nos três pacotes", () => {
    for (const pedido of Object.values(ELENCO))
      for (const pacote of Object.keys(PACOTES) as (keyof typeof PACOTES)[]) {
        const f = gerarFicha({ ...pedido, pacote });
        expect(f).toContain(pedido.nome.toUpperCase());
        expect(f).toContain(`${CELULA.largura} × ${CELULA.altura}`);
      }
  });

  it("a regra da referência única aparece sempre — é a que evita o amadorismo", () => {
    const f = gerarFicha({ ...ELENCO.tigre, pacote: "companheiro" });
    expect(f).toContain("NUNCA gere um quadro do zero");
  });

  it("exige arquivo-fonte e direitos comerciais", () => {
    const f = gerarFicha({ ...ELENCO.leao, pacote: "luta" });
    expect(f).toContain(".ase");
    expect(f).toContain("direitos comerciais");
  });

  it("o personagem que se transforma pede continuidade de roupa", () => {
    const f = gerarFicha({ ...ELENCO.lobo, pacote: "luta" });
    expect(f).toContain("SEGUNDA FORMA");
    expect(f).toContain("atravessa a transformação");
  });

  it("todas as paletas são hexadecimais válidos", () => {
    for (const p of Object.values(ELENCO))
      for (const cor of p.paleta) expect(cor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("o elenco compartilha o judogi — identidade visual de grupo", () => {
    const animais = [ELENCO.tigre, ELENCO.leao, ELENCO.trex];
    for (const a of animais)
      expect(a.marcasRegistradas.some((m) => m.includes("judogi"))).toBe(true);
  });
});
