---
name: pilot-eroforras iteration status
description: Current iteration selection state — which iteration is active, which is next, and why
type: project
---

## Iteráció 1 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** Az sql.js WASM alapinfrastruktúra, mind a 6 alaptábla (sofor, projekt, gep, napi_terv, napi_teny, valtozas_log), az IndexedDB perzisztencia, és a .sqlite import/export funkció elkészült és tesztelve.

**Technikai adósság (e2e-tester validációjából):**
- file:// + Chrome modul import blokkolás — deployment előtt figyelni
- Corrupt import utáni db === null állapot recovery hiányzik
- initDB() újrahívás előtt nincs explicit db.close() — enyhe memória szivárgás
- updated_at mező nem frissül automatikusan — Iteráció 2 CRUD wrapperben app-szinten kell kezelni

---

## Iteráció 2 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** Az összes alapadattáblához (sofor, projekt, gep, napi_terv, napi_teny) egységes CRUD wrapper függvények elkészültek, az audit log (valtozas_log) automatikus rögzítése minden create/update/delete műveletnél működik, hibakezeléssel.

**Technikai adósság:**
- updateX(id, {mezo: null}) nem törli a mezőt — COALESCE csapda, Iteráció 3-ban UI szintjén kezelendő
- PRAGMA foreign_keys = ON nincs engedélyezve — FK integrity nem érvényesített
- createProjekt duplikált munkaszám esetén generikus sql.js hibát dob — UI-barát hibaüzenet hiányzik

---

## Iteráció 3 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** A három törzsadat-kezelő HTML oldal (soforok.html, projektek.html, gepek.html) elkészült. Admin CRUD műveletek, alias kezelés, keresés/szűrés funkcionális.

**Technikai adósság:**
- updateX(id, {mezo: null}) null-ra állítás nem működik — COALESCE csapda (öröklött Iter 2-ből, UI workaround alkalmazva)
- Case-sensitive alias duplikátum-ellenőrzés — LOWER() normalizálás hiányzik az alias mentési logikában
- statusz/allapot mező ALTER TABLE + közvetlen SQL workaround — schema_version migrációs kezelés hiányzik
- Tab-szűrő + keresőszöveg kombinált állapot nem törlődik lapváltáskor

---

## Iteráció 4 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** A SheetJS alapú Excel import pipeline elkészült. Fájl feltöltés, sheet feldolgozás, lapnév dátum kinyerés, sorok normalizálása, alias alapú névegyeztetés, review képernyő kétes egyezésekhez, és import commit napi_terv táblába — mind funkcionális.

**Technikai adósság:**
- Partial match esetén a javasolt sofőr ne legyen automatikusan előre kiválasztva — felhasználónak tudatosan kell választani
- Datum = null esetén vizuális figyelmeztetés hiányzik az import gomb előtt
- Drop zone file input re-listener fragilis DOM-csere pattern
- `15.03.26` rövid éves formátum nem ismeri fel — null dátum visszatérés

---

## Iteráció 5 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** Fuzzy matching algoritmus implementálva (tokenizálás, sorrendi variáció tolerancia, Levenshtein-közelség, ékezet normalizálás). Manuális review-ban elfogadott névpárosítások automatikusan alias-ként mentődnek a sofor rekordba. Alias kezelés soforok.html oldalon kézzel is szerkeszthető.

**Technikai adósság:**
- `exact` és `alias` sorok vizuálisan nem különböztethetők meg a review képernyőn
- Levenshtein ellenőrzés teljes névstringen fut (nem tokeneken) — rövid neveknél false positive kockázat
- `matchSofor` partial match esetén ha levenshtein már megvan, a partial ág ki van hagyva (szándékos, de dokumentálandó)

---

## Iteráció 6 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** `napi_rogzites.html` elkészült. Diszpécser rögzíthet napi tényleges munkavégzést autocomplete mezőkkel (sofőr, projekt, gép), duplikátum ellenőrzéssel, kötelező mező validációval, soronkénti szerkesztés/törlés, és audit log bejegyzéssel.

**Technikai adósság:**
- Duplikátum check null `projekt_id` esetén hamis pozitívot adhat
- Dátumváltás nyitott szerkesztés közben elveszejti a nem mentett sorokat (nincs "Elhagyod?" figyelmeztetés)
- Sofőr kézzel beírt neve pontos egyezést vár (nincs fuzzy fallback a rögzítő oldalon)

---

## Iteráció 7 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** `napi_tervezes.html` elkészült. Az előző napi tényadatokból automatikus másnapi tervjavaslat generálható, szerkeszthető és jóváhagyható. A jóváhagyott sorok `elfogadott` státusszal kerülnek a `napi_terv` táblába.

