📋 **Response Section**

- Elkészítettem és bemásolom ide a kért, részletes **backlog.md** tartalmát a megadott források (PILOTE_Environment_minimal.md és PILOTE_PR_MS_SMALL.md) alapján.
- A munkafolyamat során korábban több fájlműveletet próbáltam végrehajtani: két korai eszköhívási kísérlet **hibával** végződött — a pontos hibák: **"Expected ',' or '}' after property value in JSON at position 42"** és **"Unterminated string in JSON at position 8519 (line 1 column 8520)"**. Ezeket a hibákat jelzem és figyelembe vettem a további lépések tervezésénél.
- Végül létrehoztam és bemutattam a részletes rendszertervet egy külön fájlban (`diszpecser_rendszer_terv.md`), amely tartalmazza az adattárolási sémát, frontend oldalakat, import/export logikát és MVP ütemezést.
- Az alábbiakban közlöm a **backlog.md** teljes tartalmát, amelyet Claude számára optimalizált backlogként készítettem: epicek, feature-ök, taskok, prioritások, becslések (napok), függőségek, felelősök, és rövid implementációs lépések.
- Korlát: a backlogot a megadott két dokumentumból készítettem; ha további belső szabályok, szervezeti erőforrások vagy pontos névegyezési szabályok rendelkezésre állnak, azok átvezetésével a backlog tovább finomítható.

Alább találod a backlog.md teljes tartalmát.

# backlog.md

## Projekt: Offline, böngésző alapú diszpécserrendszer (SQLite / sql.js)

### Rövid összefoglaló

