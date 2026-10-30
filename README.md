# ✦ Arcane Auctions

Casa de leilões online de cartas colecionáveis de **Magic: The Gathering**, desenvolvida como teste técnico do programa **Elite Dev** da Verzel.

Um leiloeiro publica lotes a partir de cartas buscadas na API pública do **Scryfall**, e licitantes disputam cada lote com lances ao vivo. Qualquer pessoa, mesmo sem login, pode auditar o histórico de lances de um lote e verificar que ele não foi adulterado.

| | |
|---|---|
| **Aplicação** | https://arcane-auctions.onrender.com |
| **API** | https://arcane-auctions-api.onrender.com/api |
| **Repositório** | https://github.com/ewn1/arcane-auctions |

> ⚠️ **Primeiro acesso pode levar até 1 minuto.** O back-end está no plano gratuito do Render, que adormece o serviço após 15 minutos sem uso. Enquanto ele acorda, a aplicação mostra a tela **"Invocando o servidor..."**. Depois disso, tudo responde normalmente.

---

## Sumário

- [Contas de demonstração](#contas-de-demonstração)
- [Funcionalidades](#funcionalidades)
- [Tecnologias e decisões](#tecnologias-e-decisões)
- [Regras de negócio](#regras-de-negócio)
- [Histórico à prova de adulteração](#histórico-à-prova-de-adulteração)
- [Resiliência à API externa](#resiliência-à-api-externa)
- [Dados de demonstração](#dados-de-demonstração)
- [Como rodar localmente](#como-rodar-localmente)
- [Testes e qualidade](#testes-e-qualidade)
- [Endpoints da API](#endpoints-da-api)
- [Deploy](#deploy)
- [Comportamentos esperados e limitações conhecidas](#comportamentos-esperados-e-limitações-conhecidas)
- [Opcionais](#opcionais)
- [Fluxo de trabalho com Git](#fluxo-de-trabalho-com-git)
- [Uso de IA](#uso-de-ia)

---

## Contas de demonstração

Todas com a senha **`Arcane@2026`**. Na tela de login, há botões que preenchem essas contas com um clique.

| Usuário | Papel | Saldo inicial |
|---|---|---|
| `leiloeiro` | Leiloeiro | — |
| `licitante1` | Licitante | R$ 500.000,00 |
| `licitante2` | Licitante | R$ 500.000,00 |

**Dica para testar a disputa ao vivo:** entre como `licitante1` numa janela normal e como `licitante2` numa janela anônima, e abram o mesmo lote. Os lances de um aparecem para o outro em até 3 segundos, sem recarregar a página.

---

## Funcionalidades

### Vitrine (pública)
- Lotes separados em **ao vivo**, **agendados** e **encerrados**. Lotes cancelados não aparecem.
- **Busca por nome** da carta.
- Contagem regressiva em cada lote.

### Sala do lote ao vivo
- Lance atual, líder (por pseudônimo), lance inicial, incremento mínimo e quantidade de lances.
- **Contagem regressiva**, destacada em vermelho na reta final (anti-sniping).
- Indicador **"Você está ganhando"** / **"Você foi superado"**, com a posição do usuário.
- Histórico de lances com destaque para os lances do próprio usuário.
- Formulário de lance com sugestões rápidas.
- **Mensagem clara para cada lance recusado**: abaixo do mínimo, saldo insuficiente, você já está ganhando, lote ainda não iniciado e lote encerrado.
- Tudo atualizado **sem recarregar a página**.

### Carteira do licitante
- Saldo **total**, **comprometido** e **disponível**, com a explicação de cada um.
- Depósito simulado.

### Meus arremates
- Todos os lotes em que o usuário deu lance, com o resultado: ganhando, superado, arrematado, não arrematado ou cancelado.
- **Comprovante** de cada lote arrematado e **link de compartilhamento**.

### Comprovante de arremate (público)
- Acessível por link, **sem login**.
- Identifica o arrematante por pseudônimo, sem dados pessoais.
- Traz o selo da cadeia de lances e um atalho para a auditoria.
- Pode ser impresso ou salvo em PDF.

### Auditoria (pública)
- Histórico completo de lances de qualquer lote, **sem login**.
- Veredito **íntegro** ou **adulterado**, com o motivo e o elo da cadeia em que o problema começa.
- Explicação da técnica de verificação na própria página.

### Painel do leiloeiro
- **Busca de cartas no Scryfall** e criação de lotes: lance inicial, incremento mínimo, início (imediato ou agendado) e duração.
- **Cancelamento** de lotes, com ou sem lances (com estorno automático do saldo comprometido).
- Resultado de cada lote encerrado (arrematado e por quanto, ou encerrado sem lances) e **total recebido**.

---

## Tecnologias e decisões

| Camada | Tecnologia | Por quê |
|---|---|---|
| Back-end | **Python 3.12 + Django 6 + Django REST Framework** | Autenticação, ORM, migrations e admin prontos, o que permitiu concentrar o tempo nas regras de negócio. |
| Autenticação | **JWT** (`djangorestframework-simplejwt`) | O front-end guarda o token e o envia em cada requisição. |
| Banco de dados | **PostgreSQL** (Docker local, Neon em produção) | Transações com trava de linha (`SELECT ... FOR UPDATE`), essenciais para lances simultâneos. |
| Front-end | **React + TypeScript + Vite** | Tipagem das respostas da API (`src/types.ts`) e build rápido. |
| Estilos | **CSS Modules** | Estilos isolados por componente, nativo do Vite, sem dependência extra nem custo em tempo de execução. |
| Rotas | **React Router** | Navegação por URL, incluindo os links públicos de comprovante e auditoria. |
| API externa | **Scryfall** | Gratuita, sem chave, com imagens de todas as cartas e cache recomendado pela própria documentação. |
| Deploy | **Render** (API e site estático) + **Neon** (PostgreSQL) | Planos gratuitos. O Neon foi escolhido porque o PostgreSQL gratuito do Render expira em 30 dias. |

### "Ao vivo" com polling

A sala do lote consulta o servidor **a cada 3 segundos**. WebSocket (Django Channels) exigiria Redis e um servidor ASGI, peças demais para um plano gratuito, e o polling atende o requisito de atualizar sem recarregar a página com muito menos complexidade. Para poupar o servidor, o polling **pausa quando a aba do navegador fica oculta**.

### Estrutura do código

```
arcane-auctions/
├── backend/
│   ├── accounts/            # usuário (papel e saldo), cadastro, carteira, permissões
│   ├── auctions/
│   │   ├── services/        # regras de negócio, separadas das views
│   │   │   ├── bidding.py       # validação e registro de lances
│   │   │   ├── wallet.py        # saldo comprometido e disponível
│   │   │   ├── settlement.py    # liquidação dos lotes encerrados
│   │   │   ├── cancellation.py  # cancelamento de lotes
│   │   │   ├── audit.py         # cadeia de hashes, selo e pseudônimos
│   │   │   └── scryfall.py      # integração com a API externa
│   │   ├── management/commands/seed.py
│   │   └── tests.py
│   ├── config/              # settings e URLs
│   └── build.sh             # script de build do Render
├── frontend/
│   └── src/
│       ├── api/client.ts    # único ponto de acesso à API (token, erros)
│       ├── components/      # layout, cards, portão do servidor, guardião de rotas
│       ├── context/         # autenticação
│       ├── hooks/
│       ├── pages/           # vitrine, sala, carteira, arremates, comprovante, auditoria
│       │   └── panel/       # painel do leiloeiro
│       ├── types.ts         # contrato com a API
│       └── utils/
├── docker-compose.yml       # PostgreSQL local
└── AI_USAGE.md
```

As **regras de negócio ficam em `services/`**, e as views só recebem a requisição, chamam o serviço e traduzem o resultado em resposta HTTP. Isso deixa as regras testáveis sem passar pela camada HTTP.

---

## Regras de negócio

### Lances (`services/bidding.py`)
- Só são aceitos em lotes **ao vivo** (entre o início e o fim).
- O **primeiro lance** deve ser maior ou igual ao lance inicial. Os seguintes, maiores ou iguais ao **lance atual + incremento mínimo**.
- O **licitante líder não pode cobrir o próprio lance**.
- **Leiloeiros não podem dar lances.**
- Cada recusa devolve um código e uma mensagem clara, exibidos na sala do lote.

### Lances simultâneos
Todo lance roda numa **transação** com **trava na linha do lote** (`select_for_update`). Se dois licitantes dão lance no mesmo instante, o segundo espera o primeiro terminar e é validado contra o preço já atualizado. O usuário também é travado, para que o mesmo saldo não seja usado em dois lotes ao mesmo tempo.

### Saldo comprometido (`services/wallet.py`)
- **Disponível = total − comprometido.**
- O comprometido **não é armazenado**: é calculado como a soma dos lances em que o usuário é **líder**, em lotes ainda não liquidados nem cancelados.
- Por isso, quando o licitante é superado, o valor **volta ao disponível imediatamente**, e quando um lote é cancelado, o estorno é automático. Não existe nenhuma operação de "devolver saldo" que possa ficar dessincronizada.
- Um lance só é aceito se couber no saldo disponível.

### Prorrogação anti-sniping
Um lance aceito nos **últimos 2 minutos** muda o fim do lote para **o momento do lance + 2 minutos**. Na sala, a contagem fica vermelha e aparece o aviso "Reta final".

### Liquidação (`services/settlement.py`)
- Ao encerrar, o valor do vencedor é **debitado** e o leiloeiro é **creditado**. Lotes sem lances fecham sem vencedor.
- **Liquidação preguiçosa:** como o plano gratuito adormece o servidor, não há tarefa agendada confiável. O lote é liquidado na **primeira vez que alguém o acessa após o fim** (vitrine, sala, carteira, painel ou comprovante).
- A liquidação é **idempotente**: chamá-la várias vezes tem o mesmo efeito de chamá-la uma vez, e a trava de linha impede liquidações simultâneas.

### Status do lote
O status (agendado, ao vivo, encerrado, cancelado) **não é uma coluna**: é calculado a partir dos horários. Assim, ele está sempre correto sem depender de nenhum processo que "vire a chave" na hora certa, e a prorrogação anti-sniping funciona automaticamente.

### Dinheiro
Todos os valores usam `Decimal` no back-end e trafegam como texto (`"150.00"`) na API, para evitar os erros de arredondamento de ponto flutuante.

---

## Histórico à prova de adulteração

**Técnica escolhida: cadeia de hashes assinada com HMAC-SHA256, mais um selo por lote.** Implementação em `backend/auctions/services/audit.py`.

1. **Cada lance é assinado** com HMAC-SHA256 usando uma chave secreta (`AUDIT_HMAC_KEY`), que fica em variável de ambiente, **fora do banco de dados**. A assinatura cobre: a assinatura do lance anterior, o lote, o licitante, o valor e o horário.
2. **Os lances formam uma corrente**: cada um guarda a assinatura do anterior (`prev_hash`). O primeiro aponta para um valor inicial fixo.
3. **O lote guarda um selo** (`chain_seal`): um HMAC da quantidade de lances e da última assinatura. Ele protege o **final** da corrente, onde a remoção do último lance não quebraria nenhum elo.
4. **A auditoria recalcula tudo do zero** e compara com o que está gravado:
   - **Alteração** de qualquer campo de um lance muda a sua assinatura, que deixa de bater.
   - **Remoção ou inserção no meio** quebra o elo `prev_hash` do lance seguinte.
   - **Remoção ou inserção no final** invalida o selo.
   - Também é conferido se o preço e o líder atuais do lote correspondem ao último lance.
5. **A partir do primeiro elo quebrado, todos os seguintes são marcados como inválidos**, porque nada depois dele é confiável.

**Por que HMAC, e não um hash comum?** Com um SHA-256 puro, quem tivesse acesso ao banco poderia alterar um lance e **recalcular a corrente inteira**. Com HMAC, recalcular exige a chave secreta, que não está no banco.

**Limitações conhecidas:**
- Quem tiver acesso à chave secreta e ao banco ao mesmo tempo consegue forjar uma corrente válida. A proteção pressupõe que a chave e o banco estejam separados, como estão no deploy.
- **Trocar a chave invalida a verificação dos lances antigos.** Um sistema real precisaria de um plano de rotação de chaves (por exemplo, registrar qual versão da chave assinou cada lance).

**Privacidade:** a auditoria e o comprovante identificam os licitantes por **pseudônimo** (por exemplo, `Licitante #A3F2C1`), gerado com HMAC a partir do id do usuário. Sem a chave, não é possível descobrir quem está por trás do pseudônimo.

O comportamento é coberto por testes automatizados que simulam adulterações direto no banco (`AuditTests` em `backend/auctions/tests.py`).

---

## Resiliência à API externa

A vitrine, as salas, a auditoria e o comprovante **continuam funcionando com o Scryfall fora do ar**:

- **Snapshot da carta:** ao criar um lote, o back-end copia título, imagem e atributos para o banco. Nenhuma tela de lote depende do Scryfall depois disso.
- **O back-end confirma a carta na fonte:** o front-end envia só o `external_id`, e o back-end busca os dados no Scryfall. Dados de título e imagem enviados pelo cliente não são aceitos.
- **Timeout de 5 segundos** nas chamadas ao Scryfall.
- **Cache de 10 minutos** nas buscas, que também respeita o limite de requisições do Scryfall.
- **Debounce de 500 ms** na busca do painel: uma requisição por termo digitado, e não uma por tecla.
- Se o Scryfall estiver fora, a busca e a criação de lotes respondem **503** com uma mensagem amigável, e o restante do sistema segue normalmente.

---

## Dados de demonstração

O comando `python manage.py seed` cria o leiloeiro, os dois licitantes e os lotes abaixo. Ele roda automaticamente a cada deploy e é **idempotente**: se os dados já existem, não faz nada.

| Lote | Estado | Situação |
|---|---|---|
| **The One Ring** | Ao vivo | 3 lances; `licitante1` lidera |
| **Gandalf the White** | Ao vivo | Sem lances |
| **Black Lotus** (Alpha) | Ao vivo | 2 lances; `licitante2` lidera |
| **Ancient Gold Dragon** | Ao vivo | 2 lances; `licitante1` lidera |
| **Jace, the Mind Sculptor** | Agendado | Começa 60 dias após o seed |
| **Ancient Copper Dragon** | Encerrado | Arrematado por `licitante1` (tem comprovante) |

- Os lotes ao vivo ficam abertos por **60 dias** a partir do seed, para cobrir o período de avaliação.
- A liderança foi distribuída de propósito: entrando como qualquer um dos licitantes, é possível ver os indicadores de "ganhando" e "superado" e, como `licitante1`, um comprovante de arremate.

---

## Como rodar localmente

### Requisitos
- Python 3.12+
- Node.js 24+
- Docker (para o PostgreSQL)

### 1. Banco de dados

```bash
git clone https://github.com/ewn1/arcane-auctions.git
cd arcane-auctions
docker compose up -d
```

Sobe um PostgreSQL 16 na porta `5432`, com banco, usuário e senha `arcane`.

### 2. Back-end

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed
python manage.py runserver
```

A API fica em `http://127.0.0.1:8000/api`. Para gerar chaves para o `.env`:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

### 3. Front-end

Em outro terminal, a partir da raiz do repositório:

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

Acesse `http://localhost:5173`.

### Variáveis de ambiente

**Back-end (`backend/.env`):**

| Variável | Descrição |
|---|---|
| `SECRET_KEY` | Chave secreta do Django |
| `DEBUG` | `True` em desenvolvimento, `False` em produção |
| `DATABASE_URL` | URL de conexão com o PostgreSQL |
| `AUDIT_HMAC_KEY` | Chave da assinatura dos lances e dos pseudônimos. **Não troque depois de ter lances**: a auditoria passaria a acusar adulteração nos lances antigos |
| `ALLOWED_HOSTS` | Hosts aceitos, separados por vírgula |
| `CORS_ALLOWED_ORIGINS` | Origens do front-end autorizadas, separadas por vírgula |
| `CSRF_TRUSTED_ORIGINS` | Origens confiáveis para o admin em HTTPS |

**Front-end (`frontend/.env.local`):**

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | Endereço base da API |

---

## Testes e qualidade

### Back-end

```bash
cd backend
python manage.py test auctions
```

**25 testes automatizados** cobrindo:
- **Lances:** valor mínimo, incremento, líder cobrindo o próprio lance, leiloeiro tentando dar lance, lotes agendados, encerrados e cancelados, saldo insuficiente, saldo comprometido em outro lote, liberação do saldo ao ser superado e prorrogação anti-sniping.
- **Liquidação:** débito do vencedor e crédito do leiloeiro, idempotência, lote sem lances e lote ainda ao vivo.
- **Auditoria:** histórico íntegro, valor alterado direto no banco, lance removido do meio, último lance removido e pseudônimos sem dados pessoais.
- **Cancelamento:** liberação do saldo comprometido, permissão do dono e bloqueio de lotes encerrados.

### Front-end

```bash
cd frontend
npm run lint          # ESLint
npm run format:check  # Prettier
npm run build         # checagem de tipos (tsc) + build de produção
```

---

## Endpoints da API

Base: `/api`. Rotas autenticadas usam o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/token/` | Público | Login (devolve o token JWT) |
| POST | `/auth/register/` | Público | Cadastro |
| GET | `/auth/me/` | Autenticado | Usuário logado |
| GET | `/wallet/` | Licitante | Saldos total, comprometido e disponível |
| POST | `/wallet/deposit/` | Licitante | Depósito simulado |
| GET | `/cards/search/?q=` | Leiloeiro | Busca de cartas no Scryfall |
| GET | `/lots/?status=` | Público | Vitrine (`live`, `scheduled`, `ended`) |
| POST | `/lots/` | Leiloeiro | Criação de lote |
| GET | `/lots/<id>/` | Público | Detalhe do lote (com a posição do usuário, se logado) |
| GET | `/lots/<id>/bids/` | Público | Histórico de lances |
| POST | `/lots/<id>/bids/` | Licitante | Dar lance |
| POST | `/lots/<id>/cancel/` | Leiloeiro dono | Cancelar lote |
| GET | `/lots/<id>/audit/` | Público | Auditoria do histórico |
| GET | `/receipts/<token>/` | Público | Comprovante de arremate |
| GET | `/my/bids/` | Licitante | Meus arremates |
| GET | `/my/lots/` | Leiloeiro | Lotes do leiloeiro e total recebido |

---

## Deploy

- **API:** Web Service no Render, a partir da branch `main`, com raiz em `backend/`. O `build.sh` instala as dependências, coleta os arquivos estáticos e roda `migrate` e `seed`. O servidor é o `gunicorn`.
- **Front-end:** Static Site no Render, com raiz em `frontend/`, build `npm ci && npm run build` e publicação da pasta `dist`. Uma regra de reescrita (`/*` → `/index.html`) permite abrir diretamente qualquer rota da aplicação, como os links de comprovante e auditoria.
- **Banco:** PostgreSQL no Neon.
- **Deploy automático:** todo merge na `main` publica uma nova versão.

---

## Comportamentos esperados e limitações conhecidas

- **Primeiro acesso lento:** o back-end gratuito adormece após 15 minutos sem uso e leva cerca de 1 minuto para acordar. A aplicação mostra a tela "Invocando o servidor..." nesse período.
- **Atualização a cada 3 segundos:** por usar polling, um lance de outro licitante pode levar até 3 segundos para aparecer. Com a aba do navegador oculta, as atualizações pausam e são retomadas ao voltar.
- **Anti-sniping:** "estender o fim para +2 minutos" foi interpretado como **momento do lance + 2 minutos**, o padrão de mercado.
- **Lote encerrado do seed:** para criar um lote já encerrado, o seed registra os lances e depois antecipa o fim do lote. Por isso, na auditoria do **Ancient Copper Dragon**, os lances aparecem com horário **posterior** ao encerramento. É um artefato do seed, não um bug.
- **Liquidação no acesso:** o débito do vencedor acontece no primeiro acesso após o fim do lote, e não no segundo exato do encerramento. Para o usuário, o resultado é o mesmo.
- **Sessão de 8 horas:** o token expira após 8 horas, e o usuário precisa entrar de novo. Não há renovação automática do token.
- **Papel escolhido no cadastro:** para simplificar, o próprio usuário escolhe se é leiloeiro ou licitante ao criar a conta.
- **Depósito máximo de R$ 100.000** por operação, para evitar valores absurdos no saldo simulado.
- **Busca no painel a partir de 3 letras.**
- **Lote agendado vira ao vivo sozinho:** o status é calculado pelo horário, sem nenhuma ação do leiloeiro.
- **HSTS desativado de propósito:** a aplicação roda num subdomínio do Render, e ativar HSTS sem controle do domínio poderia causar problemas difíceis de reverter.
- **Imagens das cartas** vêm do CDN do Scryfall e não são cortadas nem alteradas, conforme as regras de uso do Scryfall.

---

## Opcionais

| Opcional | Situação |
|---|---|
| Busca e filtro de lotes | ✅ Busca por nome e abas por status na vitrine |
| Cancelamento com estorno automático | ✅ Cancelamento com ou sem lances; o saldo comprometido é liberado na hora |
| Testes automatizados | ✅ 25 testes das regras de negócio no back-end |
| Docker Compose | ⚠️ Parcial: usado para o PostgreSQL local; back-end e front-end rodam fora de contêineres |
| Dark mode | ⚠️ A interface usa um tema escuro único; não há alternância entre claro e escuro |

---

## Fluxo de trabalho com Git

O projeto segue **Git flow**: `main` (produção), `develop` (integração), branches `feature/*` para cada etapa e `hotfix/*` para correções urgentes em produção. As funcionalidades entram na `develop` por pull request, e as versões chegam à `main` por pull requests de release. As mensagens de commit seguem o padrão `feat:`, `fix:`, `test:`, `docs:` e `chore:`.

---

## Uso de IA

O uso de IA neste projeto está registrado, etapa por etapa, no arquivo [`AI_USAGE.md`](AI_USAGE.md).

---

Desenvolvido por **Edwim Francisco Marciano** · Dados e imagens das cartas fornecidos pelo [Scryfall](https://scryfall.com). Magic: The Gathering é marca da Wizards of the Coast. Projeto de demonstração, sem valores reais.
