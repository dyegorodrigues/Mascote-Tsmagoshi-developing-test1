/**
 * Contrato de arte — a bíblia de estilo, em código.
 *
 * ## Por que isto é código e não um documento
 *
 * Um documento de estilo é lido uma vez e esquecido. Este arquivo é importado
 * pelo gerador de encomenda, então toda peça de arte pedida sai automaticamente
 * com as mesmas medidas. A consistência para de depender de memória.
 *
 * ## O defeito que ele existe para impedir
 *
 * Marvel vs Capcom 2 juntou sprites de jogos diferentes, em resoluções
 * diferentes. O resultado é o que o autor chamou de "podrão": personagens que
 * não parecem pertencer ao mesmo jogo. Não foi falta de talento — foi falta de
 * contrato.
 *
 * O elenco atual já tem essa doença em estágio inicial: o tigre e o leão foram
 * gerados grandes, o T-Rex bem menor. Postos lado a lado, brigam.
 *
 * > **Resolução misturada é o defeito mais caro de consertar e o mais barato de
 * > prevenir.** Prevenir é escrever um número aqui.
 */

// ---------------------------------------------------------------------------
// Medidas
// ---------------------------------------------------------------------------

/**
 * A célula onde cada quadro é desenhado.
 *
 * Maior que o personagem de propósito: um chute alto, um golpe com o braço
 * esticado ou uma capa ao vento precisam de espaço além da silhueta parada. Se
 * a célula for justa, o primeiro golpe grande obriga a refazer a folha inteira.
 */
export const CELULA = { largura: 384, altura: 384 } as const;

/**
 * Altura do personagem em pé, dentro da célula.
 *
 * 256 px é a medida que faz pixel art parecer nítida no celular sem virar
 * arquivo gigante, e deixa 128 px de folga para os golpes.
 */
export const ALTURA_PERSONAGEM = 256;

/**
 * O ponto de ancoragem: onde os pés tocam o chão.
 *
 * Tudo no jogo é posicionado por este ponto — sombra, colisão, ordem de
 * desenho. Se cada personagem tiver o pivô num lugar, um flutua e o outro
 * afunda no chão. É o erro mais comum e o mais visível.
 */
export const PIVO = { x: CELULA.largura / 2, y: 344 } as const;

/**
 * Proporção do corpo, em cabeças.
 *
 * O autor foi explícito: **nada de chibi**. Personagem de jogo de luta adulto
 * fica entre 6 e 7 cabeças; chibi fica em 2 ou 3. Registrar o número evita que
 * um personagem novo saia fofinho no meio de um elenco heroico.
 */
export const PROPORCAO_CABECAS = 6.5;

/**
 * Limite de cores por personagem.
 *
 * Pixel art de alta resolução sem disciplina de paleta vira desenho borrado com
 * cara de filtro. Uma paleta enxuta é o que dá o aspecto "feito à mão" em vez
 * de "gerado".
 */
export const MAX_CORES = 32;

/** Tamanho dos retratos de rosto do painel de emoção. */
export const RETRATO = { largura: 128, altura: 128 } as const;

// ---------------------------------------------------------------------------
// O que cada animação precisa ter
// ---------------------------------------------------------------------------

export interface EspecificacaoDeAnimacao {
  id: string;
  nome: string;
  /** Quantos quadros. Mais quadros = mais fluido = mais caro. */
  quadros: number;
  /** `frente` para o companheiro; `lado` para luta. */
  vista: "frente" | "lado" | "ambas";
  /** Volta ao primeiro quadro, ou toca uma vez e para. */
  ciclo: boolean;
  descricao: string;
  /** `vida` = Tamagotchi · `luta` = combate · `saga` = exercício pedagógico */
  uso: ("vida" | "luta" | "saga")[];
}

/**
 * As animações, em ordem de prioridade real.
 *
 * A ordem importa: quem encomendar de cima para baixo tem um companheiro
 * funcionando antes de gastar com combate. Quem começar pelos golpes gasta
 * caro e não tem nada jogável.
 */
