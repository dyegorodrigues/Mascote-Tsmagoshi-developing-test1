/**
 * Modelo de dados de combate — a fundação do jogo de luta.
 *
 * ## A decisão que governa este arquivo
 *
 * > **Golpe é DADO, não código.**
 *
 * Um golpe é um objeto: quantos quadros de preparação, quantos ativos, quantos
 * de recuperação, onde ficam as caixas de acerto, quanto tira, em que janela
 * pode ser cancelado no próximo. Nenhuma linha de lógica muda quando você
 * inventa um soco novo, e — o que importa mais — **você consegue ajustar o
 * balanceamento do jogo sem programar**. Um golpe lento demais vira um número
 * trocado, não uma tarefa de desenvolvedor.
 *
 * É assim que jogos de luta de verdade são construídos, e é o que separa um
 * protótipo que trava num "não dá para mexer nisso" de um que evolui por anos.
 *
 * ## Por que 60 quadros por segundo fixos
 *
 * Combo em jogo de luta depende de o quadro 7 ser sempre o quadro 7. Se a
 * simulação andar junto com a taxa de tela, o mesmo combo funciona num celular
 * e falha noutro. A simulação roda em passo fixo; o desenho interpola. Isso
 * não é otimização prematura: é a diferença entre o jogo ser jogável e não ser.
 *
 * Referência de gênero: Marvel vs Capcom — cadeias de golpes, lançador,
 * combo aéreo, especiais por movimento de direção, hyper com barra.
 */

export const FPS = 60;
export const FRAME_MS = 1000 / FPS;

/** Caixa em coordenadas locais do personagem. Origem: pés, centro. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MoveHeight = "baixo" | "medio" | "alto" | "aereo";

/** Como o golpe é invocado. Notação numérica clássica: 2=baixo, 6=frente. */
export type MoveInput =
  | { kind: "botao"; button: "L" | "M" | "H"; crouch?: boolean; air?: boolean }
  | { kind: "motion"; motion: "236" | "214" | "623" | "41236"; button: "L" | "M" | "H" }
  | { kind: "hyper"; motion: "236236" | "214214"; cost: number };

export interface HitProperties {
  damage: number;
  /** Quadros que o oponente fica travado ao ser acertado. */
  hitstun: number;
  /** Quadros travado ao defender. */
  blockstun: number;
  /** Empurrão horizontal aplicado ao oponente. */
  pushback: number;
  /** Só pode ser defendido agachado / em pé / de qualquer jeito. */
  guard: "baixo" | "alto" | "qualquer";
  /**
   * Joga o oponente para cima e abre combo aéreo. É o que permite as sequências
   * longas características do gênero.
   */
  launcher?: boolean;
  /** Impede que o oponente caia até o combo acabar. */
  juggle?: boolean;
}

export interface MoveDefinition {
  id: string;
  name: string;
  input: MoveInput;
  height: MoveHeight;
  /** Quadros até a primeira caixa de acerto aparecer. */
  startup: number;
  /** Quadros em que o golpe acerta. */
  active: number;
  /** Quadros presos depois, mesmo acertando. */
  recovery: number;
  /** Caixas ativas, por quadro relativo ao início da fase ativa. */
  hitboxes: Box[];
  hit: HitProperties;
  /**
   * Ids de golpes em que este pode ser cancelado, e a partir de qual quadro.
   *
   * É isto que faz combo existir. `cancels: { into: ['soco_medio'], from: 4 }`
   * significa: a partir do quarto quadro ativo, apertar médio emenda. Ajustar
   * combo do jogo inteiro é mexer nestes números.
   */
  cancels?: { into: string[]; from: number };
  /** Custo de barra, para hypers. */
  meterCost?: number;
  /** Quadros de invencibilidade desde o início. Usado em reversais. */
  invulnerable?: number;
  animation: string;
}

export type MoveSet = Record<string, MoveDefinition>;

/**
 * Vantagem em quadros ao acertar.
 *
 * Positivo = você recupera antes do oponente e pode continuar. É o número que
 * decide se um golpe é bom, e existir como função pura significa que dá para
 * testar o balanceamento sem abrir o jogo.
 */
export function frameAdvantageOnHit(m: MoveDefinition): number {
  return m.hit.hitstun - m.recovery;
}

export function frameAdvantageOnBlock(m: MoveDefinition): number {
  return m.hit.blockstun - m.recovery;
}

export function totalFrames(m: MoveDefinition): number {
  return m.startup + m.active + m.recovery;
}

/**
 * Verifica se um combo é possível só pelos números.
 *
 * Permite escrever um teste que diz "esta sequência de cinco golpes conecta" e
 * quebrar quando alguém desbalancear um deles. Balanceamento verificável por
 * teste, em vez de por tentativa.
 */
export function comboConnects(
  set: MoveSet,
  sequence: string[],
): { ok: boolean; failsAt?: number; reason?: string } {
  for (let i = 0; i < sequence.length - 1; i++) {
    const atual = set[sequence[i]];
    const proximo = set[sequence[i + 1]];
    if (!atual) return { ok: false, failsAt: i, reason: `golpe inexistente: ${sequence[i]}` };
    if (!proximo)
      return { ok: false, failsAt: i + 1, reason: `golpe inexistente: ${sequence[i + 1]}` };
    if (!atual.cancels?.into.includes(proximo.id))
      return { ok: false, failsAt: i, reason: `${atual.id} não cancela em ${proximo.id}` };
    if (frameAdvantageOnHit(atual) + proximo.startup > atual.hit.hitstun)
      return { ok: false, failsAt: i, reason: `${proximo.id} é lento demais para conectar` };
  }
  return { ok: true };
}

/** Caixa em coordenadas do mundo, considerando posição e lado do personagem. */
export function worldBox(box: Box, pos: { x: number; y: number }, facingRight: boolean): Box {
  return {
    x: facingRight ? pos.x + box.x : pos.x - box.x - box.w,
    y: pos.y + box.y,
    w: box.w,
    h: box.h,
  };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
