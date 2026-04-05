---
name: project_test_artifacts
description: Tesztfájlok helye, struktúrája és futtatási módja a pilot-eroforras projektben (2026-04-05 óta léteznek)
type: project
---

Manuális tesztelési ellenőrzőlista és böngészős smoke teszt létrehozva 2026-04-05-én.

**Why:** Az alkalmazásnak nincs build rendszere, npm, vagy Playwright/Cypress setup — a tesztek a böngésző konzolból futtathatók.

**How to apply:** Ha tesztírási vagy tesztelési feladat jön, ezeket az artefaktokat kell frissíteni, nem újakat létrehozni.

Fájlok:
- `tests/manual_test_checklist.md` — Magyar nyelvű, 10 szekciós manuális ellenőrzőlista (TC-S, TC-D, TC-P, TC-G, TC-R, TC-T, TC-E, TC-DAS, TC-NAV, TC-LOG prefixszel)
- `tests/smoke_test.js` — Böngésző konzolba illeszthető JS script; importálja a db.js, crud.js, identity.js modulokat közvetlenül; 9 szekcióban ~35 assert; önálló assert/section helper; PASS/FAIL színes konzol kimenet

Futtatási feltétel: az alkalmazást http(s):// protokollon kell megnyitni (pl. Live Server vagy `npx serve src`), NEM file:// protokollon, az ES modul import miatt.

Teszt lefedettség:
- identity.js: saveIdentity, getIdentity (fallback, hibás JSON, üres name)
- sofor: CREATE/READ/UPDATE/DELETE, COALESCE viselkedés, NOT NULL kényszer
- projekt: CREATE/READ/UPDATE, UNIQUE munkaszám kényszer
- gep: CREATE/READ/UPDATE/DELETE, üres mezők elfogadása
- napi_teny: CREATE/READ/UPDATE/DELETE, alapértelmezett allapot
- napi_terv: CREATE/READ/UPDATE/DELETE, allapot átmenet (javasolt→elfogadott)
- valtozas_log: INSERT/UPDATE/DELETE bejegyzések ellenőrzése
