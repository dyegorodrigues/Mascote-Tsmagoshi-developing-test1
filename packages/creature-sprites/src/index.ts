import type { AnimationName, Direction8, SpriteSource, ProceduralPalette } from "@creature/core";

/**
 * Provedores de sprite.
 *
 * O motor de simulação nunca importa este pacote. Ele só conhece `SpriteSource`
 * como dado; quem sabe transformar isso em pixels é aqui. Trocar a arte do jogo
 * inteiro é trocar o `SpriteSource` de cada personagem no catálogo — nenhuma
 * linha de simulação muda.
 */

export interface Frame {
  image: CanvasImageSource;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Deslocamento para alinhar os pés do personagem ao chão. */
  pivotX: number;
  pivotY: number;
}

export interface SpriteProvider {
  readonly ready: boolean;
  load(): Promise<void>;
  /** Devolve o quadro atual, ou `null` se ainda não carregou. */
  frame(anim: AnimationName, dir: Direction8, timeMs: number): Frame | null;
}

const carregarImagem = (src: string): Promise<HTMLImageElement> =>
  new Promise((ok, erro) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error(`falhou ao carregar ${src}`));
    img.src = src;
  });

// ---------------------------------------------------------------------------
// Atlas próprio — o formato-alvo da arte definitiva
// ---------------------------------------------------------------------------

interface AtlasJson {
  meta: {
    image: string;
    grid: { cell_w: number; cell_h: number; spacing_x: number; spacing_y: number; margin: number };
    pivot: { pixels_in_cell: { x: number; y: number } };
    fps: Record<string, number>;
  };
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
}

/**
 * Lê spritesheet + atlas JSON — o formato do MAGOSHA.
 *
 * É o formato para o qual a arte definitiva deve ser encomendada: o Aseprite
 * exporta exatamente isso, e ele suporta quantos estados de animação forem
 * precisos, ao contrário de um conjunto fixo de PNGs estáticos.
 */
export class AtlasProvider implements SpriteProvider {
  private img: HTMLImageElement | null = null;
  private data: AtlasJson | null = null;
  ready = false;

  constructor(private sheetUrl: string, private atlasUrl: string) {}

  async load(): Promise<void> {
    const [img, data] = await Promise.all([
      carregarImagem(this.sheetUrl),
      fetch(this.atlasUrl).then((r) => {
        // Um 404 devolve HTML; sem esta checagem o `.json()` estoura com um
        // erro de sintaxe confuso em vez de dizer que o arquivo não existe.
        if (!r.ok) throw new Error(`atlas ausente: ${this.atlasUrl}`);
        return r.json() as Promise<AtlasJson>;
      }),
    ]);
    this.img = img;
    this.data = data;
    this.ready = true;
  }

  frame(anim: AnimationName, dir: Direction8, timeMs: number): Frame | null {
    if (!this.img || !this.data) return null;
    const nome = this.resolverNome(anim, dir);
    const chaves = Object.keys(this.data.frames).filter((k) => k.startsWith(nome + "_"));
    if (chaves.length === 0) return null;

    const fps = this.data.meta.fps[nome] ?? this.data.meta.fps.default ?? 10;
    const idx = Math.floor((timeMs / 1000) * fps) % chaves.length;
    const f = this.data.frames[`${nome}_${idx}`] ?? this.data.frames[chaves[0]];
    const p = this.data.meta.pivot.pixels_in_cell;

    return {
      image: this.img,
      sx: f.frame.x,
      sy: f.frame.y,
      sw: f.frame.w,
      sh: f.frame.h,
      pivotX: p.x,
      pivotY: p.y,
    };
  }

  /** Mapeia animação+direção para o nome usado no atlas, com degradação. */
  private resolverNome(anim: AnimationName, dir: Direction8): string {
    const olhandoEsquerda = dir.includes("left");
    if (anim === "walk" || anim === "run")
      return olhandoEsquerda ? "walk_left" : "walk_right";
    if (this.data?.meta.fps[anim] !== undefined) return anim;
    // Sem o estado pedido, cai para o mais próximo que existe. É melhor um
    // bicho parado do que um buraco na tela.
    return "idle_life";
  }
}

// ---------------------------------------------------------------------------
// PMD — asset de protótipo
// ---------------------------------------------------------------------------

interface PmdAnim {
  image: HTMLImageElement;
  frameW: number;
  frameH: number;
  durations: number[];
}

/**
 * ⚠️ PROVEDOR DE PROTÓTIPO — remover antes de publicar.
 *
 * Duas diferenças importantes em relação ao protótipo original:
 *
 * 1. **Local primeiro.** Tenta `/sprites/pmd/<id>/` antes de qualquer rede. Um
 *    script baixa os sprites uma vez; depois o app funciona offline, abre
 *    rápido e não depende de um repositório de terceiros continuar no ar. Isso
 *    resolve um problema real de hoje — criança com tablet sem wifi — e já
 *    deixa a estrutura pronta para a arte definitiva usar a mesma pasta.
 * 2. **Nunca lança.** Se não achar, devolve `null` e o desenho procedural
 *    assume. Falta de arte não pode virar tela quebrada.
 */
export class PmdProvider implements SpriteProvider {
  private anims = new Map<string, PmdAnim>();
  ready = false;

  private static readonly LOCAL = "/sprites/pmd";
  private static readonly REMOTO =
    "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite";

  constructor(private index: number, private permitirRede = true) {}

  private get id(): string {
    return String(this.index).padStart(4, "0");
  }

