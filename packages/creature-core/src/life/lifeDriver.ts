import type {
  CreatureState,
  CreatureDefinition,
  RewardEvent,
  AnimationName,
  Vec2,
} from "../types";
import { vectorToDirection } from "../types";
import { TICK_MS, applyDecay, emotionFor, EMOTION_ANIM, reconcileElapsed } from "./needs";

/**
 * O motorista da vida: o que a criatura faz quando ninguém está mandando.
 *
 * Determinístico por semente. O passeio autônomo parece aleatório para a
 * criança, mas é reproduzível num teste — o que permite provar "depois de mil
 * ticks sem interação, o bicho continua dentro do cenário e nenhuma
 * necessidade furou o piso" sem depender de sorte.
 */

/** Gerador congruente linear. Pequeno, determinístico, suficiente. */
export class Rng {
  constructor(private seed: number) {}
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

/** Limites do cenário, em porcentagem da área visível. */
export const CENARIO = { minX: 12, maxX: 88, minY: 32, maxY: 78 } as const;

const GESTOS: readonly AnimationName[] = ["hop", "happy", "sit", "pose"];

export interface LifeConfig {
  /** Chance por tick de iniciar um passeio quando ocioso. */
  chanceDePassear: number;
  /** Chance por tick de fazer um gesto espontâneo. */
  chanceDeGesto: number;
  rng: Rng;
}

export const CONFIG_PADRAO: Omit<LifeConfig, "rng"> = {
  chanceDePassear: 0.06,
  chanceDeGesto: 0.03,
};

export function estadoInicial(
  def: CreatureDefinition,
  agora: number,
  nickname = def.name,
): CreatureState {
  return {
    speciesId: def.id,
    nickname,
    level: 1,
    xp: 0,
    xpToNext: 100,
    needs: { hunger: 80, energy: 80, happiness: 80, bond: 10 },
    isSleeping: false,
    position: { x: 50, y: 60 },
    target: null,
    animation: "idle",
    direction: "down",
    animUntil: 0,
    lastTickAt: agora,
  };
}

/**
 * Reconcilia a ausência e devolve o estado pronto para uso.
 *
 * Deve ser chamada UMA vez, ao carregar o estado salvo. É o que faz a criatura
 * ter vivido enquanto o app estava fechado.
 */
export function aoCarregar(
  state: CreatureState,
  agora: number,
): { state: CreatureState; saudacao: string | null } {
  const r = reconcileElapsed(state, agora);
  const emocao = emotionFor(r.needs, state.isSleeping);
  return {
    state: {
      ...state,
      needs: r.needs,
      lastTickAt: agora,
      animation: EMOTION_ANIM[emocao],
      target: null,
    },
    saudacao: r.saudacao,
  };
}

/**
 * Um tick de simulação.
 *
 * Puro: recebe estado, devolve estado. Nada de `Date.now()` aqui dentro — o
 * tempo entra por parâmetro, e é isso que torna a simulação testável em massa.
 */
export function tick(
  state: CreatureState,
  cfg: LifeConfig,
  agora: number,
): CreatureState {
  let s: CreatureState = { ...state, lastTickAt: agora };

  s.needs = applyDecay(s.needs, 1, s.isSleeping);

  // Acorda sozinho quando a energia enche.
  if (s.isSleeping && s.needs.energy >= 100) {
    s = { ...s, isSleeping: false, animation: "wake", animUntil: agora + 2200 };
    return s;
  }

  // Cai no sono sozinho quando está exausto demais para continuar.
  if (!s.isSleeping && s.needs.energy <= 15) {
    return { ...s, isSleeping: true, animation: "sleep", target: null, animUntil: 0 };
  }

  // Animação temporária ainda rodando: não interromper.
  if (s.animUntil > 0 && agora < s.animUntil) return s;
  if (s.animUntil > 0 && agora >= s.animUntil) s = { ...s, animUntil: 0, animation: "idle" };

  if (s.isSleeping) return { ...s, animation: "sleep" };

  // Movendo-se em direção a um destino.
  if (s.target) {
    const passo = s.target.speed === "run" ? 1.5 : 0.85;
    const dx = s.target.pos.x - s.position.x;
    const dy = s.target.pos.y - s.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= passo) {
      return { ...s, position: { ...s.target.pos }, target: null, animation: "idle" };
    }
    return {
      ...s,
      position: { x: s.position.x + (dx / dist) * passo, y: s.position.y + (dy / dist) * passo },
      direction: vectorToDirection(dx, dy),
      animation: s.target.speed === "run" ? "run" : "walk",
    };
  }

