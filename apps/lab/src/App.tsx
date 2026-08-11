import { useState } from "react";
import { CATALOGO, CommandRunner, type Command, type WorldGrid, type Needs } from "@creature/core";
import { useCreature, CreatureCanvas } from "@creature/react";

/**
 * Laboratório — a bancada para ver a criatura viva e mexer nela.
 *
 * Não é o produto: é o lugar onde se testa mecânica antes de gastar com arte.
 * As três abas correspondem aos três usos que o mesmo personagem tem que
 * atender: companheiro, exercício e (futuramente) luta.
 */

const ROTULO_EMOCAO: Record<string, string> = {
  radiante: "Radiante",
  contente: "Contente",
  faminto: "Com fome",
  exausto: "Exausto",
  triste: "Triste",
  dormindo: "Dormindo",
};

const CARINHA: Record<string, string> = {
  radiante: "\u{1F929}",
  contente: "\u{1F642}",
  faminto: "\u{1F62B}",
  exausto: "\u{1F634}",
  triste: "\u{1F622}",
  dormindo: "\u{1F4A4}",
};

export function App() {
  const c = useCreature();
  const [aba, setAba] = useState<"vida" | "programar">("vida");

  return (
    <div style={S.page}>
      <div style={S.card}>
        <header style={S.header}>
          <div>
            <h1 style={S.h1}>{c.state.nickname}</h1>
            <p style={S.sub}>
              {c.def.name} · nível {c.state.level} ·{" "}
              <span style={{ color: c.def.origin === "prototype" ? "#B45309" : "#15803D" }}>
                {c.def.origin === "prototype" ? "protótipo" : "original"}
              </span>
            </p>
          </div>
          <div style={S.emo}>
            <div style={{ fontSize: 30 }}>{CARINHA[c.emocao]}</div>
            <div style={S.emoTxt}>{ROTULO_EMOCAO[c.emocao]}</div>
          </div>
        </header>

        {c.saudacao && <div style={S.saudacao}>{c.saudacao}</div>}

        <CreatureCanvas state={c.state} def={c.def} onPick={c.irPara} />
        <p style={S.dica}>Toque no cenário para chamar {c.state.nickname}.</p>

        <Barras needs={c.state.needs} />

        <nav style={S.tabs}>
          {(["vida", "programar"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAba(t)}
              style={{ ...S.tab, ...(aba === t ? S.tabOn : {}) }}
            >
              {t === "vida" ? "Cuidar" : "Programar"}
            </button>
          ))}
        </nav>

        {aba === "vida" ? <AbaVida c={c} /> : <AbaProgramar />}

        <details style={S.det}>
          <summary style={S.sum}>Trocar personagem ({CATALOGO.length})</summary>
          <div style={S.grid}>
            {CATALOGO.map((d) => (
              <button
                key={d.id}
                onClick={() => c.trocar(d.id)}
                style={{
                  ...S.chip,
                  borderColor: d.id === c.def.id ? "#0E7C86" : "#D5DDE7",
                  background: d.id === c.def.id ? "#D3EAEC" : "#fff",
                }}
              >
                <span style={{ ...S.dot, background: d.fallback.primary }} />
                {d.name}
                <small style={S.origem}>{d.sprite.kind}</small>
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

function Barras({ needs }: { needs: Needs }) {
  const linhas = [
    ["Fome", needs.hunger, "#F59E0B"],
    ["Energia", needs.energy, "#0EA5E9"],
    ["Alegria", needs.happiness, "#22C55E"],
    ["Vínculo", needs.bond, "#EC4899"],
  ] as const;
  return (
    <div style={S.barras}>
      {linhas.map(([nome, v, cor]) => (
        <div key={nome}>
          <div style={S.barTop}>
            <span>{nome}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(v)}</span>
          </div>
          <div style={S.barBg}>
            <div style={{ ...S.barFill, width: `${v}%`, background: cor }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AbaVida({ c }: { c: ReturnType<typeof useCreature> }) {
  return (
    <>
      <div style={S.acoes}>
        <button style={S.btn} onClick={c.alimentar}>Alimentar</button>
        <button style={S.btn} onClick={c.brincar}>Brincar</button>
        <button style={S.btn} onClick={c.carinho}>Carinho</button>
        <button style={S.btn} onClick={c.dormir}>
          {c.state.isSleeping ? "Acordar" : "Dormir"}
        </button>
      </div>
      <div style={S.ponte}>
        <p style={S.ponteTit}>Ponte com o SAGA</p>
        <p style={S.ponteTxt}>
          É assim que uma resposta certa no aplicativo pedagógico chega até aqui — por um
          evento tipado, sem o motor saber o que é uma competência.
        </p>
        <button
          style={{ ...S.btn, ...S.btnPonte }}
          onClick={() =>
            c.recompensar({
              type: "CORRECT_ANSWER",
              xp: 35,
              bond: 3,
              happiness: 8,
              message: "Acertou!",
            })
          }
        >
          Simular acerto na Jornada
        </button>
      </div>
    </>
  );
}

/**
 * A aba que prova o uso pedagógico: a criança monta um programa e vê rodar.
 * A fila de comandos é o exercício de sequenciamento.
 */
function AbaProgramar() {
  const [prog, setProg] = useState<Command[]>([]);
  const [saida, setSaida] = useState<string[]>([]);

  const mundo: WorldGrid = {
    width: 8,
    height: 8,
    blocked: (x, y) => x === 3 && y === 0,
    pushable: (x, y) => x === 3 && y === 0,
  };

  const add = (k: Command["kind"], arg?: number) =>
    setProg((p) => [...p, { kind: k, arg }]);

  const rodar = () => {
    const ator = { position: { x: 0, y: 0 }, direction: "right" as const };
    const r = new CommandRunner(prog, ator, mundo);
    r.runToEnd();
    const falha = r.firstFailure();
    setSaida([
      ...r.events.map(
        (e) => `${e.index + 1}. ${e.command.kind} → ${e.outcome} (${e.position.x},${e.position.y})`,
      ),
      falha
        ? `Travou no passo ${falha.index + 1}: ${falha.outcome}`
        : "Programa completo, sem erros.",
    ]);
  };

  return (
    <div>
      <p style={S.ponteTxt}>
        Monte a sequência e veja executar. Há uma pedra em (3,0) — <em>andar</em> esbarra nela,{" "}
        <em>pular</em> passa por cima. Quando trava, o motor diz <strong>em qual passo</strong>.
      </p>
      <div style={S.acoes}>
        <button style={S.btnP} onClick={() => add("andar", 1)}>andar</button>
        <button style={S.btnP} onClick={() => add("pular", 1)}>pular</button>
        <button style={S.btnP} onClick={() => add("virar", 2)}>virar</button>
        <button style={S.btnP} onClick={() => add("empurrar")}>empurrar</button>
      </div>
      <div style={S.prog}>
        {prog.length === 0 ? (
          <span style={{ color: "#8494A8" }}>programa vazio</span>
        ) : (
          prog.map((p, i) => (
            <span key={i} style={S.passo}>{i + 1}. {p.kind}{p.arg ? ` ${p.arg}` : ""}</span>
          ))
        )}
      </div>
      <div style={S.acoes}>
        <button style={{ ...S.btn, ...S.btnPonte }} onClick={rodar}>Executar</button>
        <button style={S.btn} onClick={() => { setProg([]); setSaida([]); }}>Limpar</button>
      </div>
      {saida.length > 0 && <pre style={S.saida}>{saida.join("\n")}</pre>}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F4F6F9",
    padding: 16,
    fontFamily: "system-ui, sans-serif",
    color: "#16202E",
  },
  card: {
    maxWidth: 420,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 2px 16px rgba(22,32,46,.08)",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  h1: { margin: 0, fontSize: 22, fontWeight: 700 },
  sub: { margin: "2px 0 0", fontSize: 12, color: "#4A5A70" },
  emo: { textAlign: "center" },
  emoTxt: { fontSize: 10, color: "#4A5A70", textTransform: "uppercase", letterSpacing: ".08em" },
  saudacao: {
    background: "#D3EAEC", color: "#0E7C86", padding: "8px 12px",
    borderRadius: 10, fontSize: 13, marginBottom: 10, fontWeight: 600,
  },
  dica: { fontSize: 11, color: "#8494A8", textAlign: "center", margin: "6px 0 12px" },
  barras: { display: "grid", gap: 8, marginBottom: 14 },
  barTop: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#4A5A70", marginBottom: 3 },
  barBg: { height: 8, background: "#EAEEF4", borderRadius: 99, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 99, transition: "width .3s" },
  tabs: { display: "flex", gap: 6, marginBottom: 12 },
  tab: {
    flex: 1, padding: "8px 0", border: "1px solid #D5DDE7", background: "#fff",
    borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#4A5A70",
  },
  tabOn: { background: "#0E7C86", color: "#fff", borderColor: "#0E7C86" },
  acoes: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  btn: {
    flex: "1 1 auto", padding: "10px 12px", border: "1px solid #D5DDE7",
    background: "#fff", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  btnP: {
    padding: "8px 12px", border: "1px solid #0E7C86", background: "#fff", color: "#0E7C86",
    borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "ui-monospace, monospace",
  },
  btnPonte: { background: "#0E7C86", color: "#fff", borderColor: "#0E7C86" },
  ponte: { background: "#F4F6F9", borderRadius: 12, padding: 12 },
  ponteTit: { margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#0E7C86" },
  ponteTxt: { margin: "6px 0 10px", fontSize: 12, color: "#4A5A70", lineHeight: 1.5 },
  prog: {
    display: "flex", flexWrap: "wrap", gap: 6, minHeight: 34, padding: 8,
    background: "#F4F6F9", borderRadius: 8, marginBottom: 10, fontSize: 12,
  },
  passo: { background: "#fff", border: "1px solid #D5DDE7", borderRadius: 6, padding: "2px 7px", fontFamily: "ui-monospace, monospace" },
  saida: {
    background: "#16202E", color: "#E4EAF1", padding: 12, borderRadius: 8,
    fontSize: 11, overflowX: "auto", fontFamily: "ui-monospace, monospace", lineHeight: 1.6,
  },
  det: { marginTop: 14, borderTop: "1px solid #EAEEF4", paddingTop: 12 },
  sum: { fontSize: 12, color: "#4A5A70", cursor: "pointer", fontWeight: 600 },
  grid: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: {
    display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
    border: "1px solid", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600,
  },
  dot: { width: 10, height: 10, borderRadius: 99, display: "inline-block" },
  origem: { color: "#8494A8", fontSize: 9, fontFamily: "ui-monospace, monospace" },
};
