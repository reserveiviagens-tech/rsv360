# PA-W2 — Economic Authority Boundary (W2 PASS)

## W2.1 Operacional (READ/CONFIG/OPERATIONAL WRITE)
- CRUD config/categorias/temporadas/regras (tarifas staff, 13 rotas): CONFIG econômico-adjacente, sem efeito financeiro direto por si (efeito via motor futuro). Classificação: CONFIG-WRITE (econômico-indireto). CONFIDENCE: PROVEN.
- Sync/import (G-C.9a): OPERATIONAL WRITE, não-econômico (evidência G-C.9a). Index públicas: READ.

## W2.2 Econômico (efeito financeiro direto)
- `resolverTarifa` (tarifa.service:172): base `preco_diaria` (:186); motor off→flat (:191-202); preview dry-run (:204-208). ECONOMIC READ com efeito-preço. `acomodacoes.service:148` e `rate-calendar:338` consomem no fluxo de reserva/preço-dia → impacto financeiro real. CONFIDENCE: PROVEN.
- `GET /politica-desconto` → `getPoliticaDesconto` (:1006-1017): expõe tetos ativos sem scoping. ECONOMIC READ sensível. CONFIDENCE: PROVEN.
- `PUT /politica-desconto` → `upsertPoliticaDesconto` (:1019-1088): escreve teto + audit (:1079-1085), gate MASTER_ROLES (:1030). ECONOMIC WRITE. CONFIDENCE: PROVEN.
- `aplicarDesconto` (:1090-1096, BROKER+STAFF) + `validarDesconto` com teto (:1186-1236): ECONOMIC WRITE com cap por role. CONFIDENCE: PROVEN.
- Rate-calendar writes (`atualizarPricingDefaults`, `atualizarDia`, etc. :593,718,748): MASTER_ROLES → ECONOMIC WRITE. `canEditPricing: MASTER_ROLES.has` (:571) vs `canApplyDiscount: BROKER||STAFF` (:572): leitura já distingue edição de preço de aplicação de desconto. CONFIDENCE: PROVEN.

## W2.4 Boundary Rule
Enterprise Role isolado é INSUFICIENTE onde há Partner Authority e/ou Economic Authority. Modelo exigido: **Modelo D (Enterprise + Partner + Economic)** para superfícies partner-aware/econômicas; Modelo A só onde não há partner nem efeito econômico (ex.: sync). Nenhum código alterado para decidir.
Veredito W2: PASS.
