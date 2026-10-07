# PA-W4 — Tariffs Provenance Report (W4 PASS — ambiguidade RESOLVIDA)

## W4.1 História
`1d8ae0b5` → `e2e3473b` → `a461c340` → `d2dd391f` → `40de59ea` → `42030ba4 (#278)` → HEAD `4a4be757` (não toca o arquivo). Diff atual = working-tree vs HEAD.

## W4.2-3 Conteúdo × formato
- `diff --numstat`: 253/253. `diff -w`: VAZIO. `diff --ignore-cr-at-eol`: VAZIO. `diff --ignore-all-space`: VAZIO.
- Classificação por região (staffAuth, parceiroAuth, masterAuth, in-handler, ordering, service calls): todas **ORIGINAL (HEAD)** — zero delta semântico. CONFIDENCE: PROVEN.
- Causa: churn EOL global (98 arquivos, ~25k/24k) — CRLF↔LF no checkout, não rewrite lógico. O "hash diferente do HEAD" do G-C.9b era EOL noise.

## W4.4 Confidence
- "Diff é 100% formato, 0% semântica": PROVEN.
- "Autoridades semânticas = HEAD = legítimas (PRs #100–#278)": PROVEN.
- Correção do registro G-C.9b: proveniência AMBÍGUA → RESOLVIDA (EOL noise). O STOP G-C.9b permanece correto pelo bloqueador arquitetural (três superfícies + partner/economic), não mais pela proveniência.
Veredito W4: PASS.
