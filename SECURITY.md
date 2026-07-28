# Política de segurança

## Escopo

Esta versão é uma demonstração local e não deve receber dados reais de
funcionários, clientes, CFTV, documentos fiscais ou credenciais.

## Reporte responsável

Não publique vulnerabilidades com dados sensíveis em issues públicas. Envie um
relato privado ao proprietário do repositório com:

- versão ou commit;
- passos mínimos para reprodução;
- impacto observado;
- sugestão de correção, quando houver.

## Proteções atuais

- CSP restrita a recursos locais;
- ausência de scripts externos e handlers inline;
- renderização de entrada com APIs seguras do DOM;
- validação de campos críticos;
- contenção de caminhos no servidor;
- cache limitado ao prefixo da aplicação;
- ações externas bloqueadas em modo demonstração;
- testes estruturais para evitar regressões conhecidas.

## Limites conhecidos

- sem autenticação ou autorização;
- sem backend ou banco corporativo;
- sem criptografia de registros no navegador;
- sem assinatura digital;
- sem integração real com VR ou mensagens;
- sem armazenamento de anexos;
- sem revisão independente de segurança.

Esses limites impedem o uso em produção.

## Requisitos mínimos antes do piloto

1. modelagem de ameaças e revisão de arquitetura;
2. identidade, RBAC e reautenticação para ações críticas;
3. validação autoritativa no servidor;
4. trilha de auditoria imutável;
5. proteção de segredos e rotação de credenciais;
6. políticas LGPD, retenção e exclusão;
7. backup, recuperação e observabilidade;
8. teste de invasão e correção dos achados.