export const ANIMACOES: EspecificacaoDeAnimacao[] = [
  // --- Companheiro: o mínimo para o bicho estar vivo -----------------------
  { id: "idle", nome: "Parado, respirando", quadros: 6, vista: "frente", ciclo: true,
    descricao: "Peito sobe e desce, cauda ou orelha mexe de leve. É o que a criança mais vê.",
    uso: ["vida", "saga"] },
  { id: "walk", nome: "Andando", quadros: 8, vista: "ambas", ciclo: true,
    descricao: "Passada completa, contato-passagem-contato.", uso: ["vida", "luta", "saga"] },
  { id: "eat", nome: "Comendo", quadros: 6, vista: "frente", ciclo: false,
    descricao: "Leva a comida à boca, mastiga, se satisfaz.", uso: ["vida"] },
  { id: "happy", nome: "Comemorando", quadros: 6, vista: "frente", ciclo: false,
    descricao: "Pulinho ou punho ao alto. É a recompensa por acertar no SAGA.", uso: ["vida", "saga"] },
  { id: "sad", nome: "Triste", quadros: 4, vista: "frente", ciclo: true,
    descricao: "Ombros caídos, orelhas baixas. Nunca sofrido demais — é criança olhando.",
    uso: ["vida"] },
  { id: "sleep", nome: "Dormindo", quadros: 4, vista: "frente", ciclo: true,
    descricao: "Deitado ou sentado encostado, respiração lenta.", uso: ["vida"] },

  // --- Exercício pedagógico ------------------------------------------------
  { id: "jump", nome: "Pulando", quadros: 6, vista: "lado", ciclo: false,
    descricao: "Agacha, impulsiona, sobe, cai, amortece.", uso: ["luta", "saga"] },
  { id: "push", nome: "Empurrando", quadros: 4, vista: "lado", ciclo: true,
    descricao: "Corpo inclinado, mãos à frente, esforço visível.", uso: ["saga"] },

  // --- Combate -------------------------------------------------------------
  { id: "guard", nome: "Defendendo", quadros: 2, vista: "lado", ciclo: true,
    descricao: "Braços à frente do corpo, peso atrás.", uso: ["luta"] },
  { id: "crouch", nome: "Agachado", quadros: 2, vista: "lado", ciclo: true,
    descricao: "Base baixa, pronto para o golpe baixo.", uso: ["luta"] },
  { id: "attack_L", nome: "Soco leve", quadros: 5, vista: "lado", ciclo: false,
    descricao: "Rápido, curto. Quadro de impacto bem marcado.", uso: ["luta"] },
  { id: "attack_M", nome: "Soco médio", quadros: 7, vista: "lado", ciclo: false,
    descricao: "Rotação de tronco, mais alcance.", uso: ["luta"] },
  { id: "attack_H", nome: "Chute forte", quadros: 9, vista: "lado", ciclo: false,
    descricao: "Perna estendida. É onde a célula grande se paga.", uso: ["luta"] },
  { id: "launcher", nome: "Lançador", quadros: 7, vista: "lado", ciclo: false,
    descricao: "Golpe ascendente que joga o inimigo para cima.", uso: ["luta"] },
  { id: "grab", nome: "Agarrando", quadros: 6, vista: "lado", ciclo: false,
    descricao: "Avança, segura o inimigo.", uso: ["luta"] },
  { id: "hurt", nome: "Apanhando", quadros: 3, vista: "lado", ciclo: false,
    descricao: "Recua com o impacto. Curto e legível.", uso: ["luta"] },
  { id: "dash", nome: "Investida", quadros: 5, vista: "lado", ciclo: false,
    descricao: "Arranque baixo e rápido, rastro de movimento.", uso: ["luta"] },
  { id: "special", nome: "Especial", quadros: 12, vista: "lado", ciclo: false,
    descricao: "O golpe assinatura. Aqui é onde vale gastar quadros.", uso: ["luta"] },
  { id: "faint", nome: "Derrotado", quadros: 5, vista: "lado", ciclo: false,
    descricao: "Cai e fica caído. Nunca sangrento — é jogo infantil.", uso: ["luta"] },
];

/** As seis emoções do painel do companheiro. */
export const RETRATOS = [
  { id: "radiante", descricao: "Olhos brilhando, sorriso aberto" },
  { id: "contente", descricao: "Expressão tranquila, leve sorriso" },
  { id: "faminto", descricao: "Olhando para o lado, língua de leve, olhos pidões" },
  { id: "exausto", descricao: "Olhos semicerrados, boca aberta em bocejo" },
  { id: "triste", descricao: "Sobrancelhas caídas, olhar baixo" },
  { id: "dormindo", descricao: "Olhos fechados, expressão serena" },
] as const;

// ---------------------------------------------------------------------------
// Pacotes de encomenda
// ---------------------------------------------------------------------------

/**
 * O que pedir em cada etapa.
 *
 * Separar em pacotes existe para impedir o erro mais caro: encomendar tudo de
 * uma vez. O pacote `companheiro` sozinho já entrega um bicho vivo no
 * aplicativo — e é 1/4 do custo do conjunto completo.
 */
export const PACOTES = {
  companheiro: ["idle", "walk", "eat", "happy", "sad", "sleep"],
  saga: ["jump", "push"],
  luta: [
    "guard", "crouch", "attack_L", "attack_M", "attack_H",
    "launcher", "grab", "hurt", "dash", "special", "faint",
  ],
} as const;

export function quadrosDoPacote(pacote: keyof typeof PACOTES): number {
  const ids = new Set<string>(PACOTES[pacote]);
  return ANIMACOES.filter((a) => ids.has(a.id)).reduce((s, a) => s + a.quadros, 0);
}
