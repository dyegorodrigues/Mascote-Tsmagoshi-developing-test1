/**
 * Tipos fundamentais do Creature Engine.
 *
 * REGRA DE OURO DESTE ARQUIVO: nada aqui conhece Pokémon, PMD, canvas, React
 * ou qualquer fonte de arte específica. Um personagem é definido por dados; de
 * onde vem o desenho dele é detalhe de outra camada.
 *
 * É isso que torna a troca de arte futura uma operação de dados, e não uma
 * refatoração. Se um nome de franquia aparecer neste arquivo, o desenho errou.
 */

// ---------------------------------------------------------------------------
// Identidade e arte
// ---------------------------------------------------------------------------

/**
 * O id é `string` de propósito, e não uma união fechada de literais.
 *
 * O protótipo anterior usava `type CreatureId = 'pikachu' | 'raichu' | ...`, e
 * o efeito era que **adicionar um personagem exigia editar um tipo**. Catálogo
 * é dado; dado não deve morar no sistema de tipos. A validação de que um id
 * existe é feita em runtime pelo registro (`CreatureRegistry`), onde ela pode
 * cobrir também personagens carregados de fora do bundle.
 */
export type CreatureId = string;

/**
 * De onde vem o desenho de um personagem.
 *
 * União discriminada — o motor nunca pergunta "qual o pmdIndex?", pergunta
 * "qual a fonte?". Adicionar um formato novo é adicionar um membro aqui e um
 * provider correspondente; nenhum código de simulação muda.
 */
export type SpriteSource =
  /** Folhas no formato PMD (AnimData.xml + N-Anim.png). Asset de protótipo. */
  | { kind: "pmd"; index: number }
  /** Spritesheet própria + atlas JSON. É o formato-alvo da arte definitiva. */
  | { kind: "atlas"; sheet: string; atlas: string }
  /** Desenhado por código. Sempre disponível, nunca falha, nunca bonito. */
  | { kind: "procedural"; palette: ProceduralPalette };

export interface ProceduralPalette {
  primary: string;
  secondary: string;
  eye: string;
  /** Traço distintivo desenhado por cima da silhueta base. */
  feature: string;
}

// ---------------------------------------------------------------------------
// Animação
// ---------------------------------------------------------------------------

/**
 * Vocabulário de animação.
 *
 * Herdado do padrão PMD, que é um repertório testado por uma comunidade
 * inteira de jogos — não vale reinventar. Está dividido por uso para deixar
 * explícito o que cada contexto exige de um personagem novo.
 */
export const ANIM_VIDA = [
  "idle",
  "walk",
  "run",
  "sleep",
  "wake",
  "eat",
  "happy",
  "sad",
  "sit",
  "hop",
] as const;

export const ANIM_COMBATE = [
  "attack",
  "strike",
  "pose",
  "hurt",
  "cringe",
  "faint",
  "guard",
  "crouch",
  "jump",
  "land",
  "dash",
  "special",
] as const;

export const ANIM_NAMES = [...ANIM_VIDA, ...ANIM_COMBATE] as const;
export type AnimationName = (typeof ANIM_NAMES)[number];

/** O mínimo que um personagem precisa ter para existir como Tamagotchi. */
export const ANIM_MINIMO_VIDA: readonly AnimationName[] = [
  "idle",
  "walk",
  "eat",
  "sleep",
  "happy",
  "sad",
];

export type Direction8 =
  | "down"
  | "down-left"
  | "left"
  | "up-left"
  | "up"
  | "up-right"
  | "right"
  | "down-right";

export const DIRECTIONS: readonly Direction8[] = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
];

/** Converte um vetor em uma das 8 direções. */
export function vectorToDirection(dx: number, dy: number): Direction8 {
  const angle = Math.atan2(dy, dx);
  const octant = Math.round((8 * angle) / (2 * Math.PI) + 8) % 8;
  return DIRECTIONS[octant];
}

