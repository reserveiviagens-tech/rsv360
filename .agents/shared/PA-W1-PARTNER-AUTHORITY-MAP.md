# PA-W1 — Partner Authority Map (W1 PASS)

Sem conversão automática para viewer/manager/admin. Toda célula com SOURCE + CONFIDENCE.

## Identidade/escopo (anfitriao.service.ts:124-126, 259-313)
- `anfitriao`: owner-scope — `podeGerenciarUnidade`: `row.proprietarioId === auth.userId` (:264). `escopoProprietarios`: `eq(proprietarioId, userId)` (:305-306). CONFIDENCE: PROVEN.
- `corretor/agente/promotor` (BROKER_ROLES): carteira-scope — own + `proprietariosNaCarteira(userId)` (:265-268, :308-310, via `carteiraCorretor`). CONFIDENCE: PROVEN.
- staff (admin/manager): bypass total — `podeGerenciarUnidade` true (:263); ownerScope `sql true` (:331-333). CONFIDENCE: PROVEN.
- Extensões: `podeVerUnidade` (+coanfitrião por email :273-280); `podeEditarCalendarioUnidade` (+cohost com papelCalendario :282-291); `podeEditarMensagensUnidade` (:293-302). CONFIDENCE: PROVEN.

## Matriz (evidência literal, sem analogia)

| Autoridade | Scope | Read | Operational Write | Economic Write | Pricing | Cross-Enterprise |
|---|---|---|---|---|---|---|
| anfitriao | próprias unidades (proprietarioId=userId) | próprias + cohost | calendário/mensagens próprias (via cohost papel) | rate-calendar writes via MASTER_ROLES (rate-calendar.service:53-54,593,718,748,1030) | PUT politica-desconto; canEditPricing=true (:571) | NÃO (owner-scope) |
| corretor | próprias + carteira | idem + carteira | idem na carteira | aplicarDesconto (BROKER+STAFF :1095); teto por role (:1234) | teto desconto por role; enforceAsRole só por staff (:1114-1118) | NÃO (carteira-scope) |
| agente | = corretor | = corretor | = corretor | = corretor | = corretor | NÃO |
| promotor | = corretor | = corretor | = corretor | = corretor | = corretor | NÃO |

Diferenciação corretor×agente×promotor: NENHUMA no código (mesmo Set, mesmos branches). Decisões PA-DEC-002/003/004 devem registrar se a indistinción é intencional.
Veredito W1: PASS.
