# RSV360 — PACOTE C Owner Ballot Template

**Uso:** copiar o bloco abaixo, preencher com a opção escolhida, enviar na mensagem do Owner.  
**Efeito:** registra decisões em `PACOTE_C_OWNER_DECISION_REGISTER.md`.  
**Não autoriza:** CODE · MIGRATION · COMMIT · PUSH.

---

## Opções rápidas

| OD | A | B | C | DEFER |
|---|---|---|---|---|
| OD-C-01 barrel | não alterar index | export só C1/C2 | export + G-C.9 (reject) | adiar |
| OD-C-02 fatias | C1→C2→C3 | C1+C2 depois C3 | monólito | adiar |
| OD-C-03 reexport G-C.9 | NÃO | SIM (só se 01=B) | — | adiar |
| OD-C-04 × 0064 | CODE + Migration GO separado | CODE só após 0064 everywhere | — | adiar |
| OD-C-05 payments dual-tree | EXCLUIR do C | só server/modules | ambas árvores | adiar |
| OD-C-06 partners routes | OUT | incluir C3 | deep-dive primeiro | adiar |

**Recomendações Gatekeeper:** 01=A · 02=A · 03=A · 04=A · 05=A · 06=C (depois A se incerto).

---

## Bloco para colar (Owner)

```text
PACOTE C — Owner Ballot

OD-C-01 — 
OD-C-02 — 
OD-C-03 — 
OD-C-04 — 
OD-C-05 — 
OD-C-06 — 

Owner Decision:
Registrar somente as decisões acima.
CODE GO / MIGRATION GO / COMMIT GO / PUSH GO = NÃO AUTORIZADOS por este ballot.
```

### Exemplo (recomendações — NÃO é autorização automática)

```text
PACOTE C — Owner Ballot

OD-C-01 — A
OD-C-02 — A
OD-C-03 — A
OD-C-04 — A
OD-C-05 — A
OD-C-06 — A

Owner Decision:
As seis Owner Decisions (OD-C-01…06) estão formalmente DECIDIDAS conforme letras acima.
CODE GO / MIGRATION GO / COMMIT GO / PUSH GO = NÃO AUTORIZADOS por este ballot.
```

---

## Após o ballot

1. Agente atualiza `PACOTE_C_OWNER_DECISION_REGISTER.md` → CLOSED.  
2. Agente atualiza `PACOTE_C_BLOCKERS_REGISTER.md` → CLEARED onde couber.  
3. STOP permanece até token **`CODE GO — PACOTE C — <fatia>`** (ou equivalente literal).
