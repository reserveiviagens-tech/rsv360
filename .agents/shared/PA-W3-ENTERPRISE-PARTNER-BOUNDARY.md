# PA-W3 — Enterprise × Partner Boundary (W3 PASS)

## W3.1 Cadeia canônica (reconfirmada, sem alteração)
`enterprise_users.role` → RoleAssignment Repository → MembershipRecord.recordRole → CanonicalRoleContext → `requireEnterpriseRole()` (role.guards.ts:39). Hierarquia owner>admin>manager>viewer. Claim JWT nunca é fonte (rbac.mapping.ts:48-53, I-07). Plug: flag `WS15_MEMBERSHIP_AUTHORITY` OFF→DenyAll/no-op complementar (membership.plug.ts:24-56; padrão G-B/G-C: flag OFF next(), ON fail-closed).

## W3.2 Eligibility Matrix (evidência própria de cada superfície)

| Surface | Legacy Authority | Partner? | Enterprise Eligible | Min Enterprise Role | Economic? |
|---|---|---|---|---|---|
| Sync | staffAuth admin/manager/user | Não | Sim (PROVEN G-C.9a) | viewer | Não |
| Import | importAuth admin/manager | Não | Sim (PROVEN G-C.9a) | manager | Não |
| Tarifas staff (13 rotas) | staffAuth admin/manager | Não | **Sim, Modelo A** (sem partner; config indireto) | **manager** (espelha legado; sem rebaixamento pois efeito-config econômico-indireto) | Indireto |
| Simular (não-preview) | parceiroAuth + obterUnidade scoping | Sim | **Não isolado; só Modelo D** | — (enterprise não cobre carteira) | Sim (preço) |
| Simular preview=1 | staff in-handler | Não | Sim, Modelo A | manager | Sim (dry-run sensível) |
| Política GET | parceiroAuth sem scoping | Sim (sem scoping!) | **Não isolado; Modelo D + SCOPING OBRIGATÓRIO** | — | Sim (tetos) |
| Política PUT | masterAuth + MASTER_ROLES | Sim (anfitriao!) | **Não isolado; Modelo D** | — (anfitriao não tem equivalente enterprise; `jwt-claim` recusado por design) | Sim (write) |
| Index públicas | nenhuma (publicLimiter) | Não | N/A | — | Não |
| Index admin | adminAuth/staffAuth | Não | Sim, Modelo A | admin/viewer por rota | Parcial (addons preço-tipo) |
| Anfitrião | parceiroAuth/masterAuth/staffAprovacao + podeGerenciarUnidade/carteira/cohost | Sim | **Não isolado; Modelo D** | — | Parcial (calendário, NFSe, cohosts) |

## W3.3 Composição
Modelo D vence para toda superfície partner-aware ou econômica: `Enterprise + Partner + Economic`. `requireEnterpriseRole()` isolado (Modelo A) é arquiteturalmente incorreto onde partner authority existe — prova o STOP G-C.9b: guard único `manager` quebraria carteira/anfitriao ou afrouxaria tetos.
Veredito W3: PASS.
