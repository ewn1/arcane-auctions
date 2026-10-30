# Uso de IA neste projeto

## 25/10 — Planejamento

- Planejamento da arquitetura e escolha da API discutidos com IA (Claude); decisões revisadas por mim.

## 25/10 — Back-end base

- Estrutura do projeto, models e integração com o Scryfall construídos com orientação da IA (Claude), que explicou cada decisão (Decimal para dinheiro, status calculado, PROTECT no histórico, cache e timeout na API externa). Digitei, testei e revisei o código.
- Lotes, cadastro e carteira: estrutura orientada pela IA, que explicou as decisões (dois serializers, validação no back-end, saldo comprometido calculado, F() para depósito atômico). Executei os testes de sucesso e de falha manualmente via curl.

## 27/10 — Regras de lance e testes

- Serviço de lances (validações, saldo, trava de concorrência com select_for_update, anti-sniping) e cadeia de hashes com HMAC + selo: lógica proposta pela IA e explicada passo a passo; implementei, testei manualmente via curl e validei com testes automatizados. Fiz o exercício de quebrar uma regra de propósito para confirmar que os testes detectam a falha.
- Liquidação idempotente, comprovante público e verificação da cadeia (HMAC + selo + consistência) propostos pela IA e explicados passo a passo. Implementei, escrevi/ajustei os testes e identifiquei com a IA uma falha no setUp (objeto desatualizado sem refresh_from_db) que fazia testes de adulteração passarem pelo motivo errado. Validei manualmente adulterando um lance pelo shell do Django.
- Sala ao vivo (pseudônimo do líder, próximo lance mínimo, posição e "você está ganhando"), histórico de lances e "meus arremates": estrutura proposta pela IA e explicada (SerializerMethodField, contexto da requisição, agrupamento com annotate/Max). Implementei e validei via curl com dois licitantes, conferindo os saldos após a liquidação.
- Painel do leiloeiro, cancelamento com estorno automático e seed de demonstração: propostos pela IA; implementei, adicionei os testes de cancelamento e validei o seed (incluindo a execução repetida sem duplicar dados).
- Git flow: com orientação da IA, diagnostiquei dois PRs mergeados por engano na main (via git log), sincronizei as branches e resolvi o conflito de merge resultante em views.py e urls.py.

## 27/10 — Deploy do back-end

- Configuração de produção (gunicorn, whitenoise, segurança, build script) e escolha de Render + Neon orientadas pela IA, que pesquisou os limites atuais dos planos gratuitos. Diagnostiquei com a IA a falha do primeiro deploy pelo log (STATIC_URL removido por engano) e corrigi com uma branch de hotfix, seguindo o Git flow.

## 28/10 — Base do front-end

- Estrutura do front-end (cliente da API tipado, contexto de autenticação, vitrine, tela de invocação do servidor) proposta pela IA e explicada arquivo a arquivo. A escolha de TypeScript + CSS Modules foi minha, depois de comparar com a IA as alternativas (styled-components, CSS global). Ajustei o código às regras do ESLint do React com a orientação da IA e validei com lint, build e testes manuais no navegador.

## 29/10 — Sala do lote ao vivo

- Sala do lote (polling com pausa em aba oculta, contagem regressiva, banners de "ganhando/superado", formulário de lance com sugestões, mensagens de recusa temáticas e histórico com destaque do próprio lance) proposta pela IA e explicada parte por parte. Testei a disputa em tempo real com dois licitantes em janelas separadas e validei as mensagens de recusa.
- Telas de carteira, meus arremates, comprovante público e auditoria pública, além do guardião de rotas por papel (com o estado "ready" no contexto de autenticação), propostas pela IA e explicadas. Testei o fluxo completo, inclusive o comprovante aberto sem login e a auditoria acusando uma adulteração feita pelo shell do Django.

## 29/10 — Painel do leiloeiro

- Painel do leiloeiro (busca com debounce no Scryfall, formulário de criação com início imediato e duração, lista com resultados e cancelamento com estorno) proposto pela IA e explicado componente por componente. Validei a criação, as mensagens de erro do back-end, o cancelamento liberando o saldo comprometido e a resiliência com o Scryfall fora do ar.

## 30/10 — Dados de demonstração e deploy do front-end

- Novos lotes de demonstração (cartas de LOTR e clássicos de Magic, com duração de 60 dias para cobrir o período de avaliação): a escolha das cartas e a distribuição dos estados foram minhas; a IA estruturou o seed e sugeriu validá-lo num banco temporário antes do deploy. Deploy do front-end como site estático no Render, com a regra de reescrita para as rotas da SPA e o CORS de produção, orientado pela IA.
