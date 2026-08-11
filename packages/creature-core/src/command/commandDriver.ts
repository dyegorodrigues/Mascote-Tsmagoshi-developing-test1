import type { AnimationName, Direction8, Vec2 } from "../types";

/**
 * Fila de comandos — a ponte com o SAGA pedagógico.
 *
 * ## Por que isto existe
 *
 * A pergunta era "dá para usar o mascote dentro de um exercício de forma que
 * faça sentido?". A resposta é mais forte do que parece:
 *
 * > **Uma fila de comandos É um programa.**
 *
 * A criança monta `[andar, andar, pular, empurrar]` e a criatura executa na
 * ordem. Isso não é mascote enfeitando um exercício — é a competência de
 * sequenciamento *sendo* o exercício. Ela vê o próprio algoritmo rodar, erra,
 * localiza onde divergiu do esperado e conserta. Depuração, aos seis anos.
 *
 * ## Três propriedades inegociáveis
 *
 * 1. **Determinismo.** Mesmo programa + mesmo estado inicial = mesmo resultado,
 *    sempre. Sem isso não há exercício: a criança não pode ser reprovada por
 *    sorteio. Nada aqui usa `Math.random()` nem lê relógio.
 * 2. **Observabilidade.** Cada passo emite um evento com índice, resultado e
 *    motivo da falha. É isso que vira diagnóstico no SAGA — "travou no passo 3
 *    porque tentou atravessar a pedra" é ensinável; "errou" não é.
 * 3. **Passo a passo.** A execução pode ser avançada um comando por vez, para
 *    a criança acompanhar. Um programa que roda instantâneo não ensina nada.
 */

export type CommandKind =
  | "andar"
  | "virar"
  | "pular"
  | "empurrar"
  | "puxar"
  | "esperar"
  | "repetir";

export interface Command {
  kind: CommandKind;
  /** Passos, graus ou repetições, conforme o comando. */
  arg?: number;
  direction?: Direction8;
  /** Corpo do `repetir` — é o que torna a linguagem capaz de laço. */
  body?: Command[];
}

export type StepOutcome = "ok" | "bloqueado" | "fora-do-mundo" | "sem-alvo";

export interface StepEvent {
  /** Índice no programa achatado. Identifica o passo que falhou. */
  index: number;
  command: Command;
  outcome: StepOutcome;
  position: Vec2;
  direction: Direction8;
  animation: AnimationName;
}

export interface WorldGrid {
  width: number;
  height: number;
  /** `true` = intransponível. */
  blocked: (x: number, y: number) => boolean;
  /** Objeto empurrável na célula, se houver. */
  pushable?: (x: number, y: number) => boolean;
}

export interface CommandActor {
  position: Vec2;
  direction: Direction8;
}

const DELTA: Record<Direction8, Vec2> = {
  right: { x: 1, y: 0 },
  "down-right": { x: 1, y: 1 },
  down: { x: 0, y: 1 },
  "down-left": { x: -1, y: 1 },
  left: { x: -1, y: 0 },
  "up-left": { x: -1, y: -1 },
  up: { x: 0, y: -1 },
  "up-right": { x: 1, y: -1 },
};

const ORDEM: Direction8[] = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
];

/**
 * Achata laços em uma lista linear de comandos.
 *
 * Feito antes de executar para que cada passo tenha um índice estável — é esse
 * índice que o SAGA usa para dizer "o erro está no passo 4". Um `repetir` que
 * expandisse durante a execução tornaria o índice imprevisível.
 *
 * O limite de expansão evita que `repetir 99999` trave a aba de uma criança.
 */
export function flatten(program: Command[], maxSteps = 512): Command[] {
  const out: Command[] = [];
  const walk = (cmds: Command[]) => {
    for (const c of cmds) {
      if (out.length >= maxSteps) return;
      if (c.kind === "repetir") {
        const n = Math.max(0, Math.floor(c.arg ?? 0));
        for (let i = 0; i < n; i++) walk(c.body ?? []);
      } else {
        out.push(c);
      }
    }
  };
  walk(program);
  return out;
}

