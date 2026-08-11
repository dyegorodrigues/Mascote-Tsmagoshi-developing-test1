/**
 * ⚠️  ASSET DE PROTÓTIPO — NÃO PUBLICAR  ⚠️
 * ---------------------------------------------------------------------------
 * Personagens e sprites derivados de propriedade intelectual de terceiros.
 * Uso interno de desenvolvimento, teste e aprendizado APENAS.
 *
 * Este arquivo inteiro deve ser removido antes de qualquer distribuição
 * pública. A remoção é intencionalmente barata: apagar este arquivo e a linha
 * que o importa em `catalog/index.ts`. Nenhum outro código precisa mudar —
 * é para isso que existe a abstração `SpriteSource`.
 *
 * `portaoDePublicacao.test.ts` falha se alguma entrada `origin: "prototype"`
 * estiver presente quando `CREATURE_BUILD=production`. O portão não depende de
 * ninguém lembrar.
 * ---------------------------------------------------------------------------
 */
import type { CreatureDefinition } from "../types";

const pmd = (index: number) => ({ kind: "pmd", index }) as const;

export const CATALOGO_PROTOTIPO: CreatureDefinition[] = [
  {
    id: "proto-eletrico-1",
    name: "Faísca",
    origin: "prototype",
    sprite: pmd(25),
    fallback: { primary: "#FACC15", secondary: "#EAB308", eye: "#1E293B", feature: "orelhas" },
    element: "eletrico",
    favFood: "Fruta Oran",
    evolutions: [{ targetId: "proto-eletrico-2", minLevel: 22, minBond: 60 }],
    combat: {
      maxHealth: 900,
      walkSpeed: 2.2,
      dashSpeed: 5.5,
      jumpImpulse: 12,
      defense: 1.1,
      moves: ["soco_L", "soco_M", "chute_H", "lancador", "especial_236L"],
    },
  },
  {
    id: "proto-eletrico-2",
    name: "Trovão",
    origin: "prototype",
    sprite: pmd(26),
    fallback: { primary: "#F59E0B", secondary: "#D97706", eye: "#1E293B", feature: "cauda" },
    element: "eletrico",
    favFood: "Maçã Trovoada",
    combat: {
      maxHealth: 1050,
      walkSpeed: 2.0,
      dashSpeed: 5.0,
      jumpImpulse: 11,
      defense: 1.0,
      moves: ["soco_L", "soco_M", "chute_H", "lancador", "especial_236L"],
    },
  },
  {
    id: "proto-planta-1",
    name: "Broto",
    origin: "prototype",
    sprite: pmd(1),
    fallback: { primary: "#4ADE80", secondary: "#16A34A", eye: "#1E293B", feature: "bulbo" },
    element: "planta",
    favFood: "Semente Doce",
    evolutions: [{ targetId: "proto-planta-2", minLevel: 16, minBond: 40 }],
  },
  {
    id: "proto-planta-2",
    name: "Ramo",
    origin: "prototype",
    sprite: pmd(2),
    fallback: { primary: "#22C55E", secondary: "#15803D", eye: "#1E293B", feature: "bulbo" },
    element: "planta",
    favFood: "Semente Doce",
  },
  {
    id: "proto-fogo-1",
    name: "Brasa",
    origin: "prototype",
    sprite: pmd(4),
    fallback: { primary: "#FB923C", secondary: "#EA580C", eye: "#1E293B", feature: "chama" },
    element: "fogo",
    favFood: "Pimenta Doce",
    evolutions: [{ targetId: "proto-fogo-2", minLevel: 16, minBond: 40 }],
  },
  {
    id: "proto-fogo-2",
    name: "Fogaréu",
    origin: "prototype",
    sprite: pmd(5),
    fallback: { primary: "#F97316", secondary: "#C2410C", eye: "#1E293B", feature: "chama" },
    element: "fogo",
    favFood: "Pimenta Doce",
  },
  {
    id: "proto-agua-1",
    name: "Gota",
    origin: "prototype",
    sprite: pmd(7),
    fallback: { primary: "#38BDF8", secondary: "#0284C7", eye: "#1E293B", feature: "casco" },
    element: "agua",
    favFood: "Alga Fresca",
    evolutions: [{ targetId: "proto-agua-2", minLevel: 16, minBond: 40 }],
  },
  {
    id: "proto-agua-2",
    name: "Maré",
    origin: "prototype",
    sprite: pmd(8),
    fallback: { primary: "#0EA5E9", secondary: "#0369A1", eye: "#1E293B", feature: "casco" },
    element: "agua",
    favFood: "Alga Fresca",
  },
  {
    id: "proto-lutador",
    name: "Punho",
    origin: "prototype",
    sprite: pmd(447),
    fallback: { primary: "#60A5FA", secondary: "#1D4ED8", eye: "#0F172A", feature: "aura" },
    element: "lutador",
    favFood: "Barra de Energia",
    combat: {
      maxHealth: 1000,
      walkSpeed: 2.4,
      dashSpeed: 6.0,
      jumpImpulse: 13,
      defense: 0.95,
      moves: ["soco_L", "soco_M", "chute_H", "lancador", "especial_236L", "hyper_236236"],
    },
  },
];
