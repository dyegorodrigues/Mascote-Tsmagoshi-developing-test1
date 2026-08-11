import { describe, it, expect } from "vitest";
import {
  reconcileElapsed,
  applyDecay,
  emotionFor,
  MAX_AUSENCIA_MS,
  PISO,
  estadoInicial,
  aoCarregar,
  avancar,
  alimentar,
  aplicarRecompensa,
  Rng,
  CONFIG_PADRAO,
  CENARIO,
  getCreature,
  type CreatureState,
} from "../index";

const HORA = 3_600_000;
const cfg = (seed = 1) => ({ ...CONFIG_PADRAO, rng: new Rng(seed) });
const magosha = getCreature("magosha");

const comAusencia = (horas: number, over: Partial<CreatureState> = {}): CreatureState => ({
  ...estadoInicial(magosha, 0),
  lastTickAt: 0,
  ...over,
});

describe("a criatura vive enquanto o app está fechado", () => {
  it("aplica o tempo decorrido ao carregar", () => {
    const s = comAusencia(4);
    const r = reconcileElapsed(s, 4 * HORA);
    expect(r.needs.hunger).toBeLessThan(s.needs.hunger);
    expect(r.aplicado).toBe(4 * HORA);
  });

  it("uma ausência curta não muda quase nada", () => {
    const s = comAusencia(0);
    const r = reconcileElapsed(s, 60_000);
    expect(r.needs.hunger).toBeCloseTo(80 - 0.4 * 60, 1);
    expect(r.saudacao).toBeNull();
  });

  it("saúda a criança quando ela volta depois de sumir", () => {
    const r = reconcileElapsed(comAusencia(0), 30 * HORA);
    expect(r.saudacao).toBeTruthy();
  });
});

describe("a criatura nunca morre nem fica irrecuperável", () => {
  it("um mês de ausência conta como o teto, não como um mês", () => {
    const r = reconcileElapsed(comAusencia(0), 30 * 24 * HORA);
    expect(r.aplicado).toBe(MAX_AUSENCIA_MS);
    expect(r.ignorado).toBeGreaterThan(0);
  });

  it("nenhuma necessidade fura o piso, por maior que seja a ausência", () => {
    const r = reconcileElapsed(comAusencia(0), 365 * 24 * HORA);
    expect(r.needs.hunger).toBeGreaterThanOrEqual(PISO);
    expect(r.needs.energy).toBeGreaterThanOrEqual(PISO);
    expect(r.needs.happiness).toBeGreaterThanOrEqual(PISO);
  });

  it("o vínculo NUNCA decai — ele só é construído", () => {
    const s = comAusencia(0, { needs: { hunger: 80, energy: 80, happiness: 80, bond: 55 } });
    const r = reconcileElapsed(s, 365 * 24 * HORA);
    expect(r.needs.bond).toBe(55);
  });

  it("depois de qualquer ausência, uma refeição já recupera bem", () => {
    const { state } = aoCarregar(comAusencia(0), 30 * 24 * HORA);
    const depois = alimentar(state, 30 * 24 * HORA);
    expect(depois.needs.hunger).toBeGreaterThan(state.needs.hunger + 25);
  });
});