  // Ocioso: às vezes passeia, às vezes se expressa, e o resto do tempo
  // simplesmente é o que está sentindo.
  const r = cfg.rng.next();
  if (r < cfg.chanceDePassear) {
    return { ...s, target: { pos: destinoAleatorio(s.position, cfg.rng), speed: "walk" } };
  }
  if (r < cfg.chanceDePassear + cfg.chanceDeGesto) {
    return { ...s, animation: cfg.rng.pick(GESTOS), animUntil: agora + 1800 };
  }

  return { ...s, animation: EMOTION_ANIM[emotionFor(s.needs, false)] };
}

function destinoAleatorio(atual: Vec2, rng: Rng): Vec2 {
  return {
    x: Math.max(CENARIO.minX, Math.min(CENARIO.maxX, atual.x + (rng.next() - 0.5) * 24)),
    y: Math.max(CENARIO.minY, Math.min(CENARIO.maxY, atual.y + (rng.next() - 0.5) * 18)),
  };
}

/** Avança `ms` de simulação em ticks discretos. */
export function avancar(
  state: CreatureState,
  cfg: LifeConfig,
  ms: number,
  agoraInicial: number,
): CreatureState {
  let s = state;
  const ticks = Math.floor(ms / TICK_MS);
  for (let i = 0; i < ticks; i++) s = tick(s, cfg, agoraInicial + (i + 1) * TICK_MS);
  return s;
}

// ---------------------------------------------------------------------------
// Interações
// ---------------------------------------------------------------------------

const clamp100 = (v: number) => Math.max(0, Math.min(100, v));

export function alimentar(s: CreatureState, agora: number): CreatureState {
  return {
    ...s,
    needs: {
      ...s.needs,
      hunger: clamp100(s.needs.hunger + 30),
      happiness: clamp100(s.needs.happiness + 8),
      bond: clamp100(s.needs.bond + 2),
    },
    isSleeping: false,
    animation: "eat",
    animUntil: agora + 2600,
    target: null,
  };
}

export function brincar(s: CreatureState, agora: number): CreatureState {
  return {
    ...s,
    needs: {
      ...s.needs,
      happiness: clamp100(s.needs.happiness + 20),
      energy: clamp100(s.needs.energy - 8),
      bond: clamp100(s.needs.bond + 3),
    },
    isSleeping: false,
    animation: "happy",
    animUntil: agora + 2400,
  };
}

export function fazerCarinho(s: CreatureState, agora: number): CreatureState {
  return {
    ...s,
    needs: {
      ...s.needs,
      happiness: clamp100(s.needs.happiness + 10),
      bond: clamp100(s.needs.bond + 4),
    },
    animation: "happy",
    animUntil: agora + 1800,
  };
}

export function alternarSono(s: CreatureState, agora: number): CreatureState {
  const dormindo = !s.isSleeping;
  return {
    ...s,
    isSleeping: dormindo,
    animation: dormindo ? "sleep" : "wake",
    animUntil: dormindo ? 0 : agora + 2000,
    target: null,
  };
}

// ---------------------------------------------------------------------------
// A ponte pedagógica
// ---------------------------------------------------------------------------

export interface RewardResult {
  state: CreatureState;
  subiuDeNivel: boolean;
  evoluiuPara: string | null;
}

/**
 * A ÚNICA porta pela qual aprendizagem afeta a criatura.
 *
 * Repare no que ela NÃO faz: não sabe o que é competência, ficha ou nível
 * curricular. Recebe um evento tipado. Essa fronteira é o que permite o SAGA
 * mudar de currículo inteiro sem tocar numa linha daqui.
 */
export function aplicarRecompensa(
  s: CreatureState,
  def: CreatureDefinition,
  ev: RewardEvent,
  agora: number,
): RewardResult {
  let xp = s.xp + ev.xp;
  let level = s.level;
  let xpToNext = s.xpToNext;
  let subiu = false;

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = Math.round(xpToNext * 1.3);
    subiu = true;
  }

  const needs = {
    ...s.needs,
    happiness: clamp100(s.needs.happiness + ev.happiness),
    bond: clamp100(s.needs.bond + ev.bond),
  };

  // Evolução exige nível E vínculo: quem só acumula pontos não evolui,
  // quem cuida evolui. É a mensagem certa para uma criança.
  const evolucao = def.evolutions?.find((e) => level >= e.minLevel && needs.bond >= e.minBond);

  return {
    state: {
      ...s,
      xp,
      level,
      xpToNext,
      needs,
      speciesId: evolucao ? evolucao.targetId : s.speciesId,
      animation: subiu || evolucao ? "happy" : s.animation,
      animUntil: subiu || evolucao ? agora + 3000 : s.animUntil,
    },
    subiuDeNivel: subiu,
    evoluiuPara: evolucao?.targetId ?? null,
  };
}
