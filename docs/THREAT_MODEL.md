# Modelo de ameaças resumido

| Ameaça | Controle implementado | Próxima barreira |
| --- | --- | --- |
| Descoberta da resposta esperada | regras e pesos somente no servidor | revisar textos para evitar pistas |
| Acesso do colaborador ao resultado | contrato e rota separados; RBAC | teste de invasão independente |
| Envio duplicado | chave idempotente e execução única | monitorar conflitos |
| Token forjado de gestor | função vem do banco; emissor e audiência validados | MFA e provisionamento formal |
| Acesso entre unidades | associação usuário-unidade | testes periódicos |
| Mudança do checklist durante execução | versão atribuída imutável | processo de publicação |
| Perda do aparelho | sem resultado nem token persistido | criptografia e apagamento remoto |
| Manipulação em trânsito | produção exige HTTPS | pinning conforme risco |
| Diagnóstico difícil | request ID e auditoria | SIEM, alertas e retenção |

O risco residual mais importante antes de dados reais é o armazenamento offline.
A empresa deve escolher e validar criptografia e gestão de dispositivos.
