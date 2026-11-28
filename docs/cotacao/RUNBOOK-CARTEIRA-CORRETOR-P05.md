# Runbook — Carteira corretor (P0.5 staff)

Staff **admin/manager** vincula corretores a proprietários (`carteira_corretor`) antes do smoke de comissões MVP-B.

## UI

`/anfitriao/admin/carteira-corretor` — listagem, autocomplete, vínculo unitário, CSV bulk (até 500 linhas), inativar/reativar.

## APIs

| Método | Rota |
|--------|------|
| GET | `/api/v1/acomodacoes/anfitriao/admin/carteira` |
| GET | `/api/v1/acomodacoes/anfitriao/admin/carteira/corretores?q=` |
| GET | `/api/v1/acomodacoes/anfitriao/admin/carteira/proprietarios?q=` |
| POST | `/api/v1/acomodacoes/anfitriao/admin/carteira` |
| POST | `/api/v1/acomodacoes/anfitriao/admin/carteira/bulk` |
| PATCH | `/api/v1/acomodacoes/anfitriao/admin/carteira` |

## CSV bulk

```text
corretorId,proprietarioId
42,101
42,102
```

## Staging (após merge #511)

1. Importar CSV do gerente.
2. Confirmar `GET /admin/carteira?corretorId=<id>` com status `ativo`.
3. Proposta paid na unidade do proprietário → lançamento corretor em `/anfitriao/comissoes` (runbook comissões MVP-B).
