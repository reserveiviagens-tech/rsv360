# Orientação para Cline — Lintel / Turismo (evitar loops)

## Caminho correto do repositório

**Não usar** `c:/Users/RSV/Documents/rsv360` (caminho errado).

**Usar sempre:**

```text
C:\Users\RSV 360\Documents\rsv360
```

## PowerShell: o que NÃO fazer

- **Nunca** enviar isto ao terminal (sintaxe inválida — causa `MissingTypename`):
  - `["Test-Path docs/dev/CLINE-LINTEL-GUIDANCE.md")`  ← `[` + aspas + `)` no fim
- O erro vem de misturar **array JSON** com **parêntesis PowerShell**. O PowerShell vê `[` como operador de tipo, não como início de lista.
- Se a ferramenta `run_commands` exigir **array JSON**, o fecho correcto é `"]` e não `")`:
  - ❌ `["Get-Content docs/dev/CLINE-LINTEL-GUIDANCE.md")`
  - ✅ `["Get-Content docs/dev/CLINE-LINTEL-GUIDANCE.md"]`  (raro — preferir abaixo)
- **Para ler este ficheiro:** usar a ferramenta de **ler ficheiro** do Cline/IDE, **não** `run_commands`.
- Não colar `>>` multilinha misturando `cd` e scripts.
- Não rodar caminhos relativos a partir de `C:\WINDOWS\system32`.

## Comandos válidos (copiar exatamente — uma string, sem `[` no início)

```powershell
Set-Location -LiteralPath 'C:\Users\RSV 360\Documents\rsv360'
Test-Path -LiteralPath 'docs\dev\CLINE-LINTEL-GUIDANCE.md'
Get-Content -LiteralPath 'docs\dev\CLINE-LINTEL-GUIDANCE.md' -TotalCount 30
Get-ChildItem -LiteralPath '.\apps\turismo\components\lintel'
```

```powershell
npm run lint --workspace=apps/turismo
```

## Preferir ferramentas de edição, não shell para listar

Para inventário de ficheiros, usar **leitura/edição no IDE**, não repetir `Get-ChildItem` em loop após falha.

## Estado actual (pós-correcção Cursor)

| Item | Situação |
|------|----------|
| `lintel/price-gauge.tsx` | Existe |
| `lintel/search-bar.tsx`, `notification-bell.tsx`, `theme-toggle.tsx`, `profile-dropdown.tsx` | Corrigidos (removidos merge/duplicados) |
| `deals/deals-kanban.tsx`, `pages/deals.tsx` | Reescritos (DnD HTML5 + estado optimista local) |
| Integração no header (`LintelHeaderActions` → `RSV360ExecutiveDashboard`) | **Feito** |
| Badges em tabs (`LintelNavTabBadge`) | **Feito** (Leads 4, Negócios 6) |
| `PriceGauge` (`LintelSemiCircularPriceGauge`) no detalhe do imóvel | **Feito** |
| `Carousel` no overview (featured) + preview de fotos no imóvel | **Feito** |
| API `PATCH /api/deals/{id}/stage` | **Pendente** — só mock na página |

## Próxima fatia sugerida (1 PR)

1. Integrar `PriceGauge` onde ainda houver gauge inline no overview (se aplicável).
2. `carousel.tsx` / hover `buttons.tsx` (Fase 2 do plano).
3. Build turismo (`docker compose build turismo` ou `npm run build` no workspace).

**Já feito (não refazer):** `LintelHeaderActions`, badges em tabs, deals DnD, ficheiros lintel corrigidos.

## Limites do agente

- Patches ≤150 linhas / ≤5 ficheiros por fatia (política PR).
- Não editar `.env` nem secrets.
- Se o modelo free limitar, parar e reportar (não repetir o mesmo comando 5×).
