# Staging — validação Carteira P0.5 + comissão paid

> Atualizado após CD merge #512 (**success** run [41661274962](https://github.com/reserveiviagens-tech/rsv360/actions/runs/41661274962)).

## Onde corre cada peça

| Componente | Staging (`docker-compose.staging.yml`) | Notas |
|------------|----------------------------------------|--------|
| **Backend** API | Sim — `:8080` → backend `3002`, health `/health` | Inclui rotas `/api/v1/acomodacoes/anfitriao/admin/carteira*` (#512). |
| **Frontend CD** | `apps/site-publico` — `:8081` | **Não** inclui Turismo. |
| **Turismo** UI | **Não** no compose staging | Usar **`apps/turismo` local `:3005`** com `NEXT_PUBLIC_*` apontando ao backend staging, **ou** produção Turismo se já deployada. |
| **Turismo prod** | Referência owner | [turismo.reserveiviagens.com.br](https://turismo.reserveiviagens.com.br) — confirmar revisão deployada ≥ #512. |

## A. CSV bulk (carteira)

1. Login staff (admin/manager) no **Turismo** (local ou prod).
2. `/anfitriao/admin/carteira-corretor`
3. CSV:

```text
corretorId,proprietarioId
```

4. Esperado: resumo `{ ok, fail }` + linhas **ativo** na tabela.

**API alternativa (sem UI):**

```http
POST /api/v1/acomodacoes/anfitriao/admin/carteira/bulk
Authorization: Bearer <staff JWT>
Content-Type: application/json

{ "items": [ { "corretorId": 0, "proprietarioId": 0 } ] }
```

## B. Comissão (paid)

1. `PUT /api/v1/comissoes/config` → `comissoesModuloAtivo: true`
2. Proposta com `metadata.acomodacaoId` do proprietário vinculado.
3. `PATCH /api/v1/propostas/:id/status` → `{ "status": "paid" }`
4. Verificar evento `comissoes_geracao` + `GET /api/v1/comissoes/minhas-comissoes` (corretor) ou `/anfitriao/comissoes`.

Ver `RUNBOOK-COMISSOES-MVP-B-STAGING.md`.

## Critério “passou” para pele Lintel

- [ ] Bulk CSV ≥ 1 vínculo **ativo** persistido (`GET .../admin/carteira`).
- [ ] Proposta teste **paid** gera lançamento corretor (ou `reason` documentado se esperado só proprietário).

Reportar ao agente: `CSV ok (N vínculos)` + `Paid ok (proposta #id)` **sem PII**.
