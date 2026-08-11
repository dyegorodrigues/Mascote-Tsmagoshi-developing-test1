import type { CreatureState, Needs, Emotion } from "../types";

/**
 * Simulação de necessidades — o que faz a criatura estar viva.
 *
 * Duas decisões governam este arquivo inteiro, e ambas são de PRODUTO, não de
 * engenharia. Estão aqui em vez de num documento porque documento que pede
 * atenção não é mecanismo.
 *
 * ## 1. A criatura vive enquanto o app está fechado
 *
 * O protótipo anterior decaía por `setInterval`. Fechou a aba, o tempo parou:
 * a criança voltava três dias depois e encontrava tudo exatamente como deixou.
 * Isso quebra o contrato que DEFINE o gênero — o bicho tem que sentir falta.
 * `reconcileElapsed()` existe para isso.
 *
 * ## 2. A criatura nunca morre, nunca fica irrecuperável
 *
 * Criança de seis anos que abandona o bicho duas semanas e volta para achá-lo
 * morto não aprende responsabilidade: aprende culpa, e não volta mais. Culpa é
 * péssima mecânica para criança.
 *
 * Daí três travas: teto de ausência (`MAX_AUSENCIA_MS`), piso por necessidade
 * (`PISO`), e vínculo que jamais decai.
 */

/** Duração de um tick de simulação de vida. */
export const TICK_MS = 1000;

/**
 * Ausência além disto não conta.
 *
 * Doze horas: o bastante para "dormi e ele está com fome" ser verdade, pouco o
 * bastante para "viajei um mês" não ser catástrofe. O bicho de quem sumiu por
 * trinta dias está exatamente igual ao de quem sumiu meio dia — com fome, não
 * destruído.
 */
export const MAX_AUSENCIA_MS = 12 * 60 * 60 * 1000;

/** Nenhuma necessidade cruza este piso, por mais longa que seja a ausência. */
export const PISO = 15;

/** Quanto cada necessidade muda por tick, acordado e dormindo. */
const TAXA = {
  acordado: { hunger: -0.4, energy: -0.3, happiness: -0.2 },
  dormindo: { hunger: -0.2, energy: +3.5, happiness: 0 },
} as const;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/**
 * Aplica `ticks` de decaimento.
 *
 * `bond` não aparece aqui de propósito: vínculo construído não se perde por
 * ausência. Ele só sobe, por cuidado e por aprendizagem.
 */
export function applyDecay(
  needs: Needs,
  ticks: number,
  isSleeping: boolean,
  piso = PISO,
): Needs {
  const taxa = isSleeping ? TAXA.dormindo : TAXA.acordado;
  return {
    hunger: clamp(needs.hunger + taxa.hunger * ticks, piso, 100),
    energy: clamp(needs.energy + taxa.energy * ticks, piso, 100),
    happiness: clamp(needs.happiness + taxa.happiness * ticks, piso, 100),
    bond: needs.bond,
  };
}

export interface ReconcileResult {
  needs: Needs;
  /** Ms realmente considerados, já limitados pelo teto. */
  aplicado: number;
  /** Ms ignorados por estarem além do teto. Útil para mensagem e telemetria. */
  ignorado: number;
  /** Frase para a criança, ou `null` se a ausência foi curta demais. */
  saudacao: string | null;
}

/**
 * Reconcilia o tempo em que o app esteve fechado.
 *
 * Chamado uma vez, ao carregar. É a diferença entre um bicho que vive e um
 * boneco que espera.
 */
export function reconcileElapsed(
  state: CreatureState,
  agora: number,
  maxAusencia = MAX_AUSENCIA_MS,
): ReconcileResult {
  const decorrido = Math.max(0, agora - state.lastTickAt);
  const aplicado = Math.min(decorrido, maxAusencia);
  const ignorado = decorrido - aplicado;
  const ticks = Math.floor(aplicado / TICK_MS);

  const needs = applyDecay(state.needs, ticks, state.isSleeping);
  return {
    needs,
    aplicado,
    ignorado,
    saudacao: saudacaoDeRetorno(state.nickname, decorrido, needs),
  };
}

/**
 * A frase de reencontro.
 *
 * Sempre acolhedora, mesmo depois de sumiço longo. A criança que voltou fez a
 * coisa certa ao voltar — a mensagem celebra isso em vez de cobrar.
 */
function saudacaoDeRetorno(
  nome: string,
  decorrido: number,
  needs: Needs,
): string | null {
  const horas = decorrido / 3_600_000;
  if (horas < 0.5) return null;

  if (needs.hunger <= 30) return `${nome} está com fome e ficou muito feliz de te ver!`;
  if (needs.energy <= 30) return `${nome} cochilou esperando por você.`;
  if (horas >= 24) return `${nome} sentiu sua falta! Que bom que você voltou.`;
  return `${nome} estava esperando por você!`;
}

// ---------------------------------------------------------------------------
// Emoção derivada
// ---------------------------------------------------------------------------

/**
 * Traduz necessidades em emoção.
 *
 * É esta tabela que liga os retratos de rosto e faz a criatura EXPRESSAR como
 * está sem ninguém mandar. É barata de implementar e é o que mais aumenta a
 * sensação de vida por linha de código escrita.
 *
 * A ordem importa: a necessidade mais urgente vence.
 */
export function emotionFor(needs: Needs, isSleeping: boolean): Emotion {
  if (isSleeping) return "dormindo";
  if (needs.hunger < 25) return "faminto";
  if (needs.energy < 20) return "exausto";
  if (needs.happiness < 30) return "triste";
  if (needs.hunger > 70 && needs.energy > 70 && needs.happiness > 70)
    return "radiante";
  return "contente";
}

/** Animação ociosa que corresponde a cada emoção. */
export const EMOTION_ANIM = {
  radiante: "happy",
  contente: "idle",
  faminto: "sad",
  exausto: "sit",
  triste: "sad",
  dormindo: "sleep",
} as const;
