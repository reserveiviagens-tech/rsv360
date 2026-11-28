# Runbook — Comissões MVP-B (staging)

> Wiring: proposta `paid` → `gerarLancamentos` · `corretorId` na proposta ou carteira ativa.

## Pré-requisitos

- Proposta com `metadata.acomodacaoId` (wizard v2 com unidade publicada).
- Staff com role que acessa `PUT /api/v1/comissoes/config`.
- (Opcional corretor) vínculo `carteira_corretor` ativo: `POST /api/v1/acomodacoes/anfitriao/admin/carteira` com `corretorId` + `proprietarioId`.

## 1. Ativar módulo de comissões (staging)

```http
PUT /api/v1/comissoes/config
Authorization: Bearer <staff JWT>
Content-Type: application/json

{
  "comissoesModuloAtivo": true,
  "taxaPlataformaPct": 20,
  "taxaCorretorPct": 5
}
```

Confirme:

```http
GET /api/v1/comissoes/config
```

`comissoesModuloAtivo` deve ser `true`.

**Rollback:** mesmo endpoint com `"comissoesModuloAtivo": false` (não apaga lançamentos já criados).

## 2. Smoke fluxo B → C

1. Unidade **publicada** (`status_publicacao`).
2. Wizard gera proposta → metadata inclui `acomodacaoId` e, se houver carteira, `corretorId`.
3. Cliente aceita (ou `pending_host` + anfitrião aprova) → status `accepted`, calendário com hold.
4. Staff confirma pagamento:

```http
PATCH /api/v1/propostas/:id/status
Authorization: Bearer <staff JWT>
Content-Type: application/json

{ "status": "paid" }
```

5. Verificar evento da proposta: tipo `comissoes_geracao` (`generated: true` ou `reason` explicando no-op).
6. Anfitrião/corretor: `GET /api/v1/comissoes/minhas-comissoes` ou UI `/anfitriao/comissoes`.

## 3. Diagnóstico quando não gera lançamento

| `reason` (evento / retorno lógico) | Causa provável |
|-----------------------------------|----------------|
| `module_disabled` | Flag off — passo 1 |
| `proposta_not_paid` | Status ainda não `paid` |
| `acomodacao_missing` | Proposta sem unidade no metadata |
| `proprietario_missing` | Acomodação sem `proprietario_id` |
| `invalid_base_valor` | `valorTotal` inválido |

Corretor ausente na lista: proposta sem `corretorId` **e** sem carteira ativa → só lançamento `proprietario` (esperado).

## 4. Idempotência

`gerarLancamentos` não duplica linhas para o mesmo `(propostaId, beneficiarioUserId, papel)`. Reaplicar `PATCH paid` é seguro.

## 5. Não confundir com trilho Partner (C36)

Pagamentos de **booking** via `payment-confirmation.service` alimentam `partner_earnings`, **não** `comissoes_lancamento`. Este runbook é só **proposta anfitrião / wizard**.

## Referências de código

- `server/modules/propostas/services/propostas.service.ts` — `afterPaidStatus`
- `server/modules/comissoes/services/comissoes.service.ts` — `gerarLancamentos`
- `server/modules/comissoes/services/resolve-corretor-proposta.ts`
- `server/modules/cotacao-publica/services/cotacao-publica.service.ts` — metadata `corretorId`
