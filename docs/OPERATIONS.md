# Guia operacional da demonstração

## Antes de começar

Confirme que a faixa amarela “Ambiente de demonstração local” está visível.
Não utilize registros da demonstração como evidência trabalhista, sanitária,
financeira ou de auditoria.

## Unidade ativa

A unidade selecionada determina quais registros e indicadores aparecem.
Registros de uma loja não são exibidos na outra.

## Auditoria

1. Abra **Visão geral** ou **Auditorias e setores**.
2. Escolha uma rotina.
3. Responda todos os itens.
4. Finalize localmente.

Cada resposta “Não conforme” cria um plano 5W2H com prazo inicial de 24 horas.

## Produtos críticos

O EAN-13 é validado pelo dígito verificador. Custo e preço precisam ser
positivos. “Preparar integração” apenas muda o estado local para “Aguardando
backend”; nenhum caixa é atualizado.

## Backups

Use **Exportar backup** antes de limpar dados do navegador ou trocar de
dispositivo. A importação substitui o workspace local atual.

O backup contém dados digitados na demonstração. Trate o arquivo de acordo com a
sensibilidade das informações inseridas e não o envie por canais não
autorizados.

## Sem conexão

A aplicação e os rascunhos locais continuam disponíveis. Não há sincronização
com servidor nesta versão.

## Solução de problemas

### O servidor não inicia

- confirme Node.js 22 ou superior;
- verifique se a porta 8085 está livre;
- use `PORT=outra_porta` no ambiente antes de iniciar, se necessário.

### Dados não permanecem

O navegador pode estar bloqueando IndexedDB, em navegação privada ou com espaço
insuficiente. A interface mostra “Somente nesta sessão” ou “Falha ao salvar”.
Exporte um backup enquanto a aba estiver aberta.

### A versão antiga continua aparecendo

Recarregue a página. O service worker versionado substitui apenas caches do
próprio projeto.