describe("simulação autônoma", () => {
  it("é determinística: mesma semente, mesmo resultado", () => {
    const a = avancar(estadoInicial(magosha, 0), cfg(42), 600_000, 0);
    const b = avancar(estadoInicial(magosha, 0), cfg(42), 600_000, 0);
    expect(a).toEqual(b);
  });

  it("sementes diferentes produzem histórias diferentes", () => {
    const a = avancar(estadoInicial(magosha, 0), cfg(1), 600_000, 0);
    const b = avancar(estadoInicial(magosha, 0), cfg(999), 600_000, 0);
    expect(a.position).not.toEqual(b.position);
  });

  it("nunca sai do cenário, em 2000 ticks sem interação", () => {
    let s = estadoInicial(magosha, 0);
    const c = cfg(7);
    for (let i = 1; i <= 2000; i++) {
      s = avancar(s, c, 1000, i * 1000);
      expect(s.position.x).toBeGreaterThanOrEqual(CENARIO.minX - 2);
      expect(s.position.x).toBeLessThanOrEqual(CENARIO.maxX + 2);
      expect(s.position.y).toBeGreaterThanOrEqual(CENARIO.minY - 2);
      expect(s.position.y).toBeLessThanOrEqual(CENARIO.maxY + 2);
    }
  });

  it("dorme sozinha quando a energia acaba, e acorda sozinha depois", () => {
    let s: CreatureState = {
      ...estadoInicial(magosha, 0),
      needs: { hunger: 80, energy: 16, happiness: 80, bond: 10 },
    };
    s = avancar(s, cfg(3), 5_000, 0);
    expect(s.isSleeping).toBe(true);
    s = avancar(s, cfg(3), 60_000, 5_000);
    expect(s.needs.energy).toBeGreaterThan(50);
  });
});

describe("emoção derivada das necessidades", () => {
  const n = (h: number, e: number, f: number) => ({ hunger: h, energy: e, happiness: f, bond: 0 });

  it("a necessidade mais urgente vence", () => {
    expect(emotionFor(n(10, 10, 10), false)).toBe("faminto");
    expect(emotionFor(n(90, 10, 90), false)).toBe("exausto");
    expect(emotionFor(n(90, 90, 10), false)).toBe("triste");
    expect(emotionFor(n(90, 90, 90), false)).toBe("radiante");
    expect(emotionFor(n(50, 50, 50), false)).toBe("contente");
  });

  it("dormir vence tudo", () => {
    expect(emotionFor(n(5, 5, 5), true)).toBe("dormindo");
  });
});

describe("a ponte pedagógica", () => {
  it("recompensa sobe xp e vínculo, e pode subir de nível", () => {
    const r = aplicarRecompensa(
      estadoInicial(magosha, 0),
      magosha,
      { type: "COMPLETED_ACTIVITY", xp: 150, bond: 5, happiness: 10 },
      0,
    );
    expect(r.subiuDeNivel).toBe(true);
    expect(r.state.level).toBe(2);
    expect(r.state.needs.bond).toBe(15);
  });

  it("evolução exige vínculo, não só nível — quem só acumula pontos não evolui", () => {
    const def = getCreature("proto-planta-1");
    const semVinculo = aplicarRecompensa(
      { ...estadoInicial(def, 0), level: 20, needs: { hunger: 80, energy: 80, happiness: 80, bond: 5 } },
      def,
      { type: "CORRECT_ANSWER", xp: 1, bond: 0, happiness: 0 },
      0,
    );
    expect(semVinculo.evoluiuPara).toBeNull();

    const comVinculo = aplicarRecompensa(
      { ...estadoInicial(def, 0), level: 20, needs: { hunger: 80, energy: 80, happiness: 80, bond: 70 } },
      def,
      { type: "CORRECT_ANSWER", xp: 1, bond: 0, happiness: 0 },
      0,
    );
    expect(comVinculo.evoluiuPara).toBe("proto-planta-2");
  });

  it("nenhuma recompensa consegue estourar 100 nas necessidades", () => {
    const r = aplicarRecompensa(
      estadoInicial(magosha, 0),
      magosha,
      { type: "STREAK_BONUS", xp: 0, bond: 500, happiness: 500 },
      0,
    );
    expect(r.state.needs.bond).toBe(100);
    expect(r.state.needs.happiness).toBe(100);
  });
});

describe("decaimento", () => {
  it("dormindo repõe energia em vez de gastar", () => {
    const acordado = applyDecay({ hunger: 80, energy: 50, happiness: 80, bond: 0 }, 10, false);
    const dormindo = applyDecay({ hunger: 80, energy: 50, happiness: 80, bond: 0 }, 10, true);
    expect(acordado.energy).toBeLessThan(50);
    expect(dormindo.energy).toBeGreaterThan(50);
  });
});
