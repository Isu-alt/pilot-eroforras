# Pilot Erőforrás — Adminisztrátori kézikönyv

**Verzió:** 1.0
**Alkalmazás:** Pilot Erőforrás (böngészőalapú flottakezelő)
**Stack:** Vanilla JS ES modulok, sql.js 1.10.2 (WASM SQLite), IndexedDB, SheetJS 0.18.5

---

## Tartalomjegyzék

1. [Telepítés és indítás](#1-telepítés-és-indítás)
2. [Adatbázis-struktúra](#2-adatbázis-struktúra)
3. [Adat-mentés és visszaállítás](#3-adat-mentés-és-visszaállítás)
4. [Audit log — valtozas_log tábla](#4-audit-log--valtozas_log-tábla)
5. [Hibaelhárítás](#5-hibaelhárítás)
6. [Architektúra — modulok és adatfolyam](#6-architektúra--modulok-és-adatfolyam)

---

## 1. Telepítés és indítás

### Előfeltételek

Az alkalmazásnak **nincs** szerver oldali komponense és **nincs** build lépése. A következők szükségesek:

- Modern böngésző (Chrome 90+, Firefox 90+, Edge 90+) — ES modulok és WASM támogatás szükséges
- Statikus webszerver a `src/` könyvtárhoz (CORS miatt `file://` protokollon az ES modul-import nem működik)
- Aktív internetkapcsolat az első betöltéskor (CDN-ről töltődik a sql.js WASM és a SheetJS; ezt követően az adat IndexedDB-ben marad)

### Indítás VS Code Live Server segítségével

1. Nyisd meg a projekt gyökérkönyvtárát VS Code-ban.
2. Telepítsd a **Live Server** bővítményt (Ritwick Dey).
3. Kattints jobb gombbal a `src/index.html` fájlra, majd válaszd az **Open with Live Server** opciót.
4. A böngésző automatikusan megnyílik a `http://127.0.0.1:5500/src/index.html` címen.

### Indítás bármilyen más statikus szerverrel

```bash
# Python 3 (a src/ könyvtárból)
python -m http.server 8080

# Node.js npx (a src/ könyvtárból)
npx serve .
```

Ezután nyisd meg a `http://localhost:8080/index.html` (vagy az adott port) címet.

### Fájlrendszer-struktúra

```
pilot-eroforras/
├── src/
│   ├── index.html          — Dashboard
│   ├── soforok.html        — Sofőrtörzs
│   ├── projektek.html      — Projekttörzs
│   ├── gepek.html          — Géptörzs
│   ├── napi_rogzites.html  — Napi tényrögzítés
│   ├── napi_tervezes.html  — Napi tervkészítés
│   ├── import_export.html  — Import/Export
│   ├── settings.html       — Beállítások
│   ├── shared.css          — Közös stílusok
│   ├── db.js               — Adatbázis-modul (sql.js + IndexedDB)
│   ├── crud.js             — CRUD wrapper + audit log
│   ├── import.js           — Excel import pipeline (SheetJS)
│   └── identity.js         — Felhasználói azonosító (localStorage)
└── docs/
    ├── felhasznaloi_kezikonyv.md
    └── admin_kezikonyv.md
```

### CDN-függőségek

Az alkalmazás a következő könyvtárakat CDN-ről tölti be:

| Könyvtár | Verzió | CDN URL | Hol használja |
|---|---|---|---|
| sql.js (JS) | 1.10.2 | `cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js` | `napi_rogzites.html`, `napi_tervezes.html` és más oldalak |
| sql.js (WASM) | 1.10.2 | `cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm` | `db.js` `initDB()` — automatikusan töltődik |
| SheetJS | 0.18.5 | `cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js` | `import_export.html` |
| Google Fonts (Inter) | — | `fonts.googleapis.com` | Összes HTML oldal |

> **Offline üzemeltetés:** Ha a CDN-ek nem elérhetők, a sql.js WASM nem tölthető be, az adatbázis nem inicializálódik, és az alkalmazás nem működik. Offline használathoz a fenti fájlokat le kell tölteni és helyileg kell elhelyezni, majd a `db.js` `locateFile` callback-jét kell frissíteni a helyi elérési útra.

---

## 2. Adatbázis-struktúra

Az SQLite adatbázis sémáját a `db.js` `createSchema()` függvénye hozza létre. A séma-létrehozás idempotens (`CREATE TABLE IF NOT EXISTS`), így biztonságosan futtatható meglévő adatbázison is.

### Táblák áttekintése

| Tábla | Leírás |
|---|---|
| `sofor` | Sofőrök törzsadatai |
| `projekt` | Projektek / munkák törzsadatai |
| `gep_csoport` | Eszközcsoportok (gép kategóriák) |
| `gep` | Gépek / járművek törzsadatai |
| `napi_terv` | Diszpécser által tervezett napi beosztás |
| `napi_teny` | Ténylegesen elvégzett munka rögzítve |
| `tavollet` | Sofőrök tervezett távolléte (szabadság, betegség) |
| `kompetencia` | Sofőr–gép jogosultsági mátrix (egyedi gép szintű) |
| `kompetencia_csoport` | Sofőr–gépcsoport jogosultsági mátrix (csoport szintű) |
| `valtozas_log` | Audit trail — minden írási művelet naplóbejegyzése |

> **Soft delete:** A legtöbb táblán szerepel `torolt INTEGER NOT NULL DEFAULT 0` oszlop. A CRUD függvények törléskor `torolt = 1`-re állítják a rekordot (`UPDATE ... SET torolt = 1`), nem törik a sort a táblából. A listázó függvények (`getAllSoforok`, `getAllGepek`, stb.) csak `WHERE torolt = 0` feltétellel dolgoznak. Ez biztosítja, hogy az audit nyomvonal teljes maradjon, és a törölt rekordok visszaállíthatók maradjanak.

---

### `sofor` tábla

```sql
CREATE TABLE IF NOT EXISTS sofor (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    teljes_nev     TEXT    NOT NULL,
    aliasok        TEXT,          -- JSON tömb: ["Gabi","Nagy G."]
    belepesi_datum DATE,
    statusz        TEXT    DEFAULT 'aktiv',   -- 'aktiv' | 'inaktiv'
    megjegyzes     TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP
);
```

| Mező | Típus | Kötelező | Megjegyzés |
|---|---|---|---|
| `id` | INTEGER | AUTO | Elsődleges kulcs |
| `teljes_nev` | TEXT | Igen | Sofőr teljes neve |
| `aliasok` | TEXT | Nem | JSON tömbként tárolt becénevek/rövidítések |
| `belepesi_datum` | DATE | Nem | ISO dátum: `YYYY-MM-DD` |
| `statusz` | TEXT | Nem | `aktiv` vagy `inaktiv` (alapért.: `aktiv`) |
| `megjegyzes` | TEXT | Nem | Szabad szöveg |
| `created_at` | TIMESTAMP | AUTO | Létrehozás időpontja |
| `updated_at` | TIMESTAMP | Nem | Utolsó módosítás időpontja |

---

### `projekt` tábla

```sql
CREATE TABLE IF NOT EXISTS projekt (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    munkaszam   TEXT    NOT NULL UNIQUE,
    helyszin    TEXT,
    megrendelo  TEXT,
    leiras      TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP
);
```

| Mező | Típus | Kötelező | Megjegyzés |
|---|---|---|---|
| `id` | INTEGER | AUTO | Elsődleges kulcs |
| `munkaszam` | TEXT | Igen | Egyedi munkaszám — UNIQUE constraint |
| `helyszin` | TEXT | Nem | Munkavégzés helye |
| `megrendelo` | TEXT | Nem | Megrendelő neve |
| `leiras` | TEXT | Nem | Leírás |
| `created_at` | TIMESTAMP | AUTO | |
| `updated_at` | TIMESTAMP | Nem | |

---

### `gep` tábla

```sql
CREATE TABLE IF NOT EXISTS gep (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tipus      TEXT,     -- pl. 'daru', 'tehergépkocsi'
    rendszam   TEXT,
    megjegyzes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

| Mező | Típus | Kötelező | Megjegyzés |
|---|---|---|---|
| `id` | INTEGER | AUTO | |
| `tipus` | TEXT | Nem | Gép típusa |
| `rendszam` | TEXT | Nem | Rendszám |
| `megjegyzes` | TEXT | Nem | |
| `created_at` | TIMESTAMP | AUTO | |
| `updated_at` | TIMESTAMP | Nem | |

---

### `napi_terv` tábla

```sql
CREATE TABLE IF NOT EXISTS napi_terv (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    datum      DATE    NOT NULL,
    sofor_id   INTEGER REFERENCES sofor(id),
    projekt_id INTEGER REFERENCES projekt(id),
    gep_id     INTEGER REFERENCES gep(id),
    kezdes     TIME,           -- 'HH:MM'
    vegez      TIME,           -- 'HH:MM'
    allapot    TEXT    DEFAULT 'javasolt',  -- 'javasolt' | 'elfogadott' | 'torolt'
    megjegyzes TEXT,
    forras     TEXT    DEFAULT 'manualis', -- 'manualis' | 'import'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

| Mező | Típus | Kötelező | Megjegyzés |
|---|---|---|---|
| `id` | INTEGER | AUTO | |
| `datum` | DATE | Igen | `YYYY-MM-DD` |
| `sofor_id` | INTEGER | Igen (FK) | → `sofor.id` |
| `projekt_id` | INTEGER | Nem (FK) | → `projekt.id` |
| `gep_id` | INTEGER | Nem (FK) | → `gep.id` |
| `kezdes` | TIME | Nem | Tervezett kezdés `HH:MM` |
| `vegez` | TIME | Nem | Tervezett befejezés `HH:MM` |
| `allapot` | TEXT | Nem | `javasolt` / `elfogadott` / `torolt` |
| `forras` | TEXT | Nem | `manualis` / `import` |

---

### `napi_teny` tábla

```sql
CREATE TABLE IF NOT EXISTS napi_teny (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    datum               DATE    NOT NULL,
    sofor_id            INTEGER REFERENCES sofor(id),
    projekt_id          INTEGER REFERENCES projekt(id),
    gep_id              INTEGER REFERENCES gep(id),
    kezd_idopont        DATETIME,
    befejezes_idopont   DATETIME,
    munkaora            REAL,
    fuvarok_szama       INTEGER,
    allapot             TEXT    DEFAULT 'rogzitett', -- 'rogzitett' | 'lezart' | 'torolt'
    megjegyzes          TEXT,
    forras              TEXT    DEFAULT 'manualis',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP
);
```

| Mező | Típus | Kötelező | Megjegyzés |
|---|---|---|---|
| `id` | INTEGER | AUTO | |
| `datum` | DATE | Igen | `YYYY-MM-DD` |
| `sofor_id` | INTEGER | Igen (FK) | |
| `projekt_id` | INTEGER | Nem (FK) | |
| `gep_id` | INTEGER | Nem (FK) | |
| `kezd_idopont` | DATETIME | Nem | Tényleges kezdés |
| `befejezes_idopont` | DATETIME | Nem | Tényleges befejezés |
| `munkaora` | REAL | Nem | Ledolgozott órák (tizedes) |
| `fuvarok_szama` | INTEGER | Nem | Fuvarszám |
| `allapot` | TEXT | Nem | `rogzitett` / `lezart` / `torolt` |
| `forras` | TEXT | Nem | `manualis` / `import` |

---

### `gep_csoport` tábla

```sql
CREATE TABLE IF NOT EXISTS gep_csoport (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nev        TEXT NOT NULL UNIQUE,
    torolt     INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
```

| Mező | Típus | Kötelező | Megjegyzés |
|---|---|---|---|
| `id` | INTEGER | AUTO | |
| `nev` | TEXT | Igen | Egyedi csoportnév (pl. `Daruk`, `Tehergépkocsik`) |
| `torolt` | INTEGER | Nem | Soft delete jelző (`0` = aktív, `1` = törölt) |

---

### `tavollet` tábla

```sql
CREATE TABLE IF NOT EXISTS tavollet (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sofor_id    INTEGER NOT NULL REFERENCES sofor(id),
    datum_tol   DATE    NOT NULL,
    datum_ig    DATE    NOT NULL,
    tipus       TEXT    NOT NULL DEFAULT 'szabadsag', -- szabadsag | betegseg | egyeb
    megjegyzes  TEXT,
    torolt      INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP
);
```

| Mező | Típus | Kötelező | Megjegyzés |
|---|---|---|---|
| `sofor_id` | INTEGER | Igen (FK) | → `sofor.id` |
| `datum_tol` | DATE | Igen | Távollét kezdete `YYYY-MM-DD` |
| `datum_ig` | DATE | Igen | Távollét vége `YYYY-MM-DD` |
| `tipus` | TEXT | Igen | `szabadsag` / `betegseg` / `egyeb` |
| `torolt` | INTEGER | Nem | Soft delete jelző |

---

### `kompetencia` tábla (egyedi gép jogosultság)

```sql
CREATE TABLE IF NOT EXISTS kompetencia (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    sofor_id  INTEGER NOT NULL REFERENCES sofor(id),
    gep_id    INTEGER NOT NULL REFERENCES gep(id),
    torolt    INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sofor_id, gep_id)
);
```

| Mező | Típus | Kötelező | Megjegyzés |
|---|---|---|---|
| `sofor_id` | INTEGER | Igen (FK) | → `sofor.id` |
| `gep_id` | INTEGER | Igen (FK) | → `gep.id` |
| `torolt` | INTEGER | Nem | Soft delete jelző |

CRUD függvények: `addKompetencia`, `removeKompetencia`, `getKompetenciaBySofor`, `getKompetenciaByGep`, `getSoforokByGep`.

---

### `kompetencia_csoport` tábla (gépcsoport jogosultság)

```sql
CREATE TABLE IF NOT EXISTS kompetencia_csoport (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    sofor_id   INTEGER NOT NULL REFERENCES sofor(id),
    csoport_id INTEGER NOT NULL REFERENCES gep_csoport(id),
    torolt     INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Mező | Típus | Kötelező | Megjegyzés |
|---|---|---|---|
| `sofor_id` | INTEGER | Igen (FK) | → `sofor.id` |
| `csoport_id` | INTEGER | Igen (FK) | → `gep_csoport.id` |
| `torolt` | INTEGER | Nem | Soft delete jelző |

CRUD függvények: `addKompetenciaCsoport`, `removeKompetenciaCsoport`, `getKompetenciaCsoportBySofor`, `getSoforokByCsoportKompetencia`.

**Reaktiválás logika:** Az `addKompetenciaCsoport` ellenőrzi, hogy létezik-e már sor ugyanarra a `(sofor_id, csoport_id)` párosra (akár törölt állapotban is). Ha igen, `torolt = 0`-ra állítja vissza; ha nem, új sort szúr be. Ez biztosítja, hogy a táblában ne keletkezzenek duplikált sorok, és az audit nyomvonal folyamatos maradjon.

---

### `valtozas_log` tábla (audit trail)

```sql
CREATE TABLE IF NOT EXISTS valtozas_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tabla       TEXT,      -- érintett tábla neve
    rekord_id   INTEGER,   -- érintett rekord azonosítója
    muvelet     TEXT,      -- 'INSERT' | 'UPDATE' | 'DELETE'
    felhasznalo TEXT    DEFAULT 'rendszer',
    idopont     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leiras      TEXT       -- emberi olvasható leírás
);
```

Részletek: ld. [4. fejezet](#4-audit-log--valtozas_log-tábla).

---

## 3. Adat-mentés és visszaállítás

### Automatikus mentés IndexedDB-be

Minden sikeres adatmódosítás után a `db.js` `saveToIndexedDB()` függvénye automatikusan meghívódik. Ez az aktuális SQLite adatbázist bináris (`Uint8Array`) formában elmenti a böngésző IndexedDB-jébe:

- **IndexedDB neve:** `pilot-db`
- **Object store neve:** `db`
- **Kulcs:** `main`

Az oldal minden betöltésekor az `initDB()` függvény megkísérli visszatölteni ezt az adatot (`loadFromIndexedDB()`). Ha talál mentett adatot, abból állítja vissza az adatbázist; ha nem, üres adatbázist hoz létre.

### .sqlite fájl letöltése (biztonsági mentés)

**Import / Export oldal → Adatbázis mentés → Letöltés .sqlite**

A `db.js` `exportDB()` függvénye hívódik meg:
1. `db.export()` — `Uint8Array` bináris SQLite formátumban
2. `Blob` + `URL.createObjectURL()` + `<a>` elem kattintása — böngésző letöltési párbeszédablak
3. Alapértelmezett fájlnév: `pilot-eroforras.sqlite`

A .sqlite fájl szabványos SQLite3 formátum — megnyitható bármilyen SQLite klienssel (pl. DB Browser for SQLite, DBeaver).

### .sqlite fájl visszaállítása

**Import / Export oldal → Adatbázis visszaállítása → Fájl választása…**

**vagy**

**Beállítások oldal → Adatbázis kezelés → Feltöltés gomb**

Mindkét helyen a `db.js` `importDB(file)` függvénye fut le:

1. A fájl beolvasása `ArrayBuffer`-ként (`FileReader`)
2. `new SQL.Database(data)` — új adatbázis-példány létrehozása a bináris adatból
3. Ha a parse sikertelen (corrupt fájl), a rendszer visszaáll az előző példányra, és hibát dob: `'Hibás .sqlite fájl — az adatbázis változatlan maradt.'`
4. Sikeres parse esetén `createSchema()` — biztosítja, hogy régebbi mentésből visszaállított adatbázison is meglegyen az összes tábla
5. `saveToIndexedDB()` — az új adatbázis azonnal mentésre kerül IndexedDB-be

### Adatbázis alaphelyzetbe állítása

**Beállítások oldal → Adatbázis kezelés → Törlés gomb**

Megerősítő modal után a következő műveletek futnak le (FK-sorrendben):

```javascript
db.run('DELETE FROM valtozas_log');
db.run('DELETE FROM napi_teny');
db.run('DELETE FROM napi_terv');
db.run('DELETE FROM gep');
db.run('DELETE FROM projekt');
db.run('DELETE FROM sofor');
await saveToIndexedDB();
```

A séma megmarad, csak az adatok törlődnek. Ez a művelet nem visszafordítható.

---

## 4. Audit log — valtozas_log tábla

### Mi kerül a naplóba

A `crud.js` `logChange()` belső függvénye minden `createSofor`, `updateSofor`, `deleteSofor`, `createProjekt`, `updateProjekt`, `deleteProjekt`, `createGep`, `updateGep`, `deleteGep`, `createNapiTeny`, `updateNapiTeny`, `deleteNapiTeny`, `createNapiTerv`, `updateNapiTerv`, `deleteNapiTerv` hívás után automatikusan bejegyzi a változást.

### Napló-bejegyzés mezői

| Mező | Tartalom | Példa |
|---|---|---|
| `tabla` | Érintett tábla neve | `sofor`, `napi_teny`, `napi_terv` |
| `rekord_id` | Érintett rekord `id`-je | `42` |
| `muvelet` | Művelettípus | `INSERT`, `UPDATE`, `DELETE` |
| `felhasznalo` | A bejelentkezett felhasználó neve | `Kiss János` |
| `idopont` | Esemény időpontja | `2026-03-15 09:42:11` |
| `leiras` | Emberi olvasható leírás | `Sofőr frissítve (id=42): {"statusz":"inaktiv"}` |

A `felhasznalo` értékét a `getIdentity().name` adja vissza (`identity.js` → `localStorage["dispatcher_identity"]`). Ha nincs beállítva azonosító, az értéke `Ismeretlen`.

### Az audit log lekérdezése

**JavaScript-ből (UI-ban):**
```javascript
import { getValtozasLog } from './crud.js';
const log = getValtozasLog();  // legújabb bejegyzések elöl
```

**SQL-lel (DB Browser for SQLite):**
```sql
SELECT * FROM valtozas_log ORDER BY idopont DESC LIMIT 100;

-- Egy adott sofőr változásai:
SELECT * FROM valtozas_log WHERE tabla = 'sofor' AND rekord_id = 5;

-- Egy adott felhasználó műveletei:
SELECT * FROM valtozas_log WHERE felhasznalo = 'Kiss János' ORDER BY idopont DESC;
```

### Fontos korlátozások

- Az audit log hibája **nem állítja le** a fő adatműveletet (`logChange()` hibát elnyel és csak `console.error`-t ír).
- Az alaphelyzetbe állítás (`Törlés` gomb) a `valtozas_log` táblát is törli.
- Az import (`executeImport()`) kötegelt INSERT-eket végez — minden beillesztett sorhoz keletkezik egy audit bejegyzés.

---

## 5. Hibaelhárítás

### 5.1 WASM betöltési hiba

**Tünet:** Az oldal fehér marad, a konzolban (`F12 → Console`) valami ilyesmi látható:
```
[db] initDB hiba: TypeError: initSqlJs is not a function
```
vagy:
```
Uncaught (in promise) RuntimeError: abort(null) at Error
```

**Okok és megoldások:**

| Ok | Megoldás |
|---|---|
| Az oldalt `file://` protokollal nyitottad meg | Használj statikus szervert (ld. [1. fejezet](#1-telepítés-és-indítás)) |
| Nincs internetkapcsolat az első betöltéskor | A `sql-wasm.wasm` fájl CDN-ről töltődik; online kapcsolat szükséges az első betöltéshez |
| A CDN nem elérhető (karbantartás) | Ellenőrizd: `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js` — vagy töltsd le és helyezd el helyileg |
| Böngésző WASM-ot blokkolja | Néhány vállalati böngésző-szabályzat letiltja a WASM-ot; engedélyezd a `WebAssembly` futtatást |

**Diagnosztika:** Nyisd meg a böngésző konzolját, és keresd a `[db]` prefixű üzeneteket. Ha `[db] Adatbázis visszatöltve IndexedDB-ből.` vagy `[db] Új adatbázis létrehozva.` üzenet jelenik meg, az inicializálás sikeres volt.

---

### 5.2 IndexedDB kvóta-hiba

**Tünet:** Mentés közben hiba jelenik meg, a konzolban:
```
[db] saveToIndexedDB hiba: DOMException: The current transaction exceeded its quota limitations.
```
vagy
```
QuotaExceededError
```

**Magyarázat:** A böngészők korlátozhatják az IndexedDB által felhasználható lemezterületet. A korlát böngészőnként eltér (Chrome: általában az elérhető lemezterület ~6%-a; Firefox: hasonló).

**Megoldások:**

1. **Azonnali megoldás:** Exportáld az adatbázist `.sqlite` fájlként (**Import / Export → Letöltés .sqlite**), majd töröld az IndexedDB tartalmát a böngésző fejlesztői eszközeivel:
   - Chrome: `F12 → Application → Storage → IndexedDB → pilot-db → jobb klikk → Delete database`
   - Firefox: `F12 → Storage → IndexedDB → pilot-db → Delete All`
2. **Visszaállítás:** Töltsd vissza a letöltött `.sqlite` fájlt a Visszaállítás funkción keresztül.
3. **Hosszú távú megoldás:** Ha az adatbázis mérete folyamatosan nő, töröld az archivált (`torolt` állapotú) rekordokat:
   ```sql
   DELETE FROM napi_teny WHERE allapot = 'torolt';
   DELETE FROM napi_terv WHERE allapot = 'torolt';
   DELETE FROM valtozas_log WHERE idopont < '2025-01-01';
   ```

---

### 5.3 Érvénytelen import (Excel)

**Tünet:** Az Excel-import után a sorok többsége `unknown` (piros) badge-et kap, vagy a fájl beolvasása meghiúsul.

**Lehetséges okok és megoldások:**

| Tünet | Ok | Megoldás |
|---|---|---|
| `Az Excel fájl beolvasása sikertelen` | Corrupt vagy nem támogatott formátum | Mentsd újra `.xlsx` formátumban Excel-ből vagy Google Sheetsből |
| Minden sor `unknown` | Az oszlopnevek nem ismerhetők fel | Ellenőrizd az oszlopneveket — a felismert nevek listája az `import.js` `normalizeRows()` függvényében van (`SOFOR_KEYS`, `MUNKA_KEYS` stb.) |
| Dátum nem érzékelhető | A sheet neve nem tartalmaz felismerhető dátumformátumot | Nevezd át a sheet-et (pl. `2026.03.15`) vagy add meg kézzel a dátumot az előnézet-lépésnél |
| Üres `Sorok` érték a sheet-szelektornál | Az Excel-fájl az első sorban nem tartalmaz fejlécet | Adj hozzá fejlécsort az adatok fölé |
| Sofőrök nem egyeznek | A sofőrnevek túlságosan eltérnek az adatbázisban tárolt nevektől | Vedd fel az Excel-ben használt nevet aliasként a sofőr rekordhoz (`soforok.html`) |

**Egyeztetési küszöb:** A `matchSofor()` függvény a legkisebb egyezési szinten is elfogad (`partial`, score 0.6). Ha ez sem elegendő (pl. a név teljesen más), az automatikus egyeztetés nem fog sikerülni — ilyenkor kézzel kell hozzárendelni a sofőrt az előnézet-lépésben.

---

### 5.4 Adatbázis-visszaállítás meghiúsul

**Tünet:** A `.sqlite` fájl visszatöltésekor hibaüzenet: `Hibás .sqlite fájl — az adatbázis változatlan maradt.`

**Okok:**
- A fájl nem érvényes SQLite3 adatbázis (pl. csonkolt letöltés, más formátum)
- A fájl jelszóval védett (az sql.js nem támogatja az encrypted SQLite-ot)

**Ellenőrzés:** Nyisd meg a fájlt DB Browser for SQLite alkalmazással — ha az sem nyitja meg, a fájl corrupt. Próbálj egy korábbi mentési verziót.

---

### 5.5 Üres vagy fehér oldal

**Tünet:** Az oldal betölt, de a tartalom üres, és `Adatbázis hiba — töltsd újra az oldalt` üzenet jelenik meg.

**Megoldás:** Nyomd meg az `F5` billentyűt (oldal újratöltés). Ha a hiba ismétlődik, ellenőrizd a konzolt (`F12 → Console`) a részletes hibaüzenetért. A leggyakoribb ok az `initDB()` meghiúsulása (ld. [5.1 fejezet](#51-wasm-betöltési-hiba)).

---

### 5.6 SheetJS nem érhető el (import oldal)

**Tünet:** Az **Import / Export** oldalon az Excel-fájl húzása/kiválasztása után semmi nem történik, a konzolban:
```
ReferenceError: XLSX is not defined
```

**Ok:** A SheetJS CDN-szkript (`xlsx.full.min.js`) nem töltődött be.

**Megoldás:** Ellenőrizd az internet-kapcsolatot és a `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js` elérhetőségét. Szükség esetén töltsd le és helyezd a `src/` könyvtárba, majd frissítsd a `<script src="...">` sort az `import_export.html` fájlban.

---

## 6. Architektúra — modulok és adatfolyam

### Modulok és felelősségeik

| Fájl | Felelősség |
|---|---|
| `db.js` | sql.js betöltése, adatbázis inicializálás (`initDB`), séma-létrehozás (`createSchema`), IndexedDB olvasás/írás (`saveToIndexedDB`, `loadFromIndexedDB`), `.sqlite` export/import (`exportDB`, `importDB`), `getDB()` singleton |
| `crud.js` | CRUD wrapper függvények minden táblához, `logChange()` audit-naplózás, `getValtozasLog()` |
| `import.js` | Excel pipeline: `readExcelFile` → `getSheetsInfo` → `parseDateFromSheetName` → `normalizeRows` → `matchSofor` (fuzzy) → `buildImportPreview` → `executeImport` → `saveAliasIfNew` |
| `identity.js` | `getIdentity()` / `saveIdentity()` localStorage wrapper (`dispatcher_identity` kulcs) |

### Adatfolyam (normál működés)

```
Böngésző indítás
  └─> initDB()         [db.js]
        ├─> sql.js CDN betöltés
        ├─> loadFromIndexedDB()  → ha van mentett adat: db = new SQL.Database(saved)
        │                         ha nincs: db = new SQL.Database()
        └─> createSchema()       → CREATE TABLE IF NOT EXISTS (idempotens)

Felhasználói művelet (pl. sofőr mentése)
  └─> createSofor(data)  [crud.js]
        ├─> getDB()       → aktív db példány
        ├─> db.run(INSERT ...)
        ├─> lastInsertId()
        └─> logChange('sofor', id, 'INSERT', leírás)
              └─> getIdentity().name  [identity.js → localStorage]

  └─> saveToIndexedDB()  [db.js]
        └─> db.export()  → Uint8Array → idbPut('pilot-db', 'db', 'main', data)
```

### sql.js result konverzió

A `crud.js` `rowsToObjects()` segédfüggvénye alakítja a sql.js saját formátumát JS objektumok tömbjévé:

```javascript
// sql.js exec() visszatérési értéke:
[{ columns: ['id','teljes_nev','statusz'], values: [[1,'Nagy Gábor','aktiv'],[2,'Kiss Péter','aktiv']] }]

// rowsToObjects() után:
[{ id: 1, teljes_nev: 'Nagy Gábor', statusz: 'aktiv' }, { id: 2, teljes_nev: 'Kiss Péter', statusz: 'aktiv' }]
```

### Felhasználói azonosító tárolása

Az `identity.js` a `localStorage["dispatcher_identity"]` kulcson tárolja az azonosítót JSON formátumban:

```json
{ "name": "Kiss János", "role": "Diszpécser" }
```

Az érvénytelen (hiányos vagy corrupt) JSON esetén az alapértelmezett értékek (`name: 'Ismeretlen'`, `role: 'Diszpécser'`) kerülnek vissza. A localStorage-ban tárolt adat böngészőn belül marad — más böngészőre vagy más gépre nem szinkronizálódik.

### Excel import pipeline részletesen

```
readExcelFile(file)        → SheetJS workbook
  └─> getSheetsInfo()      → [{ name, rowCount, detectedDate }]
        └─> parseDateFromSheetName()  → 'YYYY-MM-DD' | null
  └─> buildImportPreview(workbook, soforok)
        └─> normalizeRows(sheet, datum)  → [NormalizedRow]
              └─> findCell() + normalizeTime()
        └─> matchSofor(rawSoforNev, soforok)
              → 1. exact (1.0) → 2. alias (0.9) → 3. fuzzy token (0.75)
              → 4. levenshtein ≤2 (0.65) → 5. partial (0.6) → null

  [Felhasználó jóváhagyja a hozzárendeléseket]

executeImport(approvedRows, projektek, gepek)
  └─> createNapiTerv(...)  [crud.js] — minden jóváhagyott sorhoz
  └─> saveToIndexedDB()
  └─> saveAliasIfNew()     — nem-exact egyezéseknél alias mentése
```

---

*Ez a kézikönyv az alkalmazás forráskódjának (`db.js`, `crud.js`, `import.js`, `identity.js`, és a HTML oldalak) elemzése alapján készült.*
