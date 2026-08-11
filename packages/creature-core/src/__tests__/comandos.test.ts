import { describe, it, expect } from "vitest";
import { CommandRunner, flatten, type Command, type WorldGrid } from "../index";

/**
 * A fila de comandos é a ponte com o SAGA pedagógico: um programa que a criança
 * monta e vê executar. Estes testes travam as três propriedades sem as quais
 * ela não serve como exercício — determinismo, localização do erro e laço.
 */

const mundoVazio: WorldGrid = { width: 10, height: 10, blocked: () => false };
const comPedra = (px: number, py: number): WorldGrid => ({
  width: 10,
  height: 10,
  blocked: (x, y) => x === px && y === py,
  pushable: (x, y) => x === px && y === py,
});

const ator = () => ({ position: { x: 0, y: 0 }, direction: "right" as const });

describe("a fila de comandos é um programa", () => {
  it("executa na ordem e chega onde deveria", () => {
    const a = ator();
    const prog: Command[] = [
      { kind: "andar", arg: 3, direction: "right" },
      { kind: "andar", arg: 2, direction: "down" },
    ];
    new CommandRunner(prog, a, mundoVazio).runToEnd();
    expect(a.position).toEqual({ x: 3, y: 2 });
  });

  it("é determinística: o mesmo programa dá sempre o mesmo resultado", () => {
    const prog: Command[] = [
      { kind: "andar", arg: 2, direction: "right" },
      { kind: "virar", arg: 2 },
      { kind: "pular", arg: 1 },
    ];
    const a1 = ator();
    const a2 = ator();
    const r1 = new CommandRunner(prog, a1, mundoVazio).runToEnd();
    const r2 = new CommandRunner(prog, a2, mundoVazio).runToEnd();
    expect(r1).toEqual(r2);
    expect(a1.position).toEqual(a2.position);
  });

  it("anda um passo por vez, para a criança acompanhar", () => {
    const r = new CommandRunner(
      [{ kind: "andar", arg: 1 }, { kind: "andar", arg: 1 }],
      ator(),
      mundoVazio,
    );
    expect(r.progress).toEqual({ atual: 0, total: 2 });
    r.step();
    expect(r.progress).toEqual({ atual: 1, total: 2 });
    expect(r.done).toBe(false);
    r.step();
    expect(r.done).toBe(true);
    expect(r.step()).toBeNull();
  });
});

describe("localizar a primeira divergência — depuração aos seis anos", () => {
  it("diz exatamente em qual passo travou e por quê", () => {
    const prog: Command[] = [
      { kind: "andar", arg: 1, direction: "right" }, // 0 → ok
      { kind: "andar", arg: 1, direction: "right" }, // 1 → bate na pedra em (2,0)
      { kind: "andar", arg: 1, direction: "right" }, // 2
    ];
    const runner = new CommandRunner(prog, ator(), comPedra(2, 0));
    runner.runToEnd();
    const falha = runner.firstFailure();
    expect(falha?.index).toBe(1);
    expect(falha?.outcome).toBe("bloqueado");
  });

  it("sair do mundo é uma falha distinta de bater em obstáculo", () => {
    const runner = new CommandRunner(
      [{ kind: "andar", arg: 1, direction: "left" }],
      ator(),
      mundoVazio,
    );
    runner.runToEnd();
    expect(runner.firstFailure()?.outcome).toBe("fora-do-mundo");
  });

  it("pular passa por cima do obstáculo que andar não passa", () => {
    const a = ator();
    new CommandRunner([{ kind: "pular", arg: 1, direction: "right" }], a, comPedra(1, 0)).runToEnd();
    expect(a.position).toEqual({ x: 1, y: 0 });
  });

  it("empurrar sem alvo na frente é falha explícita, não silêncio", () => {
    const runner = new CommandRunner([{ kind: "empurrar" }], ator(), mundoVazio);
    runner.runToEnd();
    expect(runner.firstFailure()?.outcome).toBe("sem-alvo");
  });
});

describe("laço", () => {
  it("repetir expande antes de executar, para o índice do passo ser estável", () => {
    const prog: Command[] = [{ kind: "repetir", arg: 3, body: [{ kind: "andar", arg: 1 }] }];
    expect(flatten(prog)).toHaveLength(3);
  });

  it("laços aninhados expandem corretamente", () => {
    const prog: Command[] = [
      {
        kind: "repetir",
        arg: 2,
        body: [{ kind: "repetir", arg: 3, body: [{ kind: "andar", arg: 1 }] }],
      },
    ];
    expect(flatten(prog)).toHaveLength(6);
  });

  it("um laço absurdo não trava a aba da criança", () => {
    const prog: Command[] = [
      { kind: "repetir", arg: 999_999, body: [{ kind: "andar", arg: 1 }] },
    ];
    expect(flatten(prog, 512)).toHaveLength(512);
  });

  it("repetir 4 vezes andar+virar desenha um quadrado e volta ao início", () => {
    const a = ator();
    const prog: Command[] = [
      {
        kind: "repetir",
        arg: 4,
        body: [{ kind: "andar", arg: 2 }, { kind: "virar", arg: 2 }],
      },
    ];
    new CommandRunner(prog, a, { width: 20, height: 20, blocked: () => false }).runToEnd();
    expect(a.position).toEqual({ x: 0, y: 0 });
    expect(a.direction).toBe("right");
  });
});
