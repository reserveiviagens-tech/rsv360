# Matriz Parceiro — Overview Lintel RSV360

> Base UI: `apps/turismo/pages/overview.tsx` + `components/RSV360ExecutiveDashboard.tsx`  
> Origem restaurada pelo owner (eng. reversa Lintel → RSV360), commit de referência **377c253c** (Versão Oficial).  
> Motor operacional: `fase1Api`, carteira P0.5, comissões MVP-B no monorepo `reserveiviagens-tech/rsv360`.

## Personas × acesso × rotas

| Persona | `users.role` (hoje) | Entrada pós-login | Overview | `/anfitriao/*` | Staff bulk carteira |
|--------|---------------------|-------------------|----------|----------------|---------------------|
| Proprietário / anfitrião | `anfitriao` | `/overview` | KPIs + unidades (fase 2) | Unidades, calendário, reservas | Não |
| Captador / corretor / indicador | `corretor` | `/overview` | Pipeline + contacts (fase 2) | Comissões, carteira (leitura) | Não |
| Agente / agência / vendedor pacote | *futuro* `agente`, `agencia`… | `/overview` | Deals/leads (fase 3) | Conforme escopo B2B | Não |
| Staff operação | `admin`, `manager` | `/dashboard` | Opcional | Admin verificação | **`/anfitriao/admin/carteira-corretor`** |
| Cliente final / `user` | `user` | `/dashboard` | **Bloqueado** | Bloqueado | Não |

Guard canônico hoje: `canAccessAnfitriaoModule` em `src/lib/anfitriao-auth.ts` (`anfitriao`, `corretor`, `admin`, `manager`).

## Abas Executive Dashboard × API × fase

| Aba UI (`RSV360ExecutiveDashboard`) | Dado hoje | API alvo (monorepo) | Fase |
|-------------------------------------|-----------|---------------------|------|
| **Overview** | Mock KPIs / gráficos | Carteira totals + comissões + propostas abertas | **1** mock → **2** KPI real |
| **Rentals** | Mock imóveis | Unidades `/anfitriao` + `status_publicacao` | 2 |
| **Sales** | Mock | Propostas / orçamentos | 3 |
| **Deals** | Mock pipeline | Propostas status + paid | 3 |
| **Leads** | Mock | Convites / captação (futuro) | 3 |
| **Contacts** | Mock + chat | Carteira N:N + `anfitriaoListarCarteiraCorretor` (escopo corretor) | **2** |

Staff **não** usa bulk CSV no Overview; mantém **`fase1Api.anfitriaoAtribuirCarteiraBulk`** só em `/anfitriao/admin/carteira-corretor`.

## Regras enterprise (não quebrar)

- Preço, paid, comissão, elegibilidade carteira: **servidor** (`anfitriao.service`, comissões).
- IDOR: corretor só proprietários na carteira; anfitrião só `proprietario_id = user.id`.
- LGPD: sem PII em mock/demo em produção; mascaramento já usado na listagem carteira.

## PRs sugeridas (fatias)

1. **Port shell** — overview + dashboard + guard + `getPostLoginPath` parceiro → `/overview` *(esta entrega)*.
2. **Overview KPIs reais** — queries `fase1Api` carteira + `minhas-comissoes`.
3. **Contacts tab** — grid carteira reutilizando contratos P0.5 (sem duplicar bulk staff).
4. **Roles B2B** — agência/agente/pacote (schema + RBAC) antes de abrir Deals/Leads a todos.

## Dev local

```powershell
.\scripts\dev-turismo-local.ps1
# http://localhost:3005/overview  (parceiro logado)
# http://localhost:3005/anfitriao/admin/carteira-corretor  (staff)
```

Não usar container `rsv360-turismo` antigo na `:3005` sem rebuild — rotas `/overview` e `/anfitriao/admin/*` não existem no bundle velho.
