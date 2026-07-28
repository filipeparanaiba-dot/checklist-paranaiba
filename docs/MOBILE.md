# Aplicativo operacional Android e iOS

## Objetivo

O colaborador executa o checklist sem conhecer nota, peso, faixa aceita,
classificação ou ranking. Ele vê tarefas, perguntas factuais, revisão e
comprovante de recebimento.

## Fluxo

1. Entrada com identidade corporativa.
2. Lista de tarefas da própria unidade.
3. Orientação curta antes do início.
4. Uma pergunta por tela, com salvamento automático.
5. Revisão das respostas.
6. Conclusão imediata ou inclusão na fila offline.
7. Protocolo de recebimento, nunca resultado.

Quando a conexão volta ou o aplicativo retorna ao primeiro plano, a fila tenta
sincronizar novamente. Cada operação usa uma chave idempotente; repetir o mesmo
envio retorna o mesmo comprovante sem criar outra execução.

## Executar no navegador

Inicie a API e o app em terminais separados:

```powershell
pnpm dev:api
pnpm dev:operator
```

Abra `http://127.0.0.1:5174` e use `operador@paranaiba.local`.

## Android

O projeto está em `apps/operator/android`.

```powershell
pnpm mobile:sync
pnpm --filter @checklist/operator mobile:open:android
```

É necessário Android Studio, JDK e Android SDK. Configure `VITE_API_URL` com um
endereço HTTPS acessível pelo dispositivo antes do build.

## iOS

O projeto está em `apps/operator/ios`.

```powershell
pnpm mobile:sync
pnpm --filter @checklist/operator mobile:open:ios
```

A compilação e assinatura exigem macOS, Xcode e conta Apple Developer. O
identificador do pacote é `br.com.supermercadoparanaiba.checklist`.

## Limites de dados no aparelho

O aplicativo salva apenas identificador aleatório, tarefas, respostas em
andamento, operações aguardando envio e protocolos. Tokens ficam somente em
memória. Resultados, regras e pesos nunca são persistidos ou transferidos.

Para um piloto com dados reais, substitua o armazenamento Preferences por
armazenamento nativo criptografado e gerenciado conforme a política de
dispositivos da empresa.
