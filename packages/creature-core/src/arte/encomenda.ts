import {
  ANIMACOES, RETRATOS, PACOTES, CELULA, ALTURA_PERSONAGEM, PIVO,
  PROPORCAO_CABECAS, MAX_CORES, RETRATO, quadrosDoPacote,
} from "./contrato";

/**
 * Gerador de ficha de encomenda de arte.
 *
 * ## O problema real
 *
 * O autor sabe o que quer e não sabe como pedir. É um problema de vocabulário,
 * não de gosto — e é o que faz uma geração por IA sair "amadora": o pedido não
 * disse tamanho, nem pivô, nem paleta, nem proporção, então cada imagem volta
 * com uma coisa diferente.
 *
 * Esta função pega o personagem e devolve o texto pronto para colar numa
 * ferramenta como o PixelLab, já com todas as medidas do contrato.
 *
 * ## A regra que sozinha resolve a inconsistência
 *
 * Modelos de imagem não mantêm um personagem igual entre quadros. A defesa é
 * **nunca gerar do zero duas vezes**: uma única imagem de referência é criada,
 * aprovada, e todo o resto é gerado a partir dela.
 *
 * A ficha coloca essa regra em letras maiúsculas no topo, porque é a única que,
 * se for quebrada, invalida tudo o que vier depois.
 */

export interface PedidoDeArte {
  nome: string;
  /** Espécie e roupa. Ex.: "tigre antropomórfico de judogi azul-marinho". */
  descricao: string;
  paleta: string[];
  /** Traços que não podem sumir entre um quadro e outro. */
  marcasRegistradas: string[];
  pacote: keyof typeof PACOTES;
  /** Caminho ou URL da imagem de referência já aprovada, se existir. */
  referencia?: string;
  /** Segunda forma, para personagens que se transformam. */
  formaAlternativa?: { nome: string; descricao: string; oQuePermanece: string };
}

const linha = (n = 74) => "─".repeat(n);

export function gerarFicha(p: PedidoDeArte): string {
  const ids = new Set<string>(PACOTES[p.pacote]);
  const anims = ANIMACOES.filter((a) => ids.has(a.id));
  const totalQuadros = quadrosDoPacote(p.pacote);

  const out: string[] = [];
  const add = (s = "") => out.push(s);

  add(`FICHA DE ENCOMENDA DE ARTE — ${p.nome.toUpperCase()}`);
  add(`Pacote: ${p.pacote} · ${anims.length} animações · ${totalQuadros} quadros`);
  add(linha());
  add();

  add("⚠️  REGRA QUE VALE ACIMA DE TODAS");
  add();
  if (p.referencia) {
    add(`    Gere TUDO a partir da referência aprovada: ${p.referencia}`);
  } else {
    add("    PRIMEIRO gere UMA imagem de referência em pose parada e aprove-a.");
    add("    Só depois gere as animações, sempre A PARTIR dela.");
  }
  add("    NUNCA gere um quadro do zero. O personagem muda entre gerações, e é");
  add("    isso que faz o resultado parecer amador.");
  add();

  add("PERSONAGEM");
  add(linha());
  add(`  Nome ............ ${p.nome}`);
  add(`  Descrição ....... ${p.descricao}`);
  add(`  Marcas fixas .... ${p.marcasRegistradas.join(", ")}`);
  add(`  Paleta .......... ${p.paleta.join("  ")}`);
  add();

  add("MEDIDAS — iguais para todo o elenco, sem exceção");
  add(linha());
  add(`  Célula .......... ${CELULA.largura} × ${CELULA.altura} px`);
  add(`  Altura em pé .... ${ALTURA_PERSONAGEM} px (a folga é para golpes esticados)`);
  add(`  Pivô (pés) ...... x=${PIVO.x}, y=${PIVO.y} — igual em TODOS os quadros`);
  add(`  Proporção ....... ${PROPORCAO_CABECAS} cabeças — adulto heroico, NÃO chibi`);
  add(`  Cores ........... máximo ${MAX_CORES}`);
  add(`  Fundo ........... transparente de verdade (PNG com canal alfa)`);
  add(`  Estilo .......... pixel art de alta resolução, traço limpo, sem desfoque`);
  add();

  add("ANIMAÇÕES");
  add(linha());
  for (const a of anims) {
    add(`  ${a.id.padEnd(11)} ${String(a.quadros).padStart(2)} quadros · ${a.vista.padEnd(6)} · ${a.ciclo ? "ciclo" : "uma vez"}`);
    add(`  ${" ".repeat(11)} ${a.descricao}`);
    add();
  }

  if (p.pacote === "companheiro") {
    add(`RETRATOS DE ROSTO — ${RETRATO.largura} × ${RETRATO.altura} px, só cabeça e ombros`);
    add(linha());
    for (const r of RETRATOS) add(`  ${r.id.padEnd(11)} ${r.descricao}`);
    add();
  }

  if (p.formaAlternativa) {
    add("SEGUNDA FORMA");
    add(linha());
    add(`  Nome ............ ${p.formaAlternativa.nome}`);
    add(`  Descrição ....... ${p.formaAlternativa.descricao}`);
    add(`  O que permanece . ${p.formaAlternativa.oQuePermanece}`);
    add();
    add("  A roupa atravessa a transformação, rasgada e esticada pelo corpo novo.");
    add("  É isso que faz o olho reconhecer que é o mesmo personagem — sem essa");
    add("  continuidade, parecem dois personagens diferentes em vez de um que");
    add("  se transforma.");
    add();
  }

  add("ENTREGA");
  add(linha());
  add("  1. PNG com transparência real — nunca JPG, que não tem canal alfa");
  add("  2. Uma folha por animação, quadros lado a lado, espaçamento uniforme");
  add("  3. Arquivo-fonte .ase (Aseprite) de CADA animação");
  add("  4. JSON de atlas com posição de cada quadro e o pivô");
  add();
  add("  O item 3 é inegociável. Sem o arquivo-fonte, cada pose futura é um");
  add("  recomeço, e o custo do personagem nunca para de subir.");
  add();

  add("SE FOR CONTRATAR UMA PESSOA");
  add(linha());
  add("  Exija cessão total de direitos comerciais, por escrito, no contrato.");
  add("  Sem isso, o personagem não pode ser vendido — e descobrir isso depois");
  add("  de pronto é perder o investimento inteiro.");
  add();

  add(linha());
  add(`Total: ${totalQuadros} quadros${p.pacote === "companheiro" ? ` + ${RETRATOS.length} retratos` : ""}`);

  return out.join("\n");
}

