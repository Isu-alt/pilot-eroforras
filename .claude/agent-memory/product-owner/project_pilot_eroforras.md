---
name: pilot-eroforras project overview
description: Core facts about the pilot-eroforras offline browser-based dispatcher system project — tech stack, scope, data model, and iteration plan
type: project
---

The pilot-eroforras project is an offline-first, browser-based dispatcher system for managing daily driver/equipment assignments.

**Why:** The system must run without a server, directly from the file system in a browser, to support field use cases with no connectivity requirement.

**How to apply:** When suggesting architecture, tooling, or implementation approaches, always default to browser-native, serverless solutions. No REST API, no Node.js at runtime. Node.js + Prisma is only used in the developer environment for prototyping.

## Stack

- Runtime: sql.js (SQLite WASM) + IndexedDB for persistence; .sqlite file download/upload as backup
- Frontend: pure HTML / CSS / ES modules (no framework)
- Import/Export: SheetJS (xlsx) via CDN or local bundle
- Dev environment only: Node.js + TypeScript 5.x + Express 4 + Prisma 4 + SQLite (file-based)

## Core tables (browser SQLite schema)

sofor, projekt, gep, napi_terv, napi_teny, valtozas_log

## Application roles

Admin, Diszpécser/Operátor, Olvasó

## HTML pages

index.html (dashboard), soforok.html, projektek.html, gepek.html, napi_rogzites.html, napi_tervezes.html, import_export.html, settings.html

## Iteration plan — ALL COMPLETE (as of 2026-04-05)

All 11 iterations delivered. Project is 100% complete.
- Iter 1–2: P0 — DB infra + CRUD + audit log — DONE 2026-04-03
- Iter 3: P1 — Master data pages — DONE 2026-04-03
- Iter 4–5: P0 — Excel import pipeline + fuzzy name matching — DONE 2026-04-03
- Iter 6–7: P0 — Daily recording + planning/auto-proposal — DONE 2026-04-03
- Iter 8–10: P1 — Export, dashboard, settings — DONE 2026-04-03
- Iter 11: P2 — QA + documentation — DONE 2026-04-05

## Deliverables

- src/ — all application source files (8 HTML pages + JS modules + CSS)
- tests/manual_test_checklist.md — 24 test cases, 10 sections (Hungarian)
- tests/smoke_test.js — ~35 assertions, browser-console runnable
- docs/felhasznaloi_kezikonyv.md — user manual, 8 chapters, ~450 lines (Hungarian)
- docs/admin_kezikonyv.md — admin manual, 6 chapters, ~380 lines (Hungarian)

## Key source docs

- docs/backlog.md — canonical backlog (created 2026-04-03, this is the single reference)
- docs/PILOTE_PR_MS_SMALL.md — system design spec
- docs/PILOTE_Environment_minimal.md — dev environment setup
