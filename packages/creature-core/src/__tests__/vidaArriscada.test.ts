import { describe, it, expect } from "vitest";
import {
  novaBarra, vidaVisivel, estaVivo, pagarComVida, recuperarAoAcertar, levarDano,
  novoEstadoAereo, podeContinuarNoAr, aplicarJuggle, danoComDecaimento, JUGGLE_MAXIMO,
} from "../index";

/**
 * A mecânica que decide se o jogo é divertido ou tedioso. Estes testes travam
 * o comportamento: arriscar tem que compensar, e apanhar tem que doer.
 */
describe("vida arriscada — a aposta do especial", () => {
  it("gastar vida move para a área de risco, não some da barra", () => {
    const b = pagarComVida(novaBarra(1000), 70);
    expect(b.atual).toBe(930);
    expect(b.emRisco).toBe(70);
    expect(vidaVisivel(b)).toBe(1000);
  });

  it("continuar atacando devolve a vida gasta, na proporção do dano", () => {
    // Gastou 100 → 900 garantido, 100 em risco.
    // Acertou 120 de dano × taxa 0.5 = 60 recuperados → 960 garantido, 40 em risco.
    let b = pagarComVida(novaBarra(1000), 100);
    b = recuperarAoAcertar(b, 120);
    expect(b.atual).toBe(960);
    expect(b.emRisco).toBe(40);
    expect(vidaVisivel(b)).toBe(1000);
  });

  it("um combo grande devolve tudo — é o prêmio por arriscar", () => {
    let b = pagarComVida(novaBarra(1000), 70);
    b = recuperarAoAcertar(b, 400);
    expect(b.emRisco).toBe(0);
    expect(b.atual).toBe(1000);
  });

  it("apanhar antes de recuperar perde a vida em risco de vez", () => {
    let b = pagarComVida(novaBarra(1000), 200);
    b = levarDano(b, 50);
    expect(b.emRisco).toBe(0);
    expect(b.atual).toBe(750);
    expect(vidaVisivel(b)).toBe(750);
  });

  it("nunca é possível morrer usando o próprio especial", () => {
    const b = pagarComVida({ atual: 40, emRisco: 0, maxima: 1000 }, 500);
    expect(b.atual).toBe(1);
    expect(estaVivo(b)).toBe(true);
  });

  it("a recuperação nunca devolve mais do que foi gasto", () => {
    let b = pagarComVida(novaBarra(1000), 50);
    b = recuperarAoAcertar(b, 99999);
    expect(b.atual).toBe(1000);
    expect(b.emRisco).toBe(0);
  });
});

describe("malabarismo aéreo — o combo de jogo de luta no beat 'em up", () => {
  it("a gravidade aumenta a cada golpe: o combo tem teto natural", () => {
    let e = novoEstadoAereo();
    const g0 = e.gravidade;
    for (let i = 0; i < 3; i++) e = aplicarJuggle(e);
    expect(e.gravidade).toBeGreaterThan(g0);
    expect(e.golpesNoAr).toBe(3);
  });

  it("o combo infinito é impossível", () => {
    let e = novoEstadoAereo();
    for (let i = 0; i < JUGGLE_MAXIMO; i++) e = aplicarJuggle(e);
    expect(podeContinuarNoAr(e)).toBe(false);
  });

  it("combo longo é bonito, mas não mata sozinho", () => {
    expect(danoComDecaimento(100, 0)).toBe(100);
    expect(danoComDecaimento(100, 5)).toBeLessThan(60);
    expect(danoComDecaimento(100, 30)).toBe(25);
  });
});