/**
 * O elenco atual, pronto para gerar ficha.
 *
 * Todos compartilham o judogi azul-marinho e a faixa preta — a decisão de
 * figurino que já existe nas artes e que dá unidade ao grupo. É de graça e
 * vale mais que qualquer efeito: o olho reconhece "mesmo time" antes de
 * reconhecer qualquer outra coisa.
 */
export const ELENCO: Record<string, Omit<PedidoDeArte, "pacote">> = {
  tigre: {
    nome: "Tigre",
    descricao: "tigre antropomórfico musculoso, judogi azul-marinho de mangas rasgadas, faixa preta",
    paleta: ["#E8933A", "#F5C98A", "#2B2118", "#3B3F6B", "#FFFFFF"],
    marcasRegistradas: ["listras pretas", "judogi azul-marinho", "faixa preta", "cauda listrada"],
  },
  leao: {
    nome: "Leão",
    descricao: "leão antropomórfico musculoso, juba castanha, judogi azul-marinho, faixa preta",
    paleta: ["#E8B84B", "#8A5A2B", "#2B2118", "#3B3F6B", "#FFFFFF"],
    marcasRegistradas: ["juba castanha volumosa", "judogi azul-marinho", "faixa preta", "tufo na cauda"],
  },
  trex: {
    nome: "Magosha",
    descricao: "T-Rex antropomórfico, pele verde, judogi azul-marinho, faixa preta",
    paleta: ["#4D7C0F", "#365314", "#2B2118", "#3B3F6B", "#F8FAFC"],
    marcasRegistradas: ["escamas verdes", "judogi azul-marinho", "faixa preta", "cauda grossa"],
  },
  lobo: {
    nome: "Lobo",
    descricao: "rapaz de camisa vermelha, colete azul, bermuda cinza e tênis vermelho e branco",
    paleta: ["#C0392B", "#3B6EA5", "#8C8C8C", "#E8E8E8", "#2B2118"],
    marcasRegistradas: ["camisa vermelha", "colete azul", "bermuda cinza", "tênis vermelho e branco"],
    formaAlternativa: {
      nome: "Lobo transformado",
      descricao: "lobisomem cinza musculoso, focinho aberto, olhos amarelos",
      oQuePermanece: "a mesma camisa vermelha e a mesma bermuda cinza, agora rasgadas pelo corpo maior",
    },
  },
};
