# PA-W6 — G-C.9 Re-entry Plan (W6 PLAN PROPOSED — sem reabertura automática)

Estados preservados: G-C.9a PASS/CLOSED; G-C.9b BLOCKED/STOP; G-C.9c BLOCKED/NOT STARTED.

## W6.1 G-C.9b → RESTRUCTURE (proposto, depende PA-DEC-001/002/005/006/008/009/010)
- G-C.9b.1 Staff Tariff Authority (13 rotas staffAuth): Modelo A, manager. Pré-req: PA-DEC-009 (proveniência aceita).
- G-C.9b.2 Partner Tariff Read (categorias/temporadas/regras se expostas a partner — hoje staff-only; confirmar): Modelo D.
- G-C.9b.3 Partner Tariff Simulation (`/simular` não-preview): Modelo D + carteira scoping preservado.
- G-C.9b.4 Economic Policy Read (`GET politica`): Modelo D + SCOPING OBRIGATÓRIO (hoje sem scoping — achado W3).
- G-C.9b.5 Economic Policy Write (`PUT politica`): Modelo D + MASTER_ROLES preservado + audit.
- Nenhum sub-gate existe oficialmente até Owner aprovar PA-DEC-010.

## W6.2 G-C.9c → SPLIT INTO SUB-GATES (proposto, depende PA-DEC-005/011)
- G-C.9c.1 Index (públicas READ sem auth + admin staffAuth/adminAuth): Modelo A p/ admin; públicas N/A.
- G-C.9c.2 Anfitrião Read (dashboard/desempenho/listagens): Modelo D.
- G-C.9c.3 Anfitrião Write (calendário, NFSe, cohosts, iCal): Modelo D + podeGerenciarUnidade/carteira/cohost.
- G-C.9c permanece BLOCKED/NOT STARTED até PA-DEC-011.

## Test strategy (contrato futuro, sem implementação nesta wave)
Positive/negative (insufficient role, missing membership, invalid role, cross-enterprise, spoofed identity/claims) + legacy flag-OFF bit-by-bit + canonical flag-ON + economic boundary (nenhum teste toca RefundService/Ledger/Earnings/Payout/Gateway).
Veredito W6: PLAN PROPOSED — reentrada SOMENTE via OWNER REVIEW → OWNER GO → SPECIFIC IMPLEMENTATION GATE.
