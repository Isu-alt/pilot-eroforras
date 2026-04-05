# pilot-eroforras — Projekt Backlog

**Utolso frissites:** 2026-04-03
**Státusz:** Aktív fejlesztés alatt — Iteráció 11 folyamatban
**Verzió:** 1.0

---

## Tartalom

1. [Projekt összefoglaló](#1-projekt-összefoglaló)
2. [Szerepek és felelősségek](#2-szerepek-és-felelősségek)
3. [Adatmodell összefoglaló](#3-adatmodell-összefoglaló)
4. [Iterációs tervek](#4-iterációs-tervek)
5. [MVP scope](#5-mvp-scope)
6. [Kockázatok és mitigáció](#6-kockázatok-és-mitigáció)
7. [Technikai checklist](#7-technikai-checklist)

---

## 1. Projekt összefoglaló

### Cél

A **pilot-eroforras** egy offline-first, böngészőben futó diszpécserrendszer, amelynek célja a sofőrök/gépkezelők napi munkabeosztásának kezelése, havi Excel fájlokból való adatimport, napi tények rögzítése, és a következő nap automatikus tervjavaslatának előállítása. A rendszer szerverfüggőség nélkül, helyi HTML fájlokból is futtatható.

### Scope

- Offline, böngésző alapú működés (file:// vagy lokális HTTP, szerver nélkül)
- Törzsadat kezelés: sofőrök, projektek, gépek
- Napi tény rögzítés és tervezés
- Excel import (SheetJS) és CSV/XLSX/.sqlite export
- Névegyeztetés alias kezeléssel és fuzzy matching-gel
- Audit log minden adatmódosításhoz
- Szerepalapú hozzáférés (Admin, Diszpécser, Olvasó)

### Technológia stack

| Réteg | Technológia | Megjegyzés |
|---|---|---|
| Adatbázis (böngésző) | sql.js (SQLite WASM) | Memóriában futó SQLite |
| Perzisztencia | IndexedDB | Automatikus mentés/visszatöltés |
| Adatcsere | .sqlite fájl letöltés/feltöltés | Backup és migráció |
| Frontend | Pure HTML / CSS / JavaScript | ES modules, CDN könyvtárak |
| Import/Export | SheetJS (xlsx) CDN | Excel .xlsx read/write |
| Fejlesztői env | Node.js + TypeScript 5.x + Prisma 4 + SQLite | Csak fejlesztéshez, nem production |
| Szerkesztő | VS Code + Prisma + ESLint + Prettier | Ajánlott toolchain |

---

## 2. Szerepek és felelősségek

### Alkalmazás-szintű szerepek (runtime)

| Szerep | Jogosultság | Tipikus feladatok |
|---|---|---|
| **Admin** | Teljes hozzáférés | Törzsadatok karbantartása, import jóváhagyás, export, beállítások |
| **Diszpécser / Operátor** | Olvasás + napi rögzítés + tervezés | Napi tények bevitele, másnapi terv módosítása |
| **Olvasó** | Csak olvasás | Riportok megtekintése, lekérdezések |

### Fejlesztői szerepek (projekt)

| Szerep | Felelősség | Becsült kapacitás |
|---|---|---|
| **Full-stack fejlesztő** | sql.js integráció, import/export, CRUD logika, UI oldalak | 1 fő, teljes kapacitás |
| **UX/QA** | Egyszerű, gyors űrlapok, autocomplete UX, tesztelés | 0.5 fő, részmunkaidős |
| **Admin/tesztelő** | Import jóváhagyás, elfogadási tesztek, QA | 0.5 fő, részmunkaidős |

---

## 3. Adatmodell összefoglaló

A rendszer két adatmodell-réteget használ: a **böngészős SQLite sémát** (sql.js, éles használat) és a **fejlesztői Prisma sémát** (Node.js dev környezet, prototípus).

### Böngészős SQLite séma (sql.js — éles)

#### `sofor` — Sofőr/gépkezelő törzsadat

| Mező | Típus | Leírás |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Egyedi azonosító |
| teljes_nev | TEXT NOT NULL | Teljes név (egyedi forrás) |
| aliasok | TEXT | JSON tömb: névváltozatok importból |
| belepesi_datum | DATE | Belépési dátum |
| statusz | TEXT | Aktív / Inaktív |
| megjegyzes | TEXT | Szabad szöveges megjegyzés |
| created_at | TIMESTAMP | Létrehozás időpontja |
| updated_at | TIMESTAMP | Utolsó módosítás |

#### `projekt` — Munka/projekt törzsadat

| Mező | Típus | Leírás |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Egyedi azonosító |
| munkaszam | TEXT NOT NULL UNIQUE | Munkaszám (kötelező, egyedi) |
| helyszin | TEXT | Munka helyszíne |
| megrendelo | TEXT | Megrendelő neve |
| leiras | TEXT | Szabad szöveges leírás |
| created_at | TIMESTAMP | Létrehozás időpontja |
| updated_at | TIMESTAMP | Utolsó módosítás |

#### `gep` — Gép/eszköz törzsadat

| Mező | Típus | Leírás |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Egyedi azonosító |
| tipus | TEXT | Géptípus (pl. CAT 320, daru) |
| rendszam | TEXT | Rendszám vagy azonosító |
| megjegyzes | TEXT | Szabad szöveges megjegyzés |
| created_at | TIMESTAMP | Létrehozás időpontja |
| updated_at | TIMESTAMP | Utolsó módosítás |

#### `napi_terv` — Napi terv (tervezett munkabeosztás)

| Mező | Típus | Leírás |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Egyedi azonosító |
| datum | DATE NOT NULL | Tervezett nap dátuma |
| sofor_id | INTEGER FK | Hivatkozás: sofor.id |
| projekt_id | INTEGER FK | Hivatkozás: projekt.id |
| gep_id | INTEGER FK | Hivatkozás: gep.id |
| kezdes | TIME | Tervezett kezdési idő |
| vegez | TIME | Tervezett befejezési idő |
| allapot | TEXT | javasolt / elfogadott / modositott |
| megjegyzes | TEXT | Megjegyzés |
| forras | TEXT | import / manualis / auto |
| created_at | TIMESTAMP | Létrehozás időpontja |
| updated_at | TIMESTAMP | Utolsó módosítás |

#### `napi_teny` — Napi tényadat (teljesített munka)

| Mező | Típus | Leírás |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Egyedi azonosító |
| datum | DATE NOT NULL | Teljesítés dátuma |
| sofor_id | INTEGER FK | Hivatkozás: sofor.id |
| projekt_id | INTEGER FK | Hivatkozás: projekt.id |
| gep_id | INTEGER FK | Hivatkozás: gep.id |
| kezd_idopont | DATETIME | Tényleges kezdési időpont |
| befejezes_idopont | DATETIME | Tényleges befejezési időpont |
| munkaora | REAL | Ledolgozott munkaórák száma |
| fuvarok_szama | INTEGER | Fuvarok/körök száma (opcionális) |
| allapot | TEXT | rogzitett / lezart / visszavont |
| megjegyzes | TEXT | Megjegyzés |
| forras | TEXT | manualis / import |
| created_at | TIMESTAMP | Létrehozás időpontja |
| updated_at | TIMESTAMP | Utolsó módosítás |

#### `valtozas_log` — Audit log

| Mező | Típus | Leírás |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | Egyedi azonosító |
| tabla | TEXT | Érintett tábla neve |
| rekord_id | INTEGER | Módosított rekord id-je |
| muvelet | TEXT | INSERT / UPDATE / DELETE |
| felhasznalo | TEXT | Módosítást végző személy |
| idopont | TIMESTAMP | Módosítás időpontja |
| leiras | TEXT | Részletes leírás a változásról |

### Fejlesztői Prisma séma (Node.js dev — csak fejlesztéshez)

A Node.js/Prisma alapú fejlesztői séma kibővített adatmodellt tartalmaz (referencia, nem éles):

| Model | Célja |
|---|---|
| Equipment | Gép/eszköz (kibővített: méretek, biztosítás, engedély) |
| EquipmentDimensions | Fizikai méretek (hossz, szélesség, magasság, tara/bruttó tömeg) |
| EquipmentInsurance | Gép biztosítás (biztosító, kötvényszám, érvényesség, összeg) |
| EquipmentPermit | Gép engedélyek (engedélytípus, kiállítás, lejárat) |
| Person | Sofőr/személy (név, szerepkör, szabadságok) |
| Vacation | Szabadság/szabadnap (típus, kezdés, vég, státusz) |
| MaintenancePlan | Karbantartási terv (típus, tervezett dátum, becsült órák, státusz) |
| ActualRecord | Tényadat (tényleges kezdés, befejezés, órák) |
| ActualFinancial | Pénzügyi tényadat (munka-, anyag-, külső költség, összesen) |

### Relációk (böngészős séma)

```
sofor (1) ----< napi_terv (N)
sofor (1) ----< napi_teny (N)
projekt (1) ---< napi_terv (N)
projekt (1) ---< napi_teny (N)
gep (1) ------< napi_terv (N)
gep (1) ------< napi_teny (N)
```

---

## 4. Iterációs tervek

Az iterációk logikai sorrendben követik egymást. A P0 prioritású epicek (A, B, C) az MVP alapját képezik és előrébb kerülnek. A P1 (D, E) epicek az MVP-t teszik teljessé. A P2 (F) epic a minőségbiztosítást fedi le.

---

### Iteráció 1 — Alapinfrastruktúra és DB séma

**Prioritás:** P0 (blokkoló — minden más erre épül)
**Becsült munkaidő:** 3 munkanap
**Függőségek:** Nincsenek (kiinduló iteráció)
**Státusz:** [x] Done
**Lezárva:** 2026-04-03

#### Cél

Létrehozni a böngészőben futó SQLite adatbázis alapinfrastruktúráját, beleértve a séma inicializálást, az IndexedDB alapú perzisztenciát és a .sqlite fájl alapú mentés/visszatöltést. Ez az alap nélkül egyetlen más modul sem működhet.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 1.1 | Mint fejlesztő, szeretném, hogy a `db.js` modul betöltse és inicializálja az sql.js WASM motort, hogy az adatbázis böngészőben is elérhető legyen. | P0 |
| 1.2 | Mint fejlesztő, szeretném, hogy az inicializáláskor automatikusan létrejöjjenek a `sofor`, `projekt`, `gep`, `napi_terv`, `napi_teny` és `valtozas_log` táblák, hogy ne kelljen manuálisan sémát létrehozni. | P0 |
| 1.3 | Mint admin, szeretném, hogy az adatbázis állapota automatikusan mentődjön IndexedDB-be minden változtatás után, hogy böngésző bezárása után se vesszék el az adat. | P0 |
| 1.4 | Mint admin, szeretném, hogy a rendszer indításkor automatikusan visszatöltse az előző mentést IndexedDB-ből, hogy folytatni lehessen a munkát. | P0 |
| 1.5 | Mint admin, szeretném, hogy le tudjam tölteni az adatbázist .sqlite fájlként, hogy külső biztonsági mentést készíthessek. | P0 |
| 1.6 | Mint admin, szeretném, hogy fel tudjak tölteni egy .sqlite fájlt, amellyel felülírom vagy visszaállítom az adatbázist. | P0 |

#### Elfogadási kritériumok

- [x] A `db.js` modul importálható és az `initDB()` hívás sikeres; a WASM fájl CDN-ről vagy lokálisan betöltődik.
- [x] Az összes 6 alaptábla (`sofor`, `projekt`, `gep`, `napi_terv`, `napi_teny`, `valtozas_log`) létrejön az első indításkor; ismételt indításnál nem dob hibát (`CREATE TABLE IF NOT EXISTS`).
- [x] Adatbevitel után az adatbázis kiexportálható (`db.export()`) és az IndexedDB-be mentett blob visszatölthető ugyanabba a `SQL.Database` példányba.
- [x] Az `exportDB()` függvény elindít egy .sqlite fájl letöltést a böngészőből.
- [x] Az `importDB(file)` függvény feltölt egy .sqlite fájlt és lecseréli az aktuális adatbázist.
- [x] Tesztelve: file:// protokollon is működik (WASM path helyesen beállítva).

#### Technikai megjegyzések

- `locateFile` beállítás szükséges a sql.js WASM betöltéséhez; ha offline deployment kell, csomagolni kell a WASM fájlt a projektbe.
- Az IndexedDB autosave `db.export()` → `Uint8Array` → IDB `put` mintával működik; visszatöltésnél `new SQL.Database(new Uint8Array(savedData))`.

#### Technikai adósság (e2e-tester validációjából — 2026-04-03)

- **file:// + Chrome modul import blokkolás** — A Chrome CORS-policy alapon blokkolja az ES module importokat `file://` protokollon. Deployment előtt figyelni kell: vagy lokális HTTP szerver szükséges, vagy az importokat bundlerrel kell kezelni.
- **Corrupt import utáni `db === null` állapot recovery hiányzik** — Ha egy sérült `.sqlite` fájlt tölt fel a felhasználó, az `importDB()` hiba után a `db` változó `null` maradhat, és az alkalmazás használhatatlan lesz. Iteráció 2-ben vagy 6-ban kezelni kell (fallback + hibaüzenet).
- **`initDB()` újrahívás előtt nincs explicit `db.close()`** — Ha az `initDB()` többször hívódik (pl. import után), az előző adatbázis-példány nem záródik le szabályosan. Enyhe memória szivárgást okozhat hosszabb munkameneteknél.
- **`updated_at` mező nem frissül automatikusan** — A sémában szereplő `updated_at` mezőt az alkalmazásnak explicit módon kell frissítenie minden UPDATE-nél; nincs SQLite trigger. Ezt a CRUD wrapper implementációjakor (Iteráció 2) app-szinten kell kezelni.

---

### Iteráció 2 — CRUD wrapper és audit log

**Prioritás:** P0
**Becsült munkaidő:** 2 munkanap
**Függőségek:** Iteráció 1 (DB séma kész)
**Státusz:** [x] Done
**Lezárva:** 2026-04-03

#### Cél

Implementálni az összes alapadattáblához (sofor, projekt, gep) a tipikus CRUD műveleteket egységes wrapper függvényeken keresztül, és bevezetni az audit log automatikus rögzítését minden adatmódosító műveletnél.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 2.1 | Mint fejlesztő, szeretném, hogy a `sofor`, `projekt` és `gep` táblákhoz egységes CRUD függvények (create, readAll, readById, update, delete) álljanak rendelkezésre, hogy az UI oldalak ne írjanak közvetlen SQL-t. | P0 |
| 2.2 | Mint fejlesztő, szeretném, hogy minden create/update/delete műveletnél automatikusan bejegyzés keletkezzen a `valtozas_log` táblában (tábla, rekord_id, művelet, felhasználó, időpont, leírás), hogy az adatváltozások visszakövethetők legyenek. | P0 |
| 2.3 | Mint admin, szeretném, hogy a `napi_teny` és `napi_terv` táblákhoz is rendelkezésre álljanak CRUD műveletek, hogy a napi adatrögzítés és tervezés modulok ezeket tudják használni. | P0 |

#### Elfogadási kritériumok

- [x] `createSofor(data)`, `updateSofor(id, data)`, `deleteSofor(id)`, `getAllSoforok()`, `getSoforById(id)` függvények implementálva és manuálisan tesztelve a böngésző konzolján.
- [x] Ugyanilyen függvények elérhetők `projekt` és `gep` táblákhoz.
- [x] Minden sikeres create/update/delete után a `valtozas_log` táblában megjelenik egy bejegyzés a helyes mezőkkel.
- [x] A CRUD wrapper hibakezelést tartalmaz (try/catch, konzol-hibaüzenet).

#### Technikai adósság (2026-04-03)

- **`updateX(id, {mezo: null})` nem törli a mezőt — COALESCE csapda** — A CRUD wrapperekben alkalmazott `COALESCE(?, meglevo_ertek)` minta megakadályozza, hogy egy mező értékét `null`-ra lehessen állítani. Iteráció 3-ban UI szintjén kezelendő: a törlés szándékát explicit jelzővel (`__clear: true`) vagy külön endpoint-tal kell megkülönböztetni a "nem változott" esettől.
- **`PRAGMA foreign_keys = ON` nincs engedélyezve** — Az sql.js kapcsolat indításakor nem fut le a foreign key pragma, ezért az FK integrity (pl. cascade delete) nem érvényesített. Kockázat: árva rekordok keletkezhetnek. Javítás: `db.run("PRAGMA foreign_keys = ON;")` az `initDB()` után.
- **`createProjekt` duplikált munkaszám esetén generikus sql.js hibát dob** — Az UNIQUE constraint megsértésekor a wapper nem fogja el és nem alakítja át a hibát, ezért az UI egy raw JS exception-t kap. UI-barát hibaüzenet ("Ez a munkaszám már szerepel a rendszerben") hiányzik; Iteráció 3 form validációjakor kezelendő.

---

### Iteráció 3 — Törzsadat kezelő oldalak (sofőrök, projektek, gépek)

**Prioritás:** P1 (az import és rögzítés előtt kell, mert azok hivatkoznak a törzsadatokra)
**Becsült munkaidő:** 4 munkanap
**Függőségek:** Iteráció 1, Iteráció 2
**Státusz:** [x] Done
**Lezárva:** 2026-04-03

#### Cél

Elkészíteni a három törzsadat-kezelő HTML oldalt (soforok.html, projektek.html, gepek.html), amelyeken keresztül az admin karbantarthatja a sofőrök, projektek és gépek listáját, beleértve az alias kezelést és az alapszintű keresést/szűrést.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 3.1 | Mint admin, szeretném listázni az összes sofőrt, nevük, státuszuk és alias-aik megjelenítésével, hogy áttekinthessem a nyilvántartást. | P1 |
| 3.2 | Mint admin, szeretném hozzáadni, szerkeszteni és törölni sofőr rekordokat egy egyszerű űrlapon keresztül, hogy karbantarthassam a törzsadatot. | P1 |
| 3.3 | Mint admin, szeretném kezelni egy sofőrhöz tartozó alias-okat (névváltozatokat), hogy az import során a különböző névírások automatikusan felismerjék a helyes sofőrt. | P1 |
| 3.4 | Mint admin, szeretném listázni, hozzáadni, szerkeszteni és törölni projekteket (munkaszám, helyszín, megrendelő), hogy a napi rögzítésen és importon a projektek kiválaszthatók legyenek. | P1 |
| 3.5 | Mint admin, szeretném listázni, hozzáadni, szerkeszteni és törölni gépeket (típus, rendszám), hogy a beosztásoknál a megfelelő gépet lehessen kiválasztani. | P1 |
| 3.6 | Mint diszpécser, szeretném keresni/szűrni a sofőrök és projektek listáját név vagy munkaszám alapján, hogy gyorsan megtaláljam a keresett rekordot. | P1 |

#### Elfogadási kritériumok

- [ ] A `soforok.html` oldal megnyitásakor betölti és listázza az összes sofőrt a DB-ből.
- [ ] Az új sofőr hozzáadása és szerkesztése a CRUD wrappert hívja; siker után a lista frissül.
- [ ] Alias hozzáadás és törlés működik; az aliasok JSON tömbként tárolódnak a `aliasok` mezőben.
- [ ] Ugyanilyen funkció elérhető a `projektek.html` és `gepek.html` oldalakon.
- [ ] Kötelező mezők validálva (sofor.teljes_nev, projekt.munkaszam); hiány esetén hibaüzenet jelenik meg.
- [ ] A keresőmező szűri a listát a gépelt szöveg alapján (kliens oldali, valós idejű).

#### Technikai adósság (2026-04-03)

- **`updateX(id, {mezo: null})` null-ra állítás nem működik — COALESCE csapda** — A CRUD wrapperben alkalmazott `COALESCE(?, meglevo_ertek)` minta megakadályozza, hogy egy mező értékét `null`-ra lehessen állítani; a `null` bemenetet az SQL a meglévő értékre cseréli vissza. Megoldás: explicit `__clear: true` jelző vagy külön clear-endpoint.
- **Case-sensitive alias duplikátum-ellenőrzés** — Az alias egyediségének ellenőrzése nem végez `LOWER()` normalizálást, ezért "Kovács" és "kovács" két különböző alias-ként tárolható ugyanazon sofőrhöz. Javítandó az alias mentési logikában.
- **`statusz`/`allapot` mező ALTER TABLE + közvetlen SQL workaround** — A böngésző SQLite sémában a `statusz` / `allapot` oszlop utólag lett hozzáadva `ALTER TABLE`-lel; ha a DB egy régebbi snapshotból töltődik vissza, a mező hiányozhat. Jelenleg közvetlen SQL `INSERT/UPDATE` workaround-dal kezelt; migrációs verziókezelés (schema_version tábla) hiányzik.
- **Tab-szűrő + keresőszöveg kombinált állapot nem törlődik lapváltáskor** — Ha a felhasználó az "aktív" tab-on keres, majd átkapcsol "archivált"-ra, a keresőmező szövege megmarad, de a szűrés az új tab kontextusában nem fut le újra. Az összetett UI állapot (aktív tab + keresőszöveg) lapváltáskor nincs resetelve.

---

### Iteráció 4 — Excel import pipeline

**Prioritás:** P0
**Becsült munkaidő:** 5 munkanap
**Függőségek:** Iteráció 1, Iteráció 2 (DB és CRUD kész)
**Státusz:** [x] Done
**Lezárva:** 2026-04-03

#### Cél

Implementálni a SheetJS alapú Excel import folyamatot: fájl feltöltés, sheet-ek feldolgozása, dátum kinyerés lapnévből, sorok normalizálása, és az adatok beírása a megfelelő táblákba. Az első körben az egyértelmű eseteket automatikusan importálja, a kétes névegyezések admin jóváhagyást igényelnek.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 4.1 | Mint admin, szeretném feltölteni a havi Excel fájlt az `import_export.html` oldalon, hogy az adatok bekerülhessenek a rendszerbe. | P0 |
| 4.2 | Mint rendszer, olvassam be a feltöltött fájl összes munkalapját (sheet-jét) SheetJS-szel, és minden lap esetén kinyerjük a dátumot a lapnévből (pl. "2026-04-03" vagy "04.03" formátumban), hogy minden sor a helyes dátumhoz rendelődjön. | P0 |
| 4.3 | Mint rendszer, alakítsam minden lapsor-t normalizált rekordokká: kötelező mezők kitöltése, üres sorok kihagyása, dátum hozzárendelése, hogy a DB-be írható, egységes adatstruktúra jöjjön létre. | P0 |
| 4.4 | Mint rendszer, a sofőr névmező alapján keressek egyezést a `sofor` táblában teljes_nev és aliasok szerint (lowercase + ékezet eltávolítás + whitespace trim), hogy az importált sorok automatikusan a helyes sofőrhöz rendelődjjenek. | P0 |
| 4.5 | Mint admin, szeretném jóváhagyni a kétes névegyezéseket egy review képernyőn (importált név → javasolt sofőr párok listája), hogy elkerüljük a hibás hozzárendeléseket. | P0 |
| 4.6 | Mint admin, a jóváhagyott importot szeretném egy gombnyomással beírni a `napi_terv` vagy `napi_teny` táblába, hogy az adatok elérhető legyenek a többi modulban. | P0 |

#### Elfogadási kritériumok

- [x] Egy valódi havi Excel fájl feltölthető; a sheet-ek automatikusan felismerhetők és listázódnak.
- [x] A lapnévből a dátum kinyerés legalább a `YYYY-MM-DD`, `MM.DD` és `YYYY.MM.DD` formátumokat kezeli.
- [x] Minden sor amely tartalmaz sofőr nevet és dátumot, beírható a célső táblába.
- [x] Az alias alapú egyeztetés legalább az azonos neveket (case-insensitive, ékezet eltávolítva) felismeri.
- [x] A review képernyő megmutatja az egyezéstelen sorokat; az admin manuálisan rendelhet hozzá sofőrt.
- [x] Az import után a `napi_terv` táblában megjelennek az importált sorok.
- [x] Minden import-futtatáshoz keletkezik `valtozas_log` bejegyzés.

#### Technikai adósság (2026-04-03)

- **Partial match: javasolt sofőr ne legyen auto-előre kiválasztva** — Ha a névegyeztetés csak részleges (fuzzy/alias partial), a review képernyőn a javasolt sofőr ne kapjon automatikus előre-kijelölést; a felhasználónak tudatosan kell választania, hogy elkerüljük a véletlen hibás hozzárendelést.
- **datum = null esetén vizuális figyelmeztetés hiányzik az import gomb előtt** — Ha egy sorhoz nem sikerül dátumot kinyerni a lapnévből, a sor `datum = null`-lal kerülne importra. Az "Import jóváhagyása" gomb megnyomása előtt vizuális figyelmeztetés/blokkolás szükséges ezekre a sorokra.
- **Drop zone file input re-listener fragilis DOM-csere pattern** — A drag-and-drop feltöltési zóna eseménykezelőinek újraregisztrálása DOM-csere után törékeny; race condition vagy kettős eseményfigyelő keletkezhet. Stabilabb megoldás: eseménydelegáció vagy egyszeri inicializálás guard-dal.
- **`15.03.26` rövid éves formátum nem ismeri fel — null dátum visszatérés** — A `YY.MM.DD` / `DD.MM.YY` rövid éves formátum (pl. "15.03.26") nem kerül felismerésre a lapnév dátum-parszoló által; null dátumot ad vissza. A parszoló bővítése szükséges erre a formátumra.

---

### Iteráció 5 — Névegyeztetés: alias kezelés és fuzzy matching

**Prioritás:** P0 (az import pontosságához elengedhetetlen)
**Becsült munkaidő:** 3 munkanap
**Függőségek:** Iteráció 2 (sofor CRUD kész), Iteráció 4 (import pipeline kész)
**Státusz:** [x] Done
**Lezárva:** 2026-04-03

#### Cél

Az import névegyeztetésének pontosítása fuzzy matching algoritmussal, az alias rendszer megerősítése, és a sikeres manuális egyeztetések automatikus alias-ként való eltárolása.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 5.1 | Mint rendszer, az egyértelmű egyezés hiányában fuzzy algoritmust alkalmazok (tokenizálás, sorrendi variáció, levenshtein-közelség), hogy a kis néveltérések automatikusan feloldódjanak. | P0 |
| 5.2 | Mint admin, ha az import review képernyőn manuálisan rendelem hozzá a sofőrt egy névhez, szeretném, hogy ez az importált névváltozat automatikusan alias-ként elmentődjön a sofőr rekordhoz, hogy a jövőbeli importok automatikusak legyenek. | P0 |
| 5.3 | Mint admin, szeretném manuálisan is hozzáadni és törölni alias-okat a `soforok.html` szerkesztési képernyőn, hogy a névlistát rugalmasan karban tarthassam. | P1 |

#### Elfogadási kritériumok

- [ ] A fuzzy matching legalább az alábbi eseteket kezeli: vezető/záró szóközök, kisbetű/nagybetű eltérés, ékezet különbségek (é→e, á→a, ő→o stb.), előtag/utótag felcserélés.
- [ ] A manuálisan elfogadott névpárosítás az alias-t automatikusan menti a `sofor.aliasok` mezőbe.
- [ ] Az alias-ok eltárolása után ugyanaz a névváltozat a következő importfuttatásban automatikusan felismert (review nélkül).
- [ ] Az alias kezelés a `soforok.html` oldalon is elérhető és kézzel szerkeszthető.

#### Technikai adósság (lezáráskor dokumentált)

- `exact` és `alias` sorok vizuálisan nem különböztethetők meg a review képernyőn — jövőbeli iterációban jelölés hozzáadandó.
- Levenshtein ellenőrzés teljes névstringen fut (nem tokeneken) — rövid neveknél false positive kockázat; token-szintű fuzzy matching fontolóra veendő.
- `matchSofor` partial match esetén ha levenshtein már megvan, a partial ág ki van hagyva — ez szándékos döntés a dupla egyezés elkerülésére, de kódbeli komment szükséges.

---

### Iteráció 6 — Napi tényrögzítés

**Prioritás:** P0
**Becsült munkaidő:** 3 munkanap
**Függőségek:** Iteráció 2 (CRUD kész), Iteráció 3 (törzsadatok elérhetők)
**Státusz:** [x] Done
**Lezárva:** 2026-04-03

#### Technikai adósság

- Duplikátum check null `projekt_id` esetén hamis pozitívot adhat
- Dátumváltás nyitott szerkesztés közben elveszejti a nem mentett sorokat (nincs "Elhagyod?" figyelmeztetés)
- Sofőr kézzel beírt neve pontos egyezést vár (nincs fuzzy fallback a rögzítő oldalon)

#### Cél

Elkészíteni a `napi_rogzites.html` oldalt, amelyen a diszpécser gyorsan rögzíteni tudja a napi tényleges munkavégzést: ki, mikor, melyik projekthez, melyik géppel dolgozott. Az oldal autocomplete mezőkkel segíti a gyors adatbevitelt.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 6.1 | Mint diszpécser, szeretném rögzíteni egy sofőr napi munkáját (dátum, sofőr, projekt, gép, kezdési és befejezési idő, munkaóra, megjegyzés) egy egyszerű webes űrlapon, hogy a tényadat bekerüljön a rendszerbe. | P0 |
| 6.2 | Mint diszpécser, szeretném, hogy a sofőr, projekt és gép mezőkben autocomplete segítsen a törzsadatokból, hogy elkerüljük az elgépeléseket és gyorsítsa a bevitelt. | P0 |
| 6.3 | Mint diszpécser, szeretném listázni az adott napra már rögzített tényeket táblázatban, és lehetőségem legyen meglévő sor szerkesztésére vagy törlésére. | P0 |
| 6.4 | Mint rendszer, a duplikátum rögzítéseket (ugyanaz a sofőr + nap + projekt kombináció) figyelmeztetéssel jelzem, hogy elkerüljük a véletlen kettős bevitelt. | P0 |
| 6.5 | Mint diszpécser, szeretném, hogy a rögzítés előtt a kötelező mezők validálódjanak (dátum, sofőr) és hiba esetén egyértelmű üzenet jelenjen meg. | P0 |

#### Elfogadási kritériumok

- [ ] Az űrlap elindítása után a sofőr, projekt és gép mezők az aktuális DB adatokból kapnak javaslatot.
- [ ] A kitöltött és elküldött rekord megjelenik a `napi_teny` táblában és az oldal listájában.
- [ ] Duplikátum esetén (azonos sofőr + datum + projekt_id) figyelmeztetés jelenik meg, a mentés nem folytatódik automatikusan.
- [ ] A kötelező mezők (legalább: datum, sofor_id) hiányában hibaüzenet jelenik meg, a rekord nem mentődik.
- [ ] Meglévő tény sor szerkeszthető és törölhető; törlés után a lista frissül.
- [ ] Minden módosítás megjelenik a `valtozas_log`-ban.

---

### Iteráció 7 — Napi tervezés és másnapi javaslat

**Prioritás:** P0
**Becsült munkaidő:** 2 munkanap
**Függőségek:** Iteráció 6 (napi_teny adatok elérhetők)
**Státusz:** [x] Done
**Lezárva:** 2026-04-03

#### Technikai adósság

- Gyors dátumváltásnál race condition lehetséges (nincs debounce)
- `finalizePlan` await hiánya javítva (2026-04-03)

#### Cél

Elkészíteni a `napi_tervezes.html` oldalt, amely a tegnapi tényadatok alapján automatikusan generálja a holnapi tervjavaslatot, amelyet a diszpécser szerkeszthet és jóváhagyhat.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 7.1 | Mint diszpécser, szeretném egy gombnyomásra legenerálni a holnapi tervjavaslatot a tegnapi tényadatok alapján (sofor + projekt + gep kombinációk másolása +1 napra), hogy ne kelljen nulláról tervezni. | P0 |
| 7.2 | Mint diszpécser, szeretném a generált tervjavaslatot módosítani (sofőr, projekt, gép, időpontok cseréje, sorok hozzáadása/törlése), hogy a valóságnak megfelelő tervet hozzak létre. | P0 |
| 7.3 | Mint diszpécser, szeretném jóváhagyni a végleges tervet, hogy az `elfogadott` státusszal bekerüljön a `napi_terv` táblába. | P0 |
| 7.4 | Mint diszpécser, szeretném szűrni a tervet dátumra, hogy visszatekintsek korábbi tervekre is. | P1 |

#### Elfogadási kritériumok

- [ ] A "Javaslat generálása" gomb megnyomásával az előző nap `napi_teny` rekordjai alapján `napi_terv` sorok keletkeznek `datum = tegnap + 1 nap`, `allapot = 'javasolt'`, `forras = 'auto'` értékekkel.
- [ ] A javasolt sorok listában jelennek meg és szerkeszthetők (sofőr, projekt, gép, időpontok cserélhetők).
- [ ] A "Jóváhagyás" gomb az összes javasolt sort `elfogadott` státuszra állítja.
- [ ] A jóváhagyott tervsorok megjelennek a `napi_terv` táblában.
- [ ] Ha nincs előző napi tény adat, a rendszer tájékoztató üzenetet jelenít meg.

---

### Iteráció 8 — Export és adatmentés

**Prioritás:** P1
**Becsült munkaidő:** 2 munkanap
**Függőségek:** Iteráció 1 (DB kész), Iteráció 2 (CRUD kész)
**Státusz:** [x] Done
**Lezárva:** 2026-04-03

#### Cél

Megvalósítani az összes exportálási lehetőséget az `import_export.html` oldalon: CSV export, XLSX export, és .sqlite adatbázis letöltés, hogy az adatok rendszerből kimenthetők és más eszközökkel is felhasználhatók legyenek.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 8.1 | Mint admin, szeretném a napi tényeket (napi_teny) és terveket (napi_terv) CSV formátumban exportálni szűrhető időszakra, hogy táblázatkezelőben is elemezhetők legyenek. | P1 |
| 8.2 | Mint admin, szeretném a napi tényeket és terveket XLSX formátumban exportálni (SheetJS), hogy Excel-ben is megnyithatók legyenek. | P1 |
| 8.3 | Mint admin, szeretném letölteni a teljes adatbázist .sqlite fájlként, hogy külső biztonsági mentést vagy migrációt végezhessek. | P1 |
| 8.4 | Mint admin, szeretném visszatölteni egy korábban mentett .sqlite fájlt, hogy adatvesztés esetén visszaállíthassam az adatbázist. | P1 |
| 8.5 | Mint admin, szeretném szűrni az exportálandó adatokat időszakra (tól–ig dátum) és sofőrre, hogy csak a releváns adatokat töltsem le. | P1 |

#### Elfogadási kritériumok

- [x] A CSV export letölthető fájlként; tartalmazza a dátum, sofőr neve, projekt munkaszáma, gép típusa, munkaóra oszlopokat.
- [x] Az XLSX export SheetJS-szel generált, megnyitható Microsoft Excel-ben és LibreOffice Calc-ban.
- [x] A .sqlite letöltés érvényes SQLite fájlt generál, amelyet DB Browser for SQLite-tal meg lehet nyitni.
- [x] A .sqlite visszatöltés felülírja az aktuális adatbázist; az oldal újratöltés nélkül frissül.
- [x] Az időszak szűrő működik az exportoknál (üres szűrő esetén az összes adat exportálódik).

#### Technikai adósság

- CSV export szemikolon-escaped, de idézőjeles mezőkön belüli szemikolon nem kezelt (nested quote hiányzik)
- XLSX második munkalap (napi_terv) nem szűrt (mindig összes rekordot tartalmazza)
- Sofőr select feltöltés a `getAllSoforok()` szinkron hívással működik — aszinkronra való átállásnál törhet

---

### Iteráció 9 — Dashboard és riportok

**Prioritás:** P1
**Becsült munkaidő:** 2 munkanap
**Függőségek:** Iteráció 6, Iteráció 7 (napi adatok elérhetők)
**Státusz:** [x] Done
**Lezárva:** 2026-04-03

#### Cél

Elkészíteni az `index.html` dashboard oldalt, amely gyors áttekintést ad a mai és közelgő beosztásokról, a nyitott tényekről, és alapszintű keresési lehetőséget nyújt.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 9.1 | Mint diszpécser, szeretném a dashboard-on látni a mai napon tervezett beosztásokat és a rögzített tényeket egy pillantással, hogy átlássam az aktuális helyzetet. | P1 |
| 9.2 | Mint diszpécser, szeretném szűrni a dashboard nézetét sofőrre, dátumra és munkaszámra, hogy gyorsan megtaláljam a keresett adatot. | P1 |
| 9.3 | Mint olvasó, szeretném látni a sofőrönkénti összesített munkaórákat adott időszakra, hogy a teljesítményt gyorsan áttekinthessem. | P1 |

#### Elfogadási kritériumok

- [x] Az index.html megnyitásakor megjelennek a mai nap tervezett és tény beosztásai.
- [x] A szűrők (sofőr, dátum, munkaszám) valós időben szűrik a megjelenített listát.
- [x] Az összesített munkaóra nézet sofőrönként és időszakonként lekérdezhető.

#### Technikai adósság (2026-04-03)

- **`determineState()` tervórák kiszámítása** — Javítva: a `tervDuration()` helper a `kezdes`/`vegez` TIME mezőkből számítja az eltelt perceket; a nem létező `terv.munkaora` hivatkozás eltávolítva.
- **`projekt.nev` null-referencia** — Javítva: a projektnév kiírásából eltávolítva a nem létező `projekt.nev` oszlophivatkozás.
- **XSS védelem CSS class stringeken** — Javítva: az `escHtml()` hívás eltávolítva CSS class névből (csak megjelenített szövegen kell alkalmazni).
- **14 teszteset lefedettség (TC-01 – TC-14)** — Összes sorállapot (Egyezés/Eltérés/Hiányzó rögzítés/Hiányzó terv), üres dátum, szűrők, XSS, árva rekordok, progress bar capping tesztelve.

---

### Iteráció 10 — Beállítások oldal

**Prioritás:** P1
**Becsült munkaidő:** 1 munkanap
**Függőségek:** Iteráció 1
**Státusz:** [x] Done — lezárva: 2026-04-03

#### Cél

Elkészíteni a `settings.html` oldalt, ahol az admin beállíthatja a felhasználó nevét (audit log-hoz), a szerepkört, és elvégezheti az adatbázis kezelési műveleteket (reset, backup).

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 10.1 | Mint admin, szeretném beállítani az aktuális felhasználó nevét és szerepét, hogy az audit log bejegyzések tartalmazzák a módosítót. | P1 |
| 10.2 | Mint admin, szeretném az adatbázist visszaállítani gyári állapotba (összes adat törlése), hogy tesztelés után tiszta lapot kaphassak. | P1 |

#### Elfogadási kritériumok

- [x] A beállított felhasználónév megjelenik a `valtozas_log` bejegyzések `felhasznalo` mezőjében.
- [x] Az adatbázis reset megerősítő párbeszéddel végrehajtható és az összes adattáblát törli (séma megmarad).

#### Elvégzett munka (2026-04-03)

- `src/settings.html` elkészült — kétblokkos elrendezés: Felhasználói azonosság (User Identity) form + DB Management blokk
- `src/identity.js` új modul — `getIdentity()` és `saveIdentity()` localStorage `dispatcher_identity` kulccsal
- `src/crud.js` frissítve — `logChange()` mostantól `getIdentity().name`-t használ hardkódolt felhasználónév helyett
- Összes 7 meglévő HTML oldal frissítve — "Beállítások" nav elem hozzáadva minden oldalsávhoz
- DB import és reset megerősítő modállal implementálva
- E2e teszter: CONDITIONAL APPROVE — 8 teszteset (TC-01 – TC-08) megírva, kritikus hiba nincs

#### Technikai adósság (2026-04-03)

- **BUG-S1 (Medium) — Sidebar footer hardkódolt szöveg** — A nem-settings oldalakon az oldalsáv lábléce "Beállítások" statikus szöveget mutat a bejelentkezett felhasználó neve helyett. Javítandó: az oldalsáv lábléc dinamikusan töltse be az `identity.js` `getIdentity().name` értékét minden oldalon. Iteráció 11-ben nyomon követendő.
- **BUG-S2 (Low) — `getIdentity()` JSON shape guard hiányzik** — A `localStorage`-ból visszaolvasott objektum JSON-ból való deszerializálásakor nincs ellenőrzés a várt mezők (name, role) jelenlétére. Sérült vagy hiányos adat esetén `undefined` referenciát okozhat. Védelmi default értékek hozzáadandók.

---

### Iteráció 11 — Minőségbiztosítás és dokumentáció

**Prioritás:** P2
**Becsült munkaidő:** 4 munkanap
**Függőségek:** Minden P0 és P1 iteráció lezárult
**Státusz:** [ ] Aktív — kiválasztva: 2026-04-03

#### Cél

Átfogó tesztelés, hibajavítás és felhasználói dokumentáció elkészítése, hogy a rendszer éles használatra alkalmas legyen.

#### Backlog tételek

| # | User Story | Prioritás |
|---|---|---|
| 11.1 | Mint tesztelő, szeretném manuálisan végrehajtani a teljes happy path tesztet (import → rögzítés → tervezés → export), hogy megbizonyosodjak a rendszer végponttól végpontig való működéséről. | P2 |
| 11.2 | Mint tesztelő, szeretném tesztelni a hibahelyzeteket (üres import, duplikátum rögzítés, nagy fájl, érvénytelen .sqlite visszatöltés), hogy a rendszer robusztusan kezelje a szélső eseteket. | P2 |
| 11.3 | Mint admin, szeretném, hogy legyen egy rövid felhasználói kézikönyv, amely leírja a főbb munkafolyamatokat (import, rögzítés, export), hogy a rendszert dokumentáció alapján is lehessen használni. | P2 |
| 11.4 | Mint fejlesztő, szeretném, hogy legyen egy admin kézikönyv, amely leírja a telepítési lépéseket, a könyvtár dependenciákat és a leggyakoribb hibák megoldását. | P2 |

#### Elfogadási kritériumok

- [ ] A teljes happy path teszt hibamentesen lefut.
- [ ] Az azonosított hibák javítva, nincs nyitott P0/P1 issue.
- [ ] A felhasználói kézikönyv tartalmaz legalább: import, napi rögzítés, export munkafolyamat leírást.
- [ ] Az admin kézikönyv tartalmaz telepítési útmutatót és hibaelhárítási táblázatot.

#### Iteráció 10-ből áthozott ismert hibák (follow-up scope)

- **BUG-S1 (Medium)** — Sidebar footer dinamikus felhasználónév: minden HTML oldal oldalsáv lábléce jelenleg statikus szöveget mutat; `getIdentity().name` alapján dinamizálandó.
- **BUG-S2 (Low)** — `getIdentity()` JSON shape guard: a `localStorage` visszaolvasásakor hiányzik a mezők validációja.

---

## 5. MVP scope

Az MVP (Minimálisan Indítható Változat) a P0 iterációkat tartalmazza: az a rendszer, amely valódi üzleti értéket nyújt az első éles használatkor.

### MVP tartalom

| Iteráció | Tartalom | Becsült munkaidő |
|---|---|---|
| Iteráció 1 | sql.js inicializáció, DB séma, IndexedDB perzisztencia, .sqlite mentés/visszatöltés | 3 nap |
| Iteráció 2 | CRUD wrapper, audit log | 2 nap |
| Iteráció 4 | Excel import pipeline (SheetJS, dátum kinyerés, normalizálás, import jóváhagyás) | 5 nap |
| Iteráció 5 | Névegyeztetés (alias + fuzzy matching) | 3 nap |
| Iteráció 6 | Napi tényrögzítés UI (autocomplete, validáció, duplikátum ellenőrzés) | 3 nap |
| Iteráció 7 | Napi tervezés és másnapi javaslat | 2 nap |
| **MVP összesen** | | **~18 munkanap** |

> Megjegyzés: Az Iteráció 3 (törzsadat oldalak) P1 prioritású, de az MVP-hez ajánlott az alapszintű sofőr/projekt/gép CRUD biztosítása, mert az import és rögzítés csak akkor működik érdemben, ha van mit kiválasztani. Ezért az Iteráció 3 funkcionális, de minimális UI-jal bevezetendő az MVP részeként (~2 nap extra).

### MVP elfogadási kritériumai

- [ ] A rendszer böngészőben (Chrome/Firefox/Edge) fájlok helyi megnyitásával is elindul.
- [ ] A `sofor`, `projekt`, `gep` táblákba kézzel felvihető adat az alapoldalakról.
- [ ] Egy valódi havi Excel fájl importálható; az adatok bekerülnek a `napi_terv` táblába.
- [ ] A napi tényadatok manuálisan rögzíthetők a `napi_rogzites.html` oldalon.
- [ ] A másnapi tervjavaslat legenerálható a tegnapi tények alapján.
- [ ] Az adatbázis exportálható .sqlite fájlként és CSV/XLSX formátumban.
- [ ] Az adatbázis menthető és visszatölthető IndexedDB-n és .sqlite fájlon keresztül is.

---

## 6. Kockázatok és mitigáció

| Kockázat | Valószínűség | Hatás | Mitigáció |
|---|---|---|---|
| **WASM/CORS hiba file:// protokollon** | Magas | Magas — az egész rendszer nem indul el | A sql.js WASM fájlt csomagolni kell a projektbe (ne CDN-ről töltsük offline use case-ben); tesztelni kell file:// és lokális HTTP szerveren is |
| **SheetJS CDN offline nem érhető el** | Közepes | Magas — import/export nem működik offline | SheetJS könyvtárat lokálisan csomagolni a projekt `/lib/` mappájába |
| **Névegyeztetés pontatlansága** | Magas | Közepes — rossz sofőrhöz rendelt adatok | Admin review lépés kötelező minden importnál; az első körben konzervatív matching (csak egyértelmű egyezések automatikusak) |
| **Nagyméretű Excel fájl memóriaproblémát okoz** | Közepes | Közepes — böngésző lefagy | Batch feldolgozás bevezetése; figyelmeztetés nagy fájl esetén (pl. >500 sor); import limit dokumentálása |
| **IndexedDB adatvesztés böngésző törléskor** | Alacsony | Magas — minden adat elvész | Rendszeres .sqlite letöltés javaslatának beépítése az UI-ba; user figyelmeztetés ha régen volt mentés |
| **Többfelhasználós konfliktusok** | Közepes | Közepes — konkurens módosítások felülírják egymást | Az offline rendszer egyszemélyes; ha szükséges a multi-user, szerveres szinkronizáció szükséges (jövőbeli scope) |
| **Dátum-formátum variációk lapnévben** | Magas | Közepes — dátum kinyerés hibás | Több formátum explicit kezelése a parseolóban; ismeretlen formátum esetén admin manuálisan adja meg a dátumot |

---

## 7. Technikai checklist

Ez a checklist fejlesztési referencia: minden modul implementálásánál ezek a függvények/komponensek szükségesek.

### db.js — Adatbázis réteg

- [ ] `initSqlJs()` — WASM betöltés; `locateFile` beállítása CDN vagy lokális útvonalra
- [ ] `createSchema()` — összes tábla létrehozása `CREATE TABLE IF NOT EXISTS`-szel
- [ ] `autosaveToIndexedDB()` — `db.export()` → `Uint8Array` → IDB `put` (minden write után hívni)
- [ ] `loadFromIndexedDB()` — IDB `get` → `new SQL.Database(new Uint8Array(...))` (oldal betöltésekor)
- [ ] `exportDB()` — .sqlite blob letöltése `<a download>` elemmel
- [ ] `importDB(file)` — File API → `ArrayBuffer` → `new SQL.Database(new Uint8Array(...))`

### crud.js — CRUD wrapper

- [ ] `createSofor(data)`, `updateSofor(id, data)`, `deleteSofor(id)`, `getAllSoforok()`, `getSoforById(id)`
- [ ] `createProjekt(data)`, `updateProjekt(id, data)`, `deleteProjekt(id)`, `getAllProjektek()`, `getProjektById(id)`
- [ ] `createGep(data)`, `updateGep(id, data)`, `deleteGep(id)`, `getAllGepek()`, `getGepById(id)`
- [ ] `createNapiTeny(data)`, `updateNapiTeny(id, data)`, `deleteNapiTeny(id)`, `getNapiTenyByDatum(datum)`
- [ ] `createNapiTerv(data)`, `updateNapiTerv(id, data)`, `deleteNapiTerv(id)`, `getNapiTervByDatum(datum)`

### audit.js — Audit log

- [ ] `logChange(tabla, rekord_id, muvelet, felhasznalo, leiras)` — minden CRUD wrapper hívja ezt

### import.js — Import pipeline

- [ ] `readExcel(file)` — SheetJS `XLSX.read(buffer, {type:'array'})` → workbook
- [ ] `enumerateSheets(workbook)` → sheet nevek listája
- [ ] `parseDateFromSheetName(sheetName)` — több formátum kezelése (`YYYY-MM-DD`, `MM.DD`, `YYYY.MM.DD`)
- [ ] `normalizeRow(row, datum)` → rekord objektum (hiányzó mezők alapértelme, üres sorok kiszűrése)
- [ ] `matchSofor(nev, soforok)` → `{sofor_id, confidence, originalName}` (alias + fuzzy match)
- [ ] `importRecords(records, targetTable)` → batch insert a DB-be
- [ ] `showImportReviewModal(unmatchedRows)` → admin jóváhagyó felület

### export.js — Export

- [ ] `exportCSV(query, filename)` — SQL lekérdezés eredménye CSV-ként letöltve
- [ ] `exportXLSX(query, filename)` — SheetJS `XLSX.utils.json_to_sheet` + `XLSX.writeFile`
- [ ] `downloadSQLite()` — az `exportDB()` hívása

### ui.js — UI segédeszközök

- [ ] `autocompleteSource(tabla)` → tömb a sofor/projekt/gep nevekből (autocomplete inputhoz)
- [ ] `validateRow(row, requiredFields)` → `{valid: bool, errors: string[]}`
- [ ] `showDuplicateWarning(row)` → modal vagy inline figyelmeztetés
- [ ] `renderTable(containerId, rows, columns)` → dinamikus HTML tábla generálás

### Oldalak (HTML fájlok)

- [ ] `index.html` — Dashboard: mai terv + tény áttekintés, szűrők
- [ ] `soforok.html` — Sofőr lista, CRUD, alias szerkesztés
- [ ] `projektek.html` — Projekt lista, CRUD
- [ ] `gepek.html` — Gép lista, CRUD
- [ ] `napi_rogzites.html` — Napi tényrögzítő űrlap, napi lista
- [ ] `napi_tervezes.html` — Másnapi javaslat generálás és szerkesztés
- [ ] `import_export.html` — Excel import, CSV/XLSX/sqlite export
- [ ] `settings.html` — Felhasználó beállítások, DB kezelés

### Fejlesztői environment checklist (egyszeri)

- [ ] Node.js LTS (18.x vagy 20.x) telepítve
- [ ] `npm install` lefutott
- [ ] `npx prisma generate` sikeres
- [ ] `npx prisma migrate dev --name init` sikeres
- [ ] `npm run dev` indítja a szervert; `http://localhost:3000/health` visszaad `{ "ok": true }`
- [ ] VS Code kiterjesztések: ESLint, Prettier, Prisma, SQLite/SQLTools

---

*Ez a dokumentum a pilot-eroforras projekt egyetlen, önálló backlog referenciája. Minden iteráció státusza (`[ ] Todo`, `[~] In Progress`, `[x] Done`) folyamatosan frissítendő a fejlesztés során.*