// ---------------------------------------------------------------------------
// Definição de personagem
// ---------------------------------------------------------------------------

export interface EvolutionRule {
  targetId: CreatureId;
  minLevel: number;
  /**
   * Vínculo mínimo. Existe porque evolução por nível puro premia quem grinda;
   * evolução por vínculo premia quem CUIDA. Para um app infantil a segunda é a
   * mensagem certa, e foi a melhor decisão de design do protótipo original.
   */
  minBond: number;
}

/**
 * Atributos de luta. Ficam separados do resto porque um personagem pode existir
 * só como companheiro, sem nunca entrar em combate.
 */
export interface CombatStats {
  maxHealth: number;
  /** Pixels por tick de simulação. */
  walkSpeed: number;
  dashSpeed: number;
  jumpImpulse: number;
  /** Multiplicador de dano recebido. 1 = normal. */
  defense: number;
  /** Ids de golpes em `MoveSet` que este personagem possui. */
  moves: string[];
}

export interface CreatureDefinition {
  id: CreatureId;
  name: string;
  /**
   * `prototype` marca asset temporário de terceiro que NÃO pode ser publicado.
   * O portão de publicação falha se qualquer personagem `prototype` estiver
   * presente numa build de produção. Ver `docs/PORTAO_DE_PUBLICACAO.md`.
   */
  origin: "prototype" | "original";
  sprite: SpriteSource;
  /** Sempre presente: é o que desenha quando a arte não carrega. */
  fallback: ProceduralPalette;
  element: string;
  favFood: string;
  evolutions?: EvolutionRule[];
  combat?: CombatStats;
}

// ---------------------------------------------------------------------------
// Estado vivo
// ---------------------------------------------------------------------------

/**
 * Necessidades, de 0 (crítico) a 100 (pleno).
 *
 * `bond` é diferente das outras três: ele **nunca decai**. Vínculo construído
 * não se perde por ausência — ver `docs/ARQUITETURA.md §Vida`.
 */
export interface Needs {
  hunger: number;
  energy: number;
  happiness: number;
  bond: number;
}

export type Emotion =
  | "radiante"
  | "contente"
  | "faminto"
  | "exausto"
  | "triste"
  | "dormindo";

export interface Vec2 {
  x: number;
  y: number;
}

export interface CreatureState {
  speciesId: CreatureId;
  nickname: string;
  level: number;
  xp: number;
  xpToNext: number;
  needs: Needs;
  isSleeping: boolean;
  position: Vec2;
  /** Destino do passeio autônomo ou de um comando. `null` = parado. */
  target: { pos: Vec2; speed: "walk" | "run" } | null;
  animation: AnimationName;
  direction: Direction8;
  /** Quando a animação atual expira e volta para `idle`. 0 = não expira. */
  animUntil: number;
  /**
   * Momento do último tick aplicado, em ms epoch.
   *
   * É o campo que permite o bicho VIVER com o app fechado: ao carregar, o
   * tempo decorrido é reconciliado. Sem ele, o Tamagotchi congela na ausência,
   * que é justamente o oposto do que define o gênero.
   */
  lastTickAt: number;
}

// ---------------------------------------------------------------------------
// Ponte com o mundo pedagógico
// ---------------------------------------------------------------------------

/**
 * O ÚNICO caminho pelo qual aprendizagem afeta a criatura.
 *
 * O motor não sabe o que é uma competência, uma ficha ou um currículo. Ele
 * recebe eventos tipados. Essa fronteira é o que permite o SAGA evoluir sem
 * arrastar o Creature Engine junto — e vice-versa.
 */
export interface RewardEvent {
  type: "CORRECT_ANSWER" | "COMPLETED_ACTIVITY" | "STREAK_BONUS" | "DAILY_LOGIN";
  xp: number;
  bond: number;
  happiness: number;
  message?: string;
}
