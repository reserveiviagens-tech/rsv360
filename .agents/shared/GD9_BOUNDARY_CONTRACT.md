# RSV360 — G-D.9 Boundary Contract  
## cotacao-publica × propostas

**CODE GO:** G-D.9  
**Data:** 2026-10-07  
**Status:** CONTRACT (normativo para testes estáticos)

---

## 1. Princípio

```text
Dois módulos · um domínio de proposta · autoridades distintas por superfície
NÃO merge de routers · NÃO um único auth chain
```

| Superfície | Módulo | Autoridade |
|---|---|---|
| Wizard público / gerar / aceitar / roteiro | `cotacao-publica` | Capability `tokenPublico` (`rt-*`) + limiters/Turnstile |
| Staff CRUD / aprovação / HITL / DELETE | `propostas` | `staffAuth` / `agentAuth` alias / matriz G-D.1 |
| Read `:id` IDOR | `propostas` + `proposta-access` | staff Set / owner / redacted / `rt-*` |
| Indicação staff autenticada | `propostas` `POST /:id/indicacao` | **G-D.10** JWT binding |
| Indicação pública (ref) | `cotacao-publica` `POST /proposta/:token/indicacao` | Token público + indicador ativo existente (modelo público; ≠ G-D.10) |

---

## 2. Contratos obrigatórios

### C1 — Accept guest
Guest **accept** = somente  
`POST /api/v1/cotacao-publica/proposta/:token/aceitar`  
`POST /propostas/:id/responder` com `action=accept` = staff/owner only (guest → 404).

### C2 — Token capability
Leitura/aceitação pública usa `tokenPublico` / path `:token`, não authority de `enterpriseId` nem role Partner.

### C3 — Dependência de serviço (permitida)
`cotacao-publica` **pode** importar serviços de `propostas` (create, validade, payload, metrics).  
Isso **não** importa `staffAuth` / membership / economic actor para rotas públicas.

### C4 — Dependência inversa (restrita)
`propostas` pode chamar `cotacaoPublicaService` para validade por token.  
Não montar rotas públicas de cotação dentro do router staff.

### C5 — Não reabrir
Economic (G-D.6) · MGM staff binding (G-D.10) · RANK (G-D.2) · AI (G-D.8) ·  
`staffAuth` export · WS · migrations · merge de módulos.

### C6 — Indicação dual (documentado)
| Path | Binding |
|---|---|
| Staff `/propostas/:id/indicacao` | `resolveIndicadorIdFromAuth` (JWT) |
| Público `/cotacao-publica/.../indicacao` | body `indicadorId` + existência/ativo + token público |

Hardening do path público para eliminar body-as-ref **não** está em G-D.9 (exige OD/gate próprio).

---

## 3. STOP se

- Unificar routers  
- Aplicar `staffAuth` em rotas públicas de cotação  
- Reabrir economic/MGM staff/AI/RANK  
- Migration / gateway / WS  