  async load(): Promise<void> {
    for (const base of this.bases()) {
      try {
        await this.carregarDe(base);
        this.ready = true;
        return;
      } catch {
        /* tenta a próxima origem */
      }
    }
    // Silêncio proposital: sem sprite, o procedural desenha.
    this.ready = false;
  }

  private bases(): string[] {
    const locais = [`${PmdProvider.LOCAL}/${this.id}`];
    return this.permitirRede ? [...locais, `${PmdProvider.REMOTO}/${this.id}`] : locais;
  }

  private async carregarDe(base: string): Promise<void> {
    const xml = new DOMParser().parseFromString(
      await fetch(`${base}/AnimData.xml`).then((r) => {
        if (!r.ok) throw new Error("sem AnimData");
        return r.text();
      }),
      "text/xml",
    );

    const els = Array.from(xml.querySelectorAll("Anim"));
    for (const el of els) {
      const nome = el.querySelector("Name")?.textContent;
      if (!nome) continue;

      // `CopyOf` é recurso do formato: uma animação reaproveita a folha de outra.
      const copyOf = el.querySelector("CopyOf")?.textContent;
      const alvo = copyOf
        ? els.find((e) => e.querySelector("Name")?.textContent === copyOf) ?? el
        : el;

      const durations = Array.from(alvo.querySelectorAll("Durations Duration")).map((d) =>
        parseInt(d.textContent || "10", 10),
      );

      try {
        this.anims.set(nome.toLowerCase(), {
          image: await carregarImagem(`${base}/${alvo.querySelector("Name")?.textContent}-Anim.png`),
          frameW: parseInt(alvo.querySelector("FrameWidth")?.textContent || "40", 10),
          frameH: parseInt(alvo.querySelector("FrameHeight")?.textContent || "40", 10),
          durations: durations.length ? durations : [10],
        });
      } catch {
        /* uma animação faltando não invalida o personagem */
      }
    }
    if (this.anims.size === 0) throw new Error("nenhuma animação carregada");
  }

  frame(anim: AnimationName, dir: Direction8, timeMs: number): Frame | null {
    const a = this.anims.get(anim) ?? this.anims.get("idle");
    if (!a) return null;

    // Cada linha da folha é uma direção, na ordem canônica do formato.
    const linha = ["down", "down-right", "right", "up-right", "up", "up-left", "left", "down-left"]
      .indexOf(dir);

    const totalTicks = a.durations.reduce((x, y) => x + y, 0);
    const t = (timeMs / 16.66) % totalTicks;
    let acc = 0;
    let col = 0;
    for (let i = 0; i < a.durations.length; i++) {
      acc += a.durations[i];
      if (t < acc) {
        col = i;
        break;
      }
    }

    return {
      image: a.image,
      sx: col * a.frameW,
      sy: Math.max(0, linha) * a.frameH,
      sw: a.frameW,
      sh: a.frameH,
      pivotX: a.frameW / 2,
      pivotY: a.frameH * 0.9,
    };
  }
}

// ---------------------------------------------------------------------------
// Procedural — sempre disponível, nunca falha
// ---------------------------------------------------------------------------

/**
 * Desenha a criatura por código.
 *
 * Existe para que a ausência de arte nunca vire tela quebrada. Não é bonito, e
 * não precisa ser: é a rede de segurança que permite adicionar um personagem
 * novo ao catálogo antes de a arte dele existir.
 */
export function desenharProcedural(
  ctx: CanvasRenderingContext2D,
  palette: ProceduralPalette,
  x: number,
  y: number,
  escala: number,
  anim: AnimationName,
  timeMs: number,
): void {
  const r = 22 * escala;
  const respirar = Math.sin(timeMs / 420) * 2 * escala;
  const pulo = anim === "hop" || anim === "jump" ? Math.abs(Math.sin(timeMs / 180)) * 14 * escala : 0;
  const cy = y - r - pulo + respirar;

  ctx.save();

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.8, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.ellipse(x, cy, r, r * 1.06, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.secondary;
  ctx.beginPath();
  ctx.ellipse(x, cy + r * 0.5, r * 0.72, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  const dormindo = anim === "sleep";
  ctx.fillStyle = palette.eye;
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    if (dormindo) {
      ctx.ellipse(x + lado * r * 0.34, cy - r * 0.18, r * 0.16, r * 0.04, 0, 0, Math.PI * 2);
    } else {
      const triste = anim === "sad";
      ctx.ellipse(
        x + lado * r * 0.34,
        cy - r * 0.18 + (triste ? r * 0.08 : 0),
        r * 0.12,
        r * (triste ? 0.1 : 0.16),
        0,
        0,
        Math.PI * 2,
      );
    }
    ctx.fill();
  }

  if (anim === "happy") {
    ctx.strokeStyle = palette.eye;
    ctx.lineWidth = 2 * escala;
    ctx.beginPath();
    ctx.arc(x, cy + r * 0.1, r * 0.28, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  if (dormindo) {
    ctx.fillStyle = "#94A3B8";
    ctx.font = `${Math.round(13 * escala)}px system-ui`;
    ctx.fillText("z", x + r * 0.9, cy - r * 0.8 - ((timeMs / 100) % 14));
  }

  ctx.restore();
}

export function criarProvider(source: SpriteSource, permitirRede = true): SpriteProvider | null {
  switch (source.kind) {
    case "atlas":
      return new AtlasProvider(source.sheet, source.atlas);
    case "pmd":
      return new PmdProvider(source.index, permitirRede);
    case "procedural":
      return null;
  }
}
