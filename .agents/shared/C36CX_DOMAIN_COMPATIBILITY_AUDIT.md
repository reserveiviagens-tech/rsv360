# C36-CX — Domain Compatibility Audit

**Status:** `PASS / NO_CROSS_RAIL_FALLBACK`

| Domain | Impact |
|--------|--------|
| Affiliate commission | untouched; not used as rate SoT |
| Marketplace partner_pct | untouched |
| Ops comissoes | untouched |
| Partner domain 0059 | immutable |
| Bookings / payments | confirmation hook additive only |
| Inventory resolver | used as inventory SoT only |

New flow does not break legacy rails; does not fall back to them for Partner earning rate.
