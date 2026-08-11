import { useEffect, useRef, useState, useCallback } from "react";
import {
  type CreatureState,
  type CreatureDefinition,
  type RewardEvent,
  estadoInicial,
  aoCarregar,
  tick,
  alimentar,
  brincar,
  fazerCarinho,
  alternarSono,
  aplicarRecompensa,
  emotionFor,
  Rng,
  CONFIG_PADRAO,
  TICK_MS,
  getCreature,
} from "@creature/core";
import { criarProvider, desenharProcedural, type SpriteProvider } from "@creature/sprites";

const CHAVE = "creature-state-v1";

/**
 * Hook que mantém a criatura viva.
 *
 * Toda a lógica mora no núcleo, que é puro e testável. Aqui há só três coisas:
 * o relógio, a persistência e a ponte com o React. Se algo de regra aparecer
 * neste arquivo, está no lugar errado.
 */
export function useCreature(seed = 1) {
  const [state, setState] = useState<CreatureState>(() => {
    const salvo = typeof localStorage !== "undefined" ? localStorage.getItem(CHAVE) : null;
    const agora = Date.now();
    if (salvo) {
      try {
        return aoCarregar(JSON.parse(salvo) as CreatureState, agora).state;
      } catch {
        /* estado corrompido: recomeça limpo em vez de quebrar */
      }
    }
    return estadoInicial(getCreature("magosha"), agora);
  });

  const [saudacao, setSaudacao] = useState<string | null>(null);
  const cfg = useRef({ ...CONFIG_PADRAO, rng: new Rng(seed) });

  // A saudação de reencontro só faz sentido uma vez, na abertura.
  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE);
    if (!salvo) return;
    try {
      const r = aoCarregar(JSON.parse(salvo) as CreatureState, Date.now());
      if (r.saudacao) {
        setSaudacao(r.saudacao);
        setTimeout(() => setSaudacao(null), 5000);
      }
    } catch {
      /* ignora */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(
      () => setState((s) => tick(s, cfg.current, Date.now())),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(state));
  }, [state]);

  const def = getCreature(state.speciesId);
  const emocao = emotionFor(state.needs, state.isSleeping);

  return {
    state,
    def,
    emocao,
    saudacao,
    alimentar: () => setState((s) => alimentar(s, Date.now())),
    brincar: () => setState((s) => brincar(s, Date.now())),
    carinho: () => setState((s) => fazerCarinho(s, Date.now())),
    dormir: () => setState((s) => alternarSono(s, Date.now())),
    trocar: (id: string) =>
      setState(() => estadoInicial(getCreature(id), Date.now())),
    recompensar: useCallback((ev: RewardEvent) => {
      setState((s) => aplicarRecompensa(s, getCreature(s.speciesId), ev, Date.now()).state);
    }, []),
    irPara: (x: number, y: number) =>
      setState((s) => ({ ...s, target: { pos: { x, y }, speed: "walk" } })),
  };
}

/**
 * Desenha a criatura.
 *
 * Tenta o provedor de sprite; se ele não estiver pronto ou não tiver o quadro,
 * cai no desenho procedural. Nunca fica em branco — é a regra que permite
 * adicionar personagem antes de existir arte para ele.
 */
export function CreatureCanvas({
  state,
  def,
  width = 360,
  height = 300,
  onPick,
}: {
  state: CreatureState;
  def: CreatureDefinition;
  width?: number;
  height?: number;
  onPick?: (x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const providerRef = useRef<SpriteProvider | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let vivo = true;
    providerRef.current = null;
    const p = criarProvider(def.sprite);
    // Falha ao carregar arte NUNCA pode virar erro na tela: o desenho
    // procedural assume e a criança nem percebe. É o que permite cadastrar um
    // personagem antes de a arte dele existir.
    if (p)
      void p
        .load()
        .then(() => { if (vivo) providerRef.current = p; })
        .catch(() => { providerRef.current = null; });
    return () => { vivo = false; };
  }, [def.id, def.sprite]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    const desenhar = (t: number) => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, width, height);

      // Chão
      const grad = ctx.createLinearGradient(0, height * 0.55, 0, height);
      grad.addColorStop(0, "#dcedc8");
      grad.addColorStop(1, "#aed581");
      ctx.fillStyle = grad;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);

      const x = (s.position.x / 100) * width;
      const y = (s.position.y / 100) * height;
      const escala = 2.2;

      const frame = providerRef.current?.frame(s.animation, s.direction, t);
      if (frame) {
        const dw = frame.sw * escala;
        const dh = frame.sh * escala;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(x, y, dw * 0.28, dh * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.drawImage(
          frame.image,
          frame.sx, frame.sy, frame.sw, frame.sh,
          x - frame.pivotX * escala, y - frame.pivotY * escala,
          dw, dh,
        );
      } else {
        desenharProcedural(ctx, def.fallback, x, y, escala * 0.85, s.animation, t);
      }

      raf = requestAnimationFrame(desenhar);
    };
    raf = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(raf);
  }, [width, height, def]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={(e) => {
        if (!onPick) return;
        const r = e.currentTarget.getBoundingClientRect();
        onPick(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
      }}
      style={{
        width: "100%",
        maxWidth: width,
        borderRadius: 16,
        background: "linear-gradient(#e3f2fd,#f1f8e9)",
        cursor: onPick ? "pointer" : "default",
        display: "block",
      }}
    />
  );
}
