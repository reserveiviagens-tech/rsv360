# C36-CH — Post-Merge Audit (0058→0061)

**Date:** 2026-09-28 (America/Sao_Paulo)  
**Predecessor:** C36-CG PASS / MERGED @ `092de2ee`  
**Mode:** Read-only forensic audit — **no APPLY · no writer · no deploy**

## Status

```text
C36-CH = PASS / CHAIN_RECONCILED
MAIN_TIP = 092de2ee
JOURNAL_TIP_TAG = 0061_partner_earnings_booking_payment_and_terms (idx 61)
0059_IMMUTABLE = YES
FINANCIAL_WRITER_INTRODUCED = NO
```

---

## Migration chain (repo @ origin/main)

| idx | tag | sql sha256 | snapshot |
|-----|-----|------------|----------|
| 58 | `0058_payments_tables` | `e5f545c429e7235e…` | present |
| 59 | `0059_partner_domain` | `33c56245e9b70d01…` | present |
| 60 | `0060_partner_empreendimento_associations` | `5b1f6c5e50dd6b57…` | present |
| 61 | `0061_partner_earnings_booking_payment_and_terms` | `ef006077947b4cf8…` | present |

Journal: **62** entries, tip **0061**, when monotonic `…8000000 < …9000000 < …0000000`.

### 0059 immutable

- `booking_payment` **absent** from `0059_partner_domain.sql`
- Present only in **0061** (additive CHECK)

### 0061 contents (confirmed)

- CREATE `partner_commercial_terms`
- Unique partial one `active` per PEA
- ALTER CHECK includes `booking_payment`
- ADD `partner_earnings.metadata jsonb`
- No INSERT writers

### Writer scan (server + backend/src excl. tests)

```text
INSERT INTO partner_earnings | partner_ledger | createPartnerEarning | booking_payment writer
→ NONE
```

---

## Next

```text
C36-CI = GO / CONTROLLED 0061 APPLY (staging)
```
