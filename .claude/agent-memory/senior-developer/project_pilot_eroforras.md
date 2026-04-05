---
name: pilot-eroforras project context
description: Core architecture decisions and stack for the pilot-eroforras offline browser-based dispatcher system
type: project
---

Offline, browser-based dispatcher system (diszpécserrendszer) built with pure HTML/JS/CSS — no Node.js runtime in the browser app.

**Why:** The app must work from `file://` protocol, fully offline, with no server dependency.

**How to apply:** Never suggest Express, Prisma, or server-side code for the browser app layer. All persistence is IndexedDB + sql.js (SQLite WASM). ES modules via `type="module"` script tags. CDN libraries loaded at runtime.

## Stack
- sql.js 1.10.2 (CDN: cdnjs.cloudflare.com) — SQLite in WASM
- SheetJS (CDN) — Excel import/export
- Pure ES modules, no bundler
- IndexedDB for persistence between sessions

## Key files (Iteration 1)
- `src/db.js` — database module: initDB, createSchema, saveToIndexedDB, loadFromIndexedDB, exportDB, importDB, getDB
- `src/db-test.html` — manual test page for the DB module

## Key files (Iteration 2)
- `src/crud.js` — CRUD wrapper for all tables + audit log (logChange writes to valtozas_log). Exports: createSofor/getAllSoforok/getSoforById/updateSofor/deleteSofor, same pattern for projekt/gep/napi_teny/napi_terv, plus getValtozasLog.
- `src/crud-test.html` — interactive test page for the CRUD module

## CRUD module conventions
- rowsToObjects(resultSet): converts db.exec() result [{columns, values}] → [{col: val}]
- lastInsertId(): SELECT last_insert_rowid() after each INSERT (sql.js does not return it from db.run())
- COALESCE(?, col) pattern in UPDATE: only non-null params overwrite existing values
- logChange() never throws — audit failures are logged but do not abort the main operation
- importDB in db.js: corrupt file path saves prevDb before parse attempt, restores on failure, throws 'Hibás .sqlite fájl — az adatbázis változatlan maradt.'

## IndexedDB config
- DB name: `pilot-db`
- Object store: `db`
- Key: `main`

## DB schema tables
sofor, projekt, gep, napi_terv, napi_teny, valtozas_log

## Key files (Iteration 3)
- `src/shared.css` — full design system: CSS variables, sidebar, page header, filter tabs, table, badges, form panel, machine icon box
- `src/soforok.html` — Driver management page (sofőrök). Status: aktiv/inaktiv. Aliases stored as JSON string in `aliasok` column.
- `src/projektek.html` — Project management page. `statusz` column (aktiv/lezarva) added via ALTER TABLE ADD COLUMN on page load (try/catch, column may already exist).
- `src/gepek.html` — Machine management page. `allapot` column (elerheto/szerviz/kivont) added via ALTER TABLE ADD COLUMN on page load (same pattern).

## Schema extension pattern (Iterations 3+)
The base `projekt` and `gep` tables lack `statusz`/`allapot` columns. Pages extend them at runtime:
```js
try { getDB().run(`ALTER TABLE projekt ADD COLUMN statusz TEXT DEFAULT 'aktiv'`); } catch (_) {}
```
After ALTER, the CRUD wrappers (updateProjekt/updateGep) use COALESCE so the new column must be updated via direct getDB().run() calls — not through the CRUD API.

## COALESCE trap in CRUD update functions
updateProjekt(id, data) and updateGep(id, data) only update columns defined in the original schema. Extra columns added via ALTER TABLE must be set with direct `getDB().run('UPDATE ... SET extra_col = ?', ...)` calls after calling the CRUD wrapper.

## Key files (Iteration 4 — Settings page)
- `src/settings.html` — Settings page. Two cards: (1) user identity form saved to localStorage key `dispatcher_identity` as `{name, role}`, (2) DB management: .sqlite restore via importDB(), full wipe with DELETE in FK order.
- `src/identity.js` — Tiny module. Exports `getIdentity()` (reads localStorage, returns `{name, role}` defaulting to `{name:'Ismeretlen', role:'Diszpécser'}` on parse failure) and `saveIdentity(name, role)`.

## Identity / audit log integration
`crud.js` imports `getIdentity` from `./identity.js`. The `logChange()` internal function calls `getIdentity().name` at write time — no argument needed from callers. All CRUD pages pick up the name automatically from localStorage without any page-level changes.

## Sidebar nav pattern (canonical — all pages)
Full ordered nav: Dashboard → Sofőrök → Projektek → Gépek → [divider] → Napi rögzítés → Napi tervezés → Import / Export → Beállítások. Each page sets `class="nav-item active"` on its own entry.

## Sidebar footer pattern (canonical — Iteration 11)
The sidebar footer shows the logged-in user's name dynamically. Canonical HTML:
```html
<div class="sidebar-footer">
  <div class="sidebar-user-info" id="sidebarUserInfo">
    <svg width="14" height="14" ...>...</svg>
    <span id="sidebarUserName">—</span>
  </div>
</div>
```
Each page's `<script type="module">` imports `getIdentity` from `./identity.js` and sets:
```js
document.getElementById('sidebarUserName').textContent = getIdentity().name;
```
This line is placed at the top of the init block, before `await initDB()`, so it renders synchronously without waiting for the DB.

## identity.js validation (Iteration 11)
`getIdentity()` now validates the parsed object: must be a non-null object with non-empty `name: string` and `role: string`. Returns fallback `{name:'Ismeretlen', role:'Diszpécser'}` on any failure or invalid shape.
