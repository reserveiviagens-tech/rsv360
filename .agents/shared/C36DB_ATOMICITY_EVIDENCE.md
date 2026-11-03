# C36DB — Atomicity Evidence

Production path: `reverseAtomic` runs `UPDATE earning reversed` + `INSERT debit` in one `db.transaction`.

Staging controlled failure (payment F):

1. Create earning+credit.
2. Call `reverseAtomic` ports that UPDATE status then `throw C36DB_FORCED_ROLLBACK` inside TX.
3. Observed: `atomicThrew=true`, `earnFStatusAfterFail=pending`, `debitFAfterFail=0`.

```text
No partial state: earning not left reversed without debit; no orphan debit.
ATOMICITY = PASS
```
