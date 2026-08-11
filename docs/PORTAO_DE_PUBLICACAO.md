# Portão de publicação

Lista do que precisa acontecer **antes** de qualquer distribuição pública.

Existe porque um passo que depende de alguém lembrar não é mecanismo. O teste
`portaoEcombate.test.ts` executa a parte verificável desta lista.

## Bloqueadores

- [ ] remover `packages/creature-core/src/catalog/prototype-pmd.ts`
- [ ] remover a linha que o importa em `catalog/index.ts`
- [ ] remover `PmdProvider` de `creature-sprites`
- [ ] remover `public/sprites/pmd/`
- [ ] remover `scripts/baixar-sprites.mjs`
- [ ] confirmar: todo personagem tem `origin: "original"`
- [ ] confirmar: nenhum `sprite.kind === "pmd"` no catálogo
- [ ] confirmar: toda arte tem cessão de direitos comerciais **por escrito**

## Como verificar

```bash
CREATURE_BUILD=production npm run portao
```

Enquanto houver personagem de protótipo, este comando **falha** — de propósito.

## Por que a remoção é barata

A abstração `SpriteSource` faz o motor nunca conhecer PMD. Os personagens de
protótipo moram num arquivo próprio. Remover é apagar arquivos, não refatorar.

Se algum dia essa remoção parecer difícil, é sinal de que alguém furou a
abstração — e o conserto é restaurá-la, não abrir exceção.
