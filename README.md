# Creature Engine

Motor de criatura para o ecossistema SAGA. Um mesmo personagem serve a três usos, e é essa a razão de tudo aqui ser construído do jeito que é:

| Uso | O que a criatura faz | Estado |
|---|---|---|
| **Companheiro** (Tamagotchi) | vive, come, dorme, sente, evolui por vínculo | ✅ funcionando |
| **Exercício** (SAGA pedagógico) | executa um programa que a criança montou | ✅ funcionando |
| **Luta** (Marvel vs Capcom) | golpes, combos, especiais | 🏗️ modelo de dados pronto, jogo não |

```bash
npm install
npm run dev     # laboratório em http://localhost:5180
npm test        # 47 testes
npm run lint    # typecheck
```

---

## A ideia que organiza tudo

> **Separar a simulação do desenho, e separar o personagem de quem o comanda.**

A simulação é pura: não conhece DOM, não sorteia sem semente, não lê relógio por conta própria. Isso a torna testável em massa — dá para rodar dois mil ticks de vida num teste e provar que a criatura nunca sai do cenário, sem abrir navegador.

Sobre a mesma criatura, três "motoristas" diferentes:

```
                    ┌──────────────┐
   Tamagotchi  ───► │              │
   Exercício   ───► │   Criatura   │ ───► desenho (canvas)
   Luta        ───► │              │
                    └──────────────┘
```

Nenhum deles conhece os outros. Dá para usar a criatura num exercício sem carregar nada de combate.

---

## Estrutura

```
packages/
  creature-core/      simulação pura — zero DOM, 100% testável
    types.ts          personagem, sprite, animação, direção
    life/             necessidades, decaimento, emoção, comportamento autônomo
    command/          fila de comandos — a ponte pedagógica
    combat/           frame data, hitboxes, combos
    catalog/          quem existe (separado por origem — ver abaixo)
  creature-sprites/   provedores: atlas · pmd · procedural
  creature-react/     hook + canvas
apps/
  lab/                a bancada onde se vê a criatura viva
```

---

## As decisões que valem conhecer

### 1. A criatura vive com o app fechado

O protótipo anterior decaía por `setInterval`. Fechou a aba, o tempo parava — a criança voltava três dias depois e encontrava tudo idêntico. Isso quebra o que **define** o gênero: o bicho tem que sentir falta.

`reconcileElapsed()` reconcilia o tempo decorrido no carregamento.

### 2. A criatura nunca morre

Regra de produto, não de engenharia. Criança de seis anos que abandona o bicho duas semanas e volta para achá-lo morto não aprende responsabilidade — aprende culpa, e não volta mais.

Três travas: teto de **12 h** de ausência por maior que seja o sumiço, **piso de 15** em cada necessidade, e **vínculo que jamais decai**. Quem sumiu um mês encontra um bicho com fome, não destruído.

### 3. Evolução exige vínculo, não só nível

`minLevel` **e** `minBond`. Quem só acumula pontos não evolui; quem cuida, evolui. Para uma criança, é a mensagem certa.

### 4. Golpe é dado, não código

Um golpe é um objeto com `startup`, `active`, `recovery`, caixas e janelas de cancelamento. Balancear o jogo é **editar números**, não programar. E `comboConnects()` valida uma cadeia só pelos números — dá para escrever um teste que garante que a sequência de cinco golpes conecta, e ele quebra se alguém desbalancear.

### 5. O motor não conhece currículo

A única porta entre aprendizagem e criatura:

```ts
aplicarRecompensa(state, def, { type: "CORRECT_ANSWER", xp, bond, happiness }, agora)
```

O SAGA pode trocar de currículo inteiro sem tocar numa linha daqui.

### 6. Uma fila de comandos é um programa

A resposta para "dá para usar o mascote num exercício de forma que faça sentido":

```ts
[ {kind:"andar"}, {kind:"andar"}, {kind:"pular"}, {kind:"repetir", arg:3, body:[...]} ]
```

A criança monta, a criatura executa, e quando trava o motor diz **em qual passo e por quê**:

```
1. andar → ok (1,0)
2. andar → ok (2,0)
3. andar → bloqueado (2,0)
Travou no passo 3: bloqueado
```

Isso é depuração — localizar a primeira divergência — aos seis anos. Não é mascote enfeitando exercício: é a competência de sequenciamento *sendo* o exercício.

Determinístico de propósito: nenhuma criança pode ser reprovada por sorteio.

---

## Sobre os personagens de protótipo

Os personagens `origin: "prototype"` usam arte de terceiros. São para **desenvolvimento, teste e aprendizado**, e serão trocados por personagens originais antes de qualquer publicação.

A troca foi projetada para ser barata, e é por isso que existe a abstração `SpriteSource`:

```ts
sprite: { kind: "pmd", index: 25 }                          // protótipo
sprite: { kind: "atlas", sheet: "...", atlas: "..." }       // arte definitiva
sprite: { kind: "procedural", palette: {...} }              // sem arte ainda
```

O motor nunca pergunta "qual o índice PMD?". Pergunta "qual a fonte?".

**Como a troca acontece:** apagar `catalog/prototype-pmd.ts`, apagar a linha que o importa, trocar o `sprite` de cada personagem. Nenhuma linha de simulação muda.

**A prova de que vai funcionar** está num teste: o catálogo tem que ter, ao mesmo tempo, personagem PMD, personagem atlas e personagem procedural. Abstração com uma implementação só sempre vaza; enquanto as três convivem, a troca está garantida.

**O portão** (`npm run portao`) falha se sobrar protótipo numa build de produção. Não depende de ninguém lembrar.

Ver `docs/PORTAO_DE_PUBLICACAO.md`.

---

## Sprites locais

Por padrão o provedor PMD tenta `/sprites/pmd/<id>/` **antes** da rede. Para baixar de uma vez:

```bash
node scripts/baixar-sprites.mjs
```

Depois disso o laboratório funciona **offline**, abre rápido, e não depende de repositório de terceiros. É a mesma pasta que a arte definitiva vai usar.

---

## O que falta

- [ ] Arte do Magosha neste repo (`public/sprites/magosha/`) — hoje ele cai no procedural
- [ ] Animações `idle_life`, `eat`, `happy`, `sad`, `sleep` (o atlas do Magosha só tem `walk`)
- [ ] Retratos de emoção
- [ ] Simulação de combate (o modelo de dados existe; falta o laço de luta)
- [ ] Integração real com o SAGA
