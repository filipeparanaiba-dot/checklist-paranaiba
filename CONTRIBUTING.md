# Como contribuir

## Fluxo

1. crie uma branch curta a partir de `main`;
2. mantenha cada commit focado em uma etapa;
3. atualize documentação e testes no mesmo commit da mudança;
4. execute as validações;
5. abra uma pull request descrevendo impacto, risco e limites.

## Validações

```powershell
node --check app.js
node --check core.js
node --check db.js
node --check server.mjs
node --check sw.js
node tests/core.test.js
node tests/structure.test.js
```

## Regras de segurança

- não use `innerHTML` com dados dinâmicos;
- não adicione handlers inline;
- não adicione dependências `@latest`;
- não confirme integração sem resposta real;
- não use valores padrão para fabricar registros obrigatórios;
- toda entidade operacional deve incluir `storeId`;
- alterações financeiras exigem validação no cliente e futuramente no servidor.

## Interface

- todo controle precisa de nome acessível;
- teclado e foco visível são obrigatórios;
- não bloqueie zoom;
- todos os módulos devem permanecer alcançáveis no celular;
- respeite `prefers-reduced-motion`;
- mensagens não podem depender apenas de cor.
