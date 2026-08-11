/**
 * Personagens ORIGINAIS — propriedade integral do projeto.
 *
 * Este arquivo sobrevive à publicação. Tudo que estiver aqui precisa ter
 * cessão de direitos comerciais por escrito.
 *
 * MAGOSHA é o mais importante da lista: é o T-Rex em pixel art que já existe
 * na branch `agent/creature-engine-tamagotchi` do SAGA, em formato spritesheet
 * 4096×4096 + atlas com pivô nos pés. Ele é a PROVA de que a abstração de
 * sprite funciona — enquanto ele rodar lado a lado com os personagens de
 * protótipo, a troca futura está garantida. Ver `docs/ARQUITETURA.md §Troca`.
 */
import type { CreatureDefinition } from "../types";

export const CATALOGO_ORIGINAL: CreatureDefinition[] = [
  {
    id: "magosha",
    name: "Magosha",
    origin: "original",
    sprite: {
      kind: "atlas",
      sheet: "/sprites/magosha/MAGOSHA_spritesheet_4096.png",
      atlas: "/sprites/magosha/atlas.json",
    },
    fallback: { primary: "#4D7C0F", secondary: "#365314", eye: "#F8FAFC", feature: "crista" },
    element: "terra",
    favFood: "Folha Gigante",
    combat: {
      maxHealth: 1200,
      walkSpeed: 1.9,
      dashSpeed: 4.8,
      jumpImpulse: 10,
      defense: 0.85,
      moves: ["soco_L", "soco_M", "chute_H", "lancador"],
    },
  },
  {
    id: "lumina",
    name: "Lumina",
    origin: "original",
    // Ainda sem arte: o fallback procedural desenha e o app não quebra.
    // É exatamente para este caso que o fallback existe.
    sprite: {
      kind: "procedural",
      palette: { primary: "#FDE68A", secondary: "#F59E0B", eye: "#1E293B", feature: "estrela" },
    },
    fallback: { primary: "#FDE68A", secondary: "#F59E0B", eye: "#1E293B", feature: "estrela" },
    element: "luz",
    favFood: "Néctar de Estrela",
  },
];
