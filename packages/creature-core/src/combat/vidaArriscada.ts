/**
 * Vida arriscada — a mecânica que impede o beat 'em up de ser tedioso.
 *
 * ## O problema que ela resolve
 *
 * Em beat 'em up clássico o especial custa vida e pronto. O jogador aprende
 * rápido que gastar vida é burrice, guarda o especial "para a emergência", e
 * passa o jogo inteiro apertando o mesmo botão de soco. Vira socar saco de
 * pancada — o defeito clássico do gênero.
 *
 * ## A solução do Streets of Rage 4
 *
 * O especial custa vida, **mas a vida gasta fica marcada e volta se você
 * continuar atacando sem apanhar**. Levou um golpe antes de recuperar? Perde
 * de vez.
 *
 * O efeito no comportamento é imediato: gastar deixa de ser prejuízo e vira
 * aposta. "Gastei 70 de vida, agora preciso conectar para recuperar." O jogador
 * para de se esconder e passa a atacar — que é onde o jogo é divertido.
 *
 * É a diferença entre um jogo que se joga por obrigação e um que se joga por
 * vontade. Vale mais que qualquer efeito visual.
 */

export interface BarraDeVida {
  /** Vida garantida — esta não volta sozinha. */
  atual: number;
  /**
   * Vida em risco: já foi gasta, ainda aparece na barra em outra cor, e volta
   * se o jogador conectar golpes sem apanhar.
   */
  emRisco: number;
  maxima: number;
}

export function novaBarra(maxima: number): BarraDeVida {
  return { atual: maxima, emRisco: 0, maxima };
}

/** Total mostrado na tela: o garantido mais o que ainda dá para recuperar. */
export function vidaVisivel(b: BarraDeVida): number {
  return b.atual + b.emRisco;
}

/** O jogador está vivo enquanto houver vida garantida. */
export function estaVivo(b: BarraDeVida): boolean {
  return b.atual > 0;
}

/**
 * Paga um especial com vida.
 *
 * Nunca mata: se o custo for maior que a vida garantida, gasta o que dá e
 * deixa 1 ponto. Morrer por usar o próprio especial seria punição sem lição —
 * e, num jogo pensado para criança, frustração pura.
 */
export function pagarComVida(b: BarraDeVida, custo: number): BarraDeVida {
  const pago = Math.min(custo, Math.max(0, b.atual - 1));
  return { ...b, atual: b.atual - pago, emRisco: b.emRisco + pago };
}

/**
 * Acertou o inimigo: recupera parte da vida em risco.
 *
 * A recuperação é proporcional ao dano causado, então um combo grande devolve
 * mais que um tapinha. É o que faz valer a pena continuar a ofensiva em vez de
 * dar um golpe e recuar.
 */
export function recuperarAoAcertar(b: BarraDeVida, dano: number, taxa = 0.5): BarraDeVida {
  const devolvido = Math.min(b.emRisco, dano * taxa);
  return { ...b, atual: b.atual + devolvido, emRisco: b.emRisco - devolvido };
}

/**
 * Apanhou: perde de vez o que estava em risco, e leva o dano.
 *
 * Esta é a metade que torna a mecânica uma aposta de verdade. Sem ela, gastar
 * vida não teria risco nenhum e a decisão perderia a graça.
 */
export function levarDano(b: BarraDeVida, dano: number): BarraDeVida {
  return { ...b, atual: Math.max(0, b.atual - dano), emRisco: 0 };
}

// ---------------------------------------------------------------------------
// Malabarismo — o que traz o combo de jogo de luta para o beat 'em up
// ---------------------------------------------------------------------------

/**
 * Controle de juggle.
 *
 * Foi assim que o SoR4 trouxe a sensação de Marvel vs Capcom para um beat 'em
 * up: dá para lançar o inimigo e mantê-lo no ar. Sem limite, viraria combo
 * infinito e o jogo perderia a graça; com limite, vira habilidade.
 *
 * A gravidade aumenta a cada golpe: quanto mais tempo o inimigo fica no ar,
 * mais rápido ele cai. O combo tem um teto natural em vez de um número
 * arbitrário — que é o jeito elegante de limitar.
 */
export interface EstadoAereo {
  golpesNoAr: number;
  gravidade: number;
}

export const JUGGLE_MAXIMO = 8;

export function novoEstadoAereo(): EstadoAereo {
  return { golpesNoAr: 0, gravidade: 1 };
}

export function podeContinuarNoAr(e: EstadoAereo): boolean {
  return e.golpesNoAr < JUGGLE_MAXIMO;
}

export function aplicarJuggle(e: EstadoAereo): EstadoAereo {
  return { golpesNoAr: e.golpesNoAr + 1, gravidade: e.gravidade * 1.18 };
}

/**
 * Dano com decaimento por combo.
 *
 * Sem isto, um combo longo mata em um toque e o jogo acaba. Com isto, combos
 * longos são bonitos e recompensadores, mas não decidem a partida sozinhos —
 * é a regra que todo jogo de luta usa, e ela existe para o jogo continuar
 * sendo jogo.
 */
export function danoComDecaimento(danoBase: number, golpeNumero: number): number {
  const fator = Math.max(0.25, 1 - golpeNumero * 0.09);
  return Math.round(danoBase * fator);
}
