---
name: project_stack
description: Tech stack, fájlszerkezet és adatbázis-architektúra a pilot-eroforras projektben
type: project
---

Browser-only alkalmazás (nincs backend): sql.js (WASM SQLite) + IndexedDB perzisztencia.

**Why:** Offline-first, böngészőben futó diszpécser-eszköz sofőr/projekt/gép nyilvántartáshoz.

**How to apply:** Nincs Node.js fut tatható teszt runner elérhető natívan — E2E tesztek csak böngészőben futtathatók (Playwright headless Chrome ajánlott). Nincs hálózati API, minden I/O sql.js + IndexedDB.

Fő fájlok:
- `src/db.js` — sql.js inicializálás, IndexedDB wrapper, import/export
- `src/crud.js` — CRUD wrapper + audit log (valtozas_log)
- `src/crud-test.html` — manuális tesztelő UI

Táblák: sofor, projekt, gep, napi_terv, napi_teny, valtozas_log

CRUD pattern: getDB() minden hívásban, COALESCE alapú partial update, logChange() minden write után.
