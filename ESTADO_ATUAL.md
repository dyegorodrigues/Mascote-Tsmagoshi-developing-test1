# Onde o trabalho está — leia isto primeiro

**Atualizado:** 11/ago/2026
**Branch:** `claude/audit-repository-analysis-ezao0c`
**Estado:** 77 testes verdes · typecheck limpo · protótipo jogável

Este arquivo existe porque a memória de uma conversa não sobrevive e o
repositório sim. Ele diz o que está pronto, o que está quebrado, e o que vem
depois — nessa ordem.

---

## 1. Como VER o que existe, sem instalar nada

O autor trabalha de tablet. Um repositório que exige `npm install` para ser
visto é um repositório que ele não consegue abrir.

```bash
npm install && npm run empacotar     # gera dist/bicho-vivo.html
```

Arquivo único de 1,1 MB, sprites e retratos embutidos, abre em qualquer
navegador, funciona offline. **É o entregável que importa.**

Para desenvolver: `npm run dev` (laboratório em `localhost:5180`).

---

## 2. O que está PRONTO e funcionando

### Vida (o Tamagotchi)
- fome, energia, alegria e vínculo, com decaimento por tempo real;
- **continua vivendo com o app fechado** — reconcilia a ausência ao abrir;
- **nunca morre**: teto de 12 h de ausência, piso de 15 em cada necessidade, e
  o vínculo jamais decai. Criança que sumiu um mês encontra um bicho com fome,
  não uma punição;
- seis emoções derivadas das necessidades, com **retrato de rosto** de verdade;
- evolução exige nível **e** vínculo: quem só acumula pontos não evolui.

### Comportamento
- o bicho tem **intenção**: escolhe um plano e o persegue — "anda até ali, olha
  em volta, senta, boceja" — em vez de sortear poses soltas;
- o banco de planos muda com a emoção: com fome ele procura, exausto ele deita,
  radiante ele pula e treina golpe;
- o pensamento aparece em texto, para o comportamento ser legível.

### Interação
- toque no chão → caminha · toque duplo → corre · toque nele → carinho;
- comer, brincar, carinho, dormir;
- efeitos: corações, poeira, estrelas, "z" do sono.

### Arte
- **4 personagens com 35 animações cada**, locais, offline (2,7 MB);
- 6 retratos de expressão por personagem;
- três fontes de sprite convivendo: `pmd` · `atlas` · `procedural`;
- fallback procedural: sem arte, desenha por código — a tela nunca quebra.

### Combate (modelo, não jogo)
- frame data completo: preparação, ativo, recuperação, caixas, cancelamentos;
- cadeia Marvel vs Capcom: `soco_L → soco_M → chute_H → lançador → aéreos`;
- agarrão, arremesso, rolamento, investida, especial de vida, hyper;
- **vida arriscada** (mecânica do Streets of Rage 4): o especial custa vida, e
  a vida volta se você continuar acertando. Apanhou antes, perde. É o que
  impede o gênero de virar "socar saco de pancada";
- malabarismo aéreo com gravidade crescente e dano decrescente;
- **eixo de profundidade** já presente: o versus mantém `z = 0`, o beat 'em up
  usa. Sem isso, converter depois obrigaria a revisitar toda colisão.

### Ponte com o SAGA
- uma função só: `aplicarRecompensa(estado, def, evento, agora)`;
- o motor não sabe o que é competência, ficha ou currículo;
- **a fila de comandos**: a criança monta `[andar, andar, pular]`, o bicho
  executa, e quando trava o motor diz **em qual passo e por quê**. Isso é a
  competência de sequenciamento *sendo* o exercício.

### Governança
- personagens de protótipo isolados em `catalog/prototype-pokemon.ts`;
- `npm run portao` falha se sobrar protótipo numa build de produção;
- contrato de arte em código: célula 384×384, altura 256, pivô nos pés,
  6,5 cabeças, teto de 32 cores;
- `npm run ficha <personagem> <pacote>` gera a encomenda pronta para colar.

---

## 3. O que NÃO está pronto

| Item | Situação |
|---|---|
| Arte própria | nenhuma. O Magosha está declarado mas sem folhas — cai no procedural |
| Laço de combate | existe o modelo de dados; não existem dois lutadores se batendo |
| Beat 'em up | nada. Só o eixo de profundidade preparado |
| Cenários | fundo desenhado por código, simples |
| Efeitos de golpe | só os de vida (coração, poeira, estrela) |
| Áudio | nenhum |
| Integração real no SAGA | a porta existe; ninguém passou por ela ainda |
| Duas formas (Beast Wars) | tipo declarado, sem implementação |

---

## 4. Defeitos já corrigidos — não reabrir sem evidência

- movimento rodava a 1 Hz junto das necessidades: o toque parecia não funcionar;
- linha dos pés medida só no primeiro quadro: flutuava em animações aéreas;
- comportamento sorteava pose isolada: parecia defeito, não vida;
- Vite servia `public/` do app e devolvia HTML no lugar do XML dos sprites;
- barras de necessidade não preenchiam (`span` inline ignora altura);
- glob de mascote aceitava JPG contra a própria regra do projeto.

---

## 5. O próximo passo

**Antes de qualquer código novo:** o autor precisa abrir o
`dist/bicho-vivo.html` e responder três perguntas — o que está feio, o que
falta para parecer vivo, e se jogaria de novo amanhã.

Sem essa resposta, qualquer trabalho seguinte é adivinhação. O protótipo existe
exatamente para produzir essa resposta antes de se gastar dinheiro com arte.

**Depois disso, em ordem:**

1. corrigir o que ele apontar;
2. encomendar a arte do **primeiro** personagem original — pacote `companheiro`,
   34 quadros e 6 retratos, uma referência aprovada antes de tudo;
3. plugar o mascote no SAGA (a ponte já existe);
4. um mini-jogo de pancadaria com três inimigos burros — é onde se descobre se
   é divertido, antes de investir no jogo grande.

**Não fazer agora:** jogo de luta completo, segunda forma, áudio, cenários
elaborados. Tudo isso depende de o companheiro ser divertido primeiro.