/**
 * Executor determinístico, um passo por chamada.
 *
 * Guarda o estado da execução em vez de rodar tudo de uma vez, para que a UI
 * possa animar cada passo e a criança acompanhar o próprio raciocínio.
 */
export class CommandRunner {
  private steps: Command[];
  private cursor = 0;
  readonly events: StepEvent[] = [];

  constructor(
    program: Command[],
    private actor: CommandActor,
    private world: WorldGrid,
  ) {
    this.steps = flatten(program);
  }

  get done(): boolean {
    return this.cursor >= this.steps.length;
  }

  get progress(): { atual: number; total: number } {
    return { atual: this.cursor, total: this.steps.length };
  }

  /** Executa o próximo comando. Devolve `null` quando o programa acabou. */
  step(): StepEvent | null {
    if (this.done) return null;
    const command = this.steps[this.cursor];
    const outcome = this.apply(command);
    const event: StepEvent = {
      index: this.cursor,
      command,
      outcome,
      position: { ...this.actor.position },
      direction: this.actor.direction,
      animation: this.animationFor(command, outcome),
    };
    this.events.push(event);
    this.cursor++;
    return event;
  }

  /** Roda até o fim. Conveniência para testes e para verificar uma solução. */
  runToEnd(): StepEvent[] {
    while (!this.done) this.step();
    return this.events;
  }

  /**
   * O primeiro passo que não deu certo.
   *
   * É a pergunta pedagógica que importa — "onde exatamente divergiu?" — e é a
   * prática `localizar a primeira divergência`, que é depuração de verdade.
   */
  firstFailure(): StepEvent | null {
    return this.events.find((e) => e.outcome !== "ok") ?? null;
  }

  private apply(c: Command): StepOutcome {
    switch (c.kind) {
      case "virar": {
        const passos = Math.floor(c.arg ?? 1);
        const i = ORDEM.indexOf(this.actor.direction);
        this.actor.direction = ORDEM[(i + passos + ORDEM.length * 8) % ORDEM.length];
        return "ok";
      }
      case "andar":
      case "pular": {
        const n = Math.max(1, Math.floor(c.arg ?? 1));
        const d = DELTA[c.direction ?? this.actor.direction];
        if (c.direction) this.actor.direction = c.direction;
        for (let i = 0; i < n; i++) {
          const nx = this.actor.position.x + d.x;
          const ny = this.actor.position.y + d.y;
          if (nx < 0 || ny < 0 || nx >= this.world.width || ny >= this.world.height)
            return "fora-do-mundo";
          // Pular passa por cima de obstáculo, mas não sai do mundo.
          if (c.kind === "andar" && this.world.blocked(nx, ny)) return "bloqueado";
          this.actor.position = { x: nx, y: ny };
        }
        return "ok";
      }
      case "empurrar":
      case "puxar": {
        const d = DELTA[this.actor.direction];
        const ax = this.actor.position.x + d.x;
        const ay = this.actor.position.y + d.y;
        if (!this.world.pushable?.(ax, ay)) return "sem-alvo";
        const sinal = c.kind === "empurrar" ? 1 : -1;
        const dx = this.actor.position.x + d.x * sinal;
        const dy = this.actor.position.y + d.y * sinal;
        if (dx < 0 || dy < 0 || dx >= this.world.width || dy >= this.world.height)
          return "fora-do-mundo";
        this.actor.position = { x: dx, y: dy };
        return "ok";
      }
      case "esperar":
        return "ok";
      default:
        return "ok";
    }
  }

  private animationFor(c: Command, outcome: StepOutcome): AnimationName {
    if (outcome !== "ok") return "cringe";
    switch (c.kind) {
      case "pular":
        return "jump";
      case "empurrar":
      case "puxar":
        return "strike";
      case "andar":
        return "walk";
      default:
        return "idle";
    }
  }
}
