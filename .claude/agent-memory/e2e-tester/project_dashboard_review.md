---
name: dashboard_review_findings
description: Code review findings and known bugs in src/index.html dashboard — recorded after first full review pass
type: project
---

Dashboard review completed 2026-04-03.

**Critical bug (BUG-1):** `determineState()` compares `terv.munkaora` against `teny.munkaora`, but `napi_terv` has no `munkaora` column — the schema uses `kezdes`/`vegez` (TIME strings). Comparing against `null ?? 0` will always evaluate as zero, making hour-deviation detection dead code. The `elteres` state can only be triggered by `projekt_id` mismatch; hour deviations are never caught.

**Critical bug (BUG-2):** `buildRowHtml()` passes `rowClass` (a plain JS string with spaces) through `escHtml()`, which escapes nothing here but is semantically wrong — and if the class string ever contains `&` characters it would break the rendered class attribute. Cosmetic/low risk now but architecturally unsound.

**Minor bug (BUG-3):** `projekt.nev` is referenced in `buildCellHtml()` but the `projekt` table schema has no `nev` column — only `munkaszam`, `helyszin`, `megrendelo`, `leiras`. The fallback to `munkaszam` works correctly, but `projekt.nev` will always be falsy, making the first branch of the ternary permanently dead.

**Minor bug (BUG-4):** The `nem_tervezett` filter chip maps to `row.state !== 'hianyzo_terv'` in `getVisibleRows()`, which is correct behaviour (the two are aliases), but the comment in the state constants block says `nem_tervezett` is "alias" of `hianyzo_terv` yet `determineState()` never returns `'nem_tervezett'`. This is consistent but confusing — not a runtime bug.

**Minor bug (BUG-5):** `renderKpi()` iterates `allPairedRows` (the full unfiltered set) — this is correct and intentional for KPI accuracy, but if the user expects KPIs to reflect the current filter view the behaviour is surprising. No code fix required unless requirements change; note for test coverage.

**Architecture note:** `loadDashboard` is not async-gated — it calls `getAllSoforok()`, `getAllProjektek()`, `getAllGepek()`, `getNapiTervByDatum()`, `getNapiTenyByDatum()` all synchronously (they are sync wrappers over sql.js exec). This is correct; the `async` keyword on `loadDashboard` exists only to await `initDB`. No issue.

**Why:** Recorded so future sessions know about BUG-1 (napi_terv hora mező hiánya) and BUG-3 (projekt.nev hiánya) without re-reading the schema.
**How to apply:** When any feature touches state calculation or project display, check against these known bugs first.