A cél egy offline-first, szerver nélküli diszpécserrendszer elkészítése, amely böngészőben fut (file:// vagy lokális hosting nélkül), SQLite-adatmodellt használva sql.js-en keresztül, és támogatja a havi Excel-fájlok importját, napi tények rögzítését és a másnapi terv automatikus előállítását.

## Prioritált backlog (epic → feature → task) — magas szintű áttekintés

- Epic A (P0) — Alapadatok és perzisztencia

- Feature A1 — SQLite/sql.js integráció

- Task A1.1: sql.js betöltése és inicializálása az indexben (1 nap)
- Task A1.2: DB séma létrehozása (sofor, projekt, gep, napi_terv, napi_teny, valtozas_log) (1 nap)
- Task A1.3: Persistencia bevezetése IndexedDB-vel (mentés / betöltés) (1 nap)

- Feature A2 — CRUD wrapper (DB helper függvények)

- Task A2.1: alap CRUD függvények `sofor`, `projekt`, `gep` táblákhoz (2 nap)
- Task A2.2: tranzakciós műveletek és audit log (valtozas_log) (1 nap)

- Epic B (P0) — Import / Normalizálás (Excel)

- Feature B1 — SheetJS alapú import pipeline

- Task B1.1: Excel fájlok beolvasása és sheet-ek enumerálása (1 nap)
- Task B1.2: Sheet->JSON konverzió és lapnévből dátum kinyerése (1 nap)
- Task B1.3: Sorok normalizálása (unpivot, required mezők kitöltése) (1 nap)

- Feature B2 — Névegyeztetés (alias / fuzzy)

- Task B2.1: alias lista táblázat kezelése és egyeztető függvény (1 nap)
- Task B2.2: fuzzy matching implementálása (lowercase, diacritics strip, token compare) (2 nap)
- Task B2.3: import jóváhagyó UI — admin review képernyő (2 nap)

- Epic C (P0) — Napi tényrögzítés és tervezés

- Feature C1 — Napi tények rögzítése (napi_rogzites.html)

- Task C1.1: UI űrlap autocomplete mezőkkel (sofor/projekt/gep) (2 nap)
- Task C1.2: Validáció, duplikátum ellenőrzés, mentés napi_teny-be (1 nap)

- Feature C2 — Másnapi automatikus javaslat (napi_tervezes.html)

- Task C2.1: Tegnapi napi_teny lekérdezése + javaslat generálás (+1 day) (1 nap)
- Task C2.2: Javaslat felülbírálási UI (diszpécser módosíthatja) (1 nap)

- Epic D (P1) — Törzsadat kezelő oldalak és dashboard

- Feature D1 — Sofőrök kezelése (soforok.html)

- Task D1.1: lista, keresés, szerkesztés, alias kezelés (2 nap)

- Feature D2 — Projektek és gépek kezelése (projektek.html, gepek.html) (3 nap)
- Feature D3 — Dashboard és riportok (index.html) (2 nap)

- Epic E (P1) — Import/Export és mentések

- Feature E1 — Export CSV / XLSX (SheetJS) (1-2 nap)
- Feature E2 — .sqlite letöltés és visszatöltés (db export/import) (1 nap)
- Feature E3 — Automatikus backup (IndexedDB snapshot) (1 nap)

- Epic F (P2) — Minőségbiztosítás és dokumentáció

- Feature F1 — Tesztelés és QA (2-3 nap)
- Feature F2 — Felhasználói kézikönyv + admin guide (2 nap)

## MVP (minimálisan indítható scope) — P0 elemek

1. sql.js inicializáció és alap séma (Epic A) — 3 nap összesen
2. CRUD wrapper + sofor/projekt/gep törzsoldalak (Epic A + D1) — 3 nap
3. Napi tényrögzítő oldal autocomplete-tal (Epic C1) — 2 nap
4. Import: egyszerű Excel beolvasás + sheet->JSON + dátum kinyerése (Epic B1) — 2 nap
5. Másnapi javaslat generálása a tegnapi tények alapján (Epic C2) — 1 nap
6. Export CSV/XLSX és .sqlite mentés (Epic E) — 2 nap

Becsült MVP idő: 13 munkanap (egy fejlesztő mellett), tartalmaz alapvalidációt és alap UI-t. Tesztelés + bugfix + dokumentáció külön 3–5 nap.

## Technikai teendők és részletek (prioritás + becslés)

- sql.js integráció és init: 1 nap. Megjegyzés: töltődik WASM; gondoskodni kell `locateFile` beállításról CDN-re vagy lokális fájlra.
- IndexedDB persistencia wrapper: 1 nap. (db.export() → blob → IDB put; betöltéskor db = new SQL.Database(new Uint8Array(...))).
- SheetJS import pipeline: 2-3 nap (beolvasás, sheets enumerálás, JSON konverzió, dátum kinyerés).
- Névegyeztetés / alias kezelés / fuzzy match: 2-3 nap. Javasolt: először egyszerű szabályok (lowercase + strip diacritics), később fuzzy library.
- UI autocomplete + autocomplete cache: 1-2 nap per oldal.
- Export (.xlsx/.csv/.sqlite): 1-2 nap.
- Audit log (valtozas_log) minden create/update/delete műveletnél: 1 nap.
- Teszt és dokumentáció: 3-4 nap.

## Függőségek és kockázatok

- Függőség: sql.js WASM fájl hozzáférhetősége (CDN vagy helyi). Kockázat: file:// környezet esetén CORS/ WASM path problémák; javasolt használni `https://cdnjs.cloudflare.com` vagy beágyazni lokálisan ha offline telepítésre kerül sor.
- Függőség: SheetJS CDN elérése import/exporthoz. Offline munkához érdemes a könyvtárat lokálisan csomagolni a projektbe.
- Kockázat: névegységesítés pontatlansága → admin jóváhagyó lépés kötelező importnál.
- Kockázat: sql.js memóriahasználata nagy adat esetén → érdemes limitálni import méretet és batch feldolgozást alkalmazni.

## Felelősök / erőforrásjavaslat

- Fejlesztő (1): front+backend (JS) — felel az sql.js integrációért, import/exportért és CRUD logikáért. (teljes MVP: ~13 nap + teszt)
- UI/UX (0.5): egyszerű, gyors űrlapok és autocomplete UX — 3 nap össz.
- Tesztelő / admin (0.5): import jóváhagyás, elfogadás, QA — 3 nap.

(Javaslat: 1 full-stack fejlesztő + 1 részmunkaidős UX/QA a pilothoz.)

## Rövid implementációs lépések epic-enként (konkrét teendők)

1. A — Inicializáció és DB sémák

2. Hozz létre egy `db.js` modult, amely initSqlJs() után felépíti az alap sémát (CREATE TABLE IF NOT EXISTS ...). (1-2 nap)
3. Implementáld az `exportDB()` és `importDB()` függvényeket (blob -> letöltés / feltöltés). (1 nap)

4. B — Import pipeline

5. Implementáld az Excel beolvasását SheetJS-sel, sheet-ek enumerálását és egy `normalizeRow(row, sheetName)` függvényt, amely minden sorból a `datum` mezőt létrehozza. (2 nap)
6. Adat-ellenőrzés: required mezők, dátum parse logika. (1 nap)
7. Névegyeztetés: javaslatok listája, admin approval modal. (2 nap)

8. C — Napi rögzítés + tervezés

9. Napi rögzítő oldal: autocomplete mezők, mentés napi_teny-be. (2 nap)
10. Másnapi javaslat generálása: SQL INSERT ... SELECT DATE(... '+1 day') pattern. (1 nap)

11. D — Törzsadat oldalak & dashboard

12. Sofőr CRUD + alias szerkesztés. (2 nap)
13. Projektek / gépek CRUD. (2 nap)
14. Dashboard: gyorsszámok, filter. (2 nap)

15. E — Export / mentés

16. Export CSV/XLSX (SheetJS). (1 nap)
17. .sqlite mentés és visszatöltés. (1 nap)

## Acceptance criteria (MVP)

- A böngésző megnyitásakor a rendszer inicializálható és menthető IndexedDB-be.
- Tudok feltölteni egy havi Excel fájlt, amelyből a rendszer legalább a lapnévből kinyeri a dátumot és sorokat ír be „javasolt” napi_terv-be, admin jóváhagyó lépés nélkül is.
- Tudok manuálisan rögzíteni napi tényt (sofor + projekt + gép + időpontok) és a rekord a `napi_teny` táblába kerül.
- Tudok exportálni CSV/XLSX formátumban és letölteni a .sqlite fájlt.

## Javasolt rövid ütemterv (egy fejlesztő)

- Hét 1: A + A2 + egyszerű UI skeleton (6 munkanap)
- Hét 2: B1, B2 (import pipeline + alias matching) (6 munkanap)
- Hét 3: C1, C2

**Folytatás — Ütemterv, hátralévő feladatok és záró teendők**

- **Hét 3 (folytatás):** C1 (napi rögzítő oldal) és C2 (másnapi javaslat) befejezése, integráció a DB wrapperrel és alap exporttal — 4 munkanap. Ezzel párhuzamosan kezdődik D1 (sofőr CRUD + alias kezelés) — 1 munkanap.
- **Hét 4:** D1 teljes befejezése (ha szükséges tovább 1 nap), D2 projektek/gepek CRUD és D3 dashboard fejlesztése — összesen 4 munkanap. Ezen a héten E1 (CSV/XLSX export) és E2 (.sqlite export/import) implementálása és manuális tesztek — 2 munkanap.
- **Hét 5:** Tesztelés, QA, bugfixing — 3 munkanap; dokumentáció (felhasználói útmutató, admin guide) — 2 munkanap; végső átvételi ellenőrzések és release packaging (.zip a HTML/JS/CSS + offline libs) — 1 nap.

Összesített becslés MVP + teszt/dokumentáció: **~18–20 munkanap** (egy full-stack fejlesztő + részmunkaidős UX/QA szerep mellett).

Feladatlista hátralévő prioritással (rövid)

1. **Kritikus / P0**

- sql.js persistencia + IndexedDB (autosave/restore)
- Import pipeline: SheetJS → sheet->rows → datum kinyerés
- Napi tényrögzítés UI + mentés napi_teny-be
- Névegyeztetés alap (alias táblázat + lowercase/strip diacritics)

- **Magas / P1**

- CRUD törzsadatok (sofor/projekt/gep)
- Másnapi javaslat logika (INSERT ... SELECT + UI szerkesztés)
- Export CSV/XLSX és .sqlite letöltés

- **Közepes / P2**

- Audit log minden CRUD műveletre
- Admin import jóváhagyás UI
- Dashboard és riportok

- **Alacsony / P3**

- Performance tuning nagy importokhoz (batch)
- Haladó fuzzy matching vagy 3rd-party fuzzy lib integráció
- PWA / offline sync későbbi verzióhoz

Elfogadási feltételek (összegzés)

- A rendszer offline működik böngészőben; adat menthető és visszatölthető (.sqlite és IndexedDB).
- Excel import legalább a lapnévből kinyeri a dátumot, és sorokat ír `napi_terv`-be vagy `napi_teny`-be.
- Sofőrök/Projektek/Gépek CRUD működik, autocompletion elérhető a rögzítő űrlapokon.
- Másnapi javaslat automatikusan legenerálható és szerkeszthető.
- Export CSV/XLSX és .sqlite működőképes.

Kockázatok és mitigáció

- _WASM/CORS/file:// problémák:_ offline telepítéshez a sql.js WASM fájlt csomagoljuk a projektbe; teszteljünk file:// környezetben.
- _Név-egyezés hibák:_ kötelező admin review az első importfuttatásnál; aliasok karbantartása.
- _Nagy fájlok memóriaigénye:_ batch feldolgozás és import-limit bevezetése, vagy felhasználói figyelmeztetés nagy fájl esetén.

Rövid technikai checklist fejlesztéshez (gyors referencia)

- db.js: initSqlJs, createSchema(), exportDB(), importDB(), autosaveToIndexedDB(), loadFromIndexedDB()
- import.js: readExcel(file) → sheets[] → normalizeRow(row,sheetName) → matchSofor(row) → insert napi_terv/napi_teny
- ui.js: autocompleteSource(sofor/projekt/gep), validateRow(), showImportReviewModal()
- export.js: exportCSV(), exportXLSX(), downloadSQLite()
- audit.js: logChange(tabla, rekord_id, muvelet, felhasznalo, leiras)

Következő javasolt lépések (ajánlat)

1. Engedélyed után elkészítem az **index.html + db.js** minimális, működő mintát (sql.js init + `sofor` CRUD demo).
2. Ha a minta jó, folytatom az **import pipeline** és a **napi_rogzites.html** oldalak implementálásával.

Szeretnéd, hogy most rögtön létrehozzam az index.html + db.js mintát? Ha igen, írd meg, hogy van-e preferencia a csomagolt könyvtárak (sql.js, SheetJS) helyi beágyazására vagy CDN használatára az első prototípushoz.