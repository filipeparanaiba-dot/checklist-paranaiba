# Implantação

## Ambientes

Use desenvolvimento, homologação e produção isolados. Cada ambiente deve ter
banco, emissor OIDC, audiência, origem CORS e segredos próprios.

## Checklist antes do piloto

- escolher e configurar o provedor de identidade OIDC;
- provisionar usuários, funções e unidades;
- disponibilizar a API em HTTPS com logs e monitoramento;
- definir retenção, base legal, acesso e descarte conforme LGPD;
- habilitar backup testado e restauração;
- trocar o armazenamento local por opção nativa criptografada;
- testar perda de rede, token expirado, tarefa revogada e envio repetido;
- realizar teste de segurança e revisão de acessibilidade;
- aprovar ícones, textos legais, política de privacidade e suporte;
- cadastrar certificados e perfis Apple/Google.

## Publicação nas lojas

Android requer Google Play Console, chave de assinatura e política de
privacidade. iOS requer Apple Developer, certificados, App Store Connect e
execução final em macOS/Xcode. Esses materiais não ficam no GitHub.

## Estratégia

1. Distribuição interna.
2. Piloto em uma unidade e um setor.
3. Acompanhamento de sincronização, duração e chamados.
4. Correção dos achados.
5. Expansão gradual por unidade.

O site estático da raiz continua como demonstração. O painel conectado à API
está em `apps/manager`.