**Technikai adósság:**
- Gyors dátumváltásnál race condition lehetséges (nincs debounce)
- `finalizePlan` await hiánya javítva (2026-04-03)

---

## Iteráció 8 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** Export és adatmentés funkciók elkészültek az `import_export.html` oldalon. CSV export, XLSX export (SheetJS), .sqlite letöltés és visszatöltés, időszak + sofőr szűrőkkel — mind funkcionális.

**Technikai adósság:**
- CSV export szemikolon-escaped, de idézőjeles mezőkön belüli szemikolon nem kezelt (nested quote hiányzik)
- XLSX második munkalap (napi_terv) nem szűrt (mindig összes rekordot tartalmazza)
- Sofőr select feltöltés a `getAllSoforok()` szinkron hívással működik — aszinkronra való átállásnál törhet

---

## Iteráció 9 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** Az `index.html` Dashboard oldal elkészült. Plan-vs-Actual táblázat 4 sorállapottal (Egyezés/Eltérés/Hiányzó rögzítés/Hiányzó terv), KPI csík 5 tile-lal (egyezés, eltérés, hiányzó, tervezett óra, tényleges óra progress bar-ral), szűrők (dátum, sofőr keresés, státusz chipek), XSS védelem. BUG-1 (determineState tervórák) és BUG-3 (projekt.nev null-ref) javítva. 14 teszteset (TC-01 – TC-14) megírva és átment.

---

## Iteráció 10 — LEZÁRVA (2026-04-03)

**Státusz:** Done
**Eredmény:** `settings.html` Settings oldal elkészült. Két fő blokk: (1) Felhasználói azonosság form (localStorage, `dispatcher_identity` kulcs), (2) DB Management — import + reset megerősítő modállal. `identity.js` új modul, `crud.js` `logChange()` frissítve. Összes 7 HTML oldal kapott "Beállítások" nav elemet. E2e teszter CONDITIONAL APPROVE: 8 teszteset (TC-01 – TC-08).

**Ismert hibák (áthozva Iteráció 11-be):**
- BUG-S1 (Medium): Sidebar footer statikus "Beállítások" szöveg ahelyett, hogy `getIdentity().name`-t mutatna
- BUG-S2 (Low): `getIdentity()` nem validálja a JSON shape-et visszaolvasáskor

---

## Iteráció 11 — LEZÁRVA (2026-04-05)

**Státusz:** Done
**Eredmény:** Minőségbiztosítás és dokumentáció befejezve. BUG-S1 javítva (mind a 7 HTML oldal sidebar footere dinamikusan jeleníti meg a bejelentkezett felhasználó nevét `getIdentity().name` segítségével). BUG-S2 javítva (`getIdentity()` validálja a JSON shape-et, üres/hibás name/role esetén alapértékre esik vissza). Tesztek elkészültek: `tests/manual_test_checklist.md` (24 teszteset, 10 szekció, magyarul), `tests/smoke_test.js` (kb. 35 assert, böngésző konzolból futtatható). Dokumentáció elkészült: `docs/felhasznaloi_kezikonyv.md` (8 fejezet, ~450 sor, magyarul), `docs/admin_kezikonyv.md` (6 fejezet, ~380 sor, magyarul).

**Lezart hibak:**
- BUG-S1 (Medium): Sidebar footer dinamikus felhasználónév — JAVÍTVA
- BUG-S2 (Low): `getIdentity()` JSON shape validálás — JAVÍTVA

---

## Iteráció dependency chain (referencia)

- Iter 1 (P0, no deps) → **[DONE 2026-04-03]**
- Iter 2 (P0, needs Iter 1) → **[DONE 2026-04-03]**
- Iter 3 (P1, needs 1+2) → **[DONE 2026-04-03]**
- Iter 4 (P0, needs 1+2) → **[DONE 2026-04-03]**
- Iter 5 (P0, needs 2+4) → **[DONE 2026-04-03]**
- Iter 6 (P0, needs 2+3) → **[DONE 2026-04-03]**
- Iter 7 (P0, needs 6) → **[DONE 2026-04-03]**
- Iter 8 (P1, needs 1+2) → **[DONE 2026-04-03]**
- Iter 9 (P1, needs 6+7) → **[DONE 2026-04-03]**
- Iter 10 (P1, needs 1) → **[DONE 2026-04-03]**
- Iter 11 (P2, QA) → **[DONE 2026-04-05]**

## Haladás

- Teljesített iterációk: 11/11
- Készültség: 100%
- A projekt lezárult. Nincs aktív iteráció, nincs backlog.
