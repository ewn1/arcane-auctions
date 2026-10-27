# Uso de IA neste projeto

## 25/10 - Planejamento
- Planejamento da arquitetura e escolha da API discutidos com IA (Claude); decisões revisadas por mim.
## 25/10 — Back-end base
- Estrutura do projeto, models e integração com o Scryfall construídos com orientação da IA (Claude), que explicou cada decisão (Decimal para dinheiro, status calculado, PROTECT no histórico, cache e timeout na API externa). Digitei, testei e revisei o código.
- Lotes, cadastro e carteira: estrutura orientada pela IA, que explicou as decisões (dois serializers, validação no back-end, saldo comprometido calculado, F() para depósito atômico). Executei os testes de sucesso e de falha manualmente via curl.
## 27/10 — Regras de lance e testes
- Serviço de lances (validações, saldo, trava de concorrência com select_for_update, anti-sniping) e cadeia de hashes com HMAC + selo: lógica proposta pela IA e explicada passo a passo; implementei, testei manualmente via curl e validei com testes automatizados. Fiz o exercício de quebrar uma regra de propósito para confirmar que os testes detectam a falha.