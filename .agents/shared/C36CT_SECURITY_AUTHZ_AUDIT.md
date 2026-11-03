# C36-CT — Security + Authorization Audit

**Status:** `PASS / AUTH_AUDIT_COMPLETE`

| Check | Result |
|-------|--------|
| Commercial terms API staff AuthZ | `assertPartnerStaffAccess` |
| Unauthenticated → Forbidden mapping | routes map `PartnerForbiddenError` → 403 |
| Membership IDOR helper | partners.service IDOR check on membership path |
| partner_links ≠ AuthZ | confirmed unused for AuthZ (CK comment + service) |
| Rate fallback ops/affiliate | no `commission_rate` / `comissoes_config` / `partner_pct` in partners earning path |
| Multi-PEA first-row | forbidden; `resolveExclusiveCommercialOwner` fail-closed |

Earning/ledger writers are server-side only (no public mutate routes for earnings).
