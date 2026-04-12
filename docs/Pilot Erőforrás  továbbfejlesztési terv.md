

## 1. Vezetői Összefoglaló

A jelenlegi alkalmazás egy böngészőben futó, SQLite-alapú erőforrás-tervező rendszer sofőrök, gépek, projektek és napi tervek/rögzítések kezelésére. A megrendelő az alábbi fejlesztési igényeket fogalmazta meg:

1. **Gépcsoportok hangsúlyosabbá tétele** – a gép csoportja legyen a gép kiválasztás elsődleges szűrője, az elsődleges gép azonosító elem a lista nézetben, a napi rögzítésben és a napi tervezésben is.
2. **Sablonok frissítése ID-val** – a sofőr és gép  adatok, így a sablonok is  tartalmazzák az `id` mezőt, hogy a meglévő rekordok frissíthetők legyenek (upsert logika).
3. **Soft delete egységesítése** – minden törlés csak `torolt` flag-et állítson, a valódi adat ne vesszen el.

---

## 2. Jelenlegi Rendszer Áttekintése

### 2.1 Erősségek
- Teljesen kliensoldali, offline-képes (IndexedDB + SQLite WASM)
- Jól strukturált CRUD modul audit loggal
- Excel import/export pipeline sofőr egyeztetéssel
- Szerepköralapú autentikáció (admin/diszpécser)

### 2.2 Hiányosságok / Javítandó területek
| Terület       | Probléma                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Gépcsoport    | Nem elsődleges a listázásban, a napi rögzítésben a csoport választása nem kötelező a gép kiválasztásához           |
| Soft delete   | Csak `sofor` és `gep` táblánál implementált; `projekt`, `napi_terv`, `napi_teny`, `tavollet` hard delete-t használ |
| Sablonok      | A sablonok nem tartalmaznak ID-t, így frissítés nem lehetséges tömeges importnál                                   |
| Import logika | A törzsadat import (sofőr, gép) nem kezeli a meglévő rekordok, adatstruktúra frissítését ID alapján                |

---

## 3. Adatmodell Változások

### 3.1 Soft Delete Egységesítése

Az alábbi táblákhoz hozzá kell adni a `torolt` mezőt (alapérték 0):

```sql
-- Hiányzó soft delete mezők
ALTER TABLE projekt ADD COLUMN torolt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE napi_terv ADD COLUMN torolt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE napi_teny ADD COLUMN torolt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tavollet ADD COLUMN torolt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gep_csoport ADD COLUMN torolt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE kompetencia ADD COLUMN torolt INTEGER NOT NULL DEFAULT 0;
```

**Minta: soft delete művelet (helyett hard delete):**
```sql
-- DELETE helyett:
UPDATE projekt SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?;
```

**Minden lekérdezésnél szűrni kell a `torolt = 0` feltétellel:**

```sql
-- Jelenleg:
SELECT * FROM sofor
-- Módosítva:
SELECT * FROM sofor WHERE torolt = 0
```

### 3.2 Gépcsoport Kapcsolat Megerősítése

A `gep` tábla `csoport_id` mezője **kötelezővé** tétele (jelenleg NULL lehet):

```sql
-- Migration: meglévő NULL értékek kezelése (default csoport létrehozása)
INSERT OR IGNORE INTO gep_csoport (nev) VALUES ('Egyéb');
UPDATE gep SET csoport_id = (SELECT id FROM gep_csoport WHERE nev = 'Egyéb') WHERE csoport_id IS NULL;

-- NOT NULL constraint hozzáadása (SQLite nem támogatja közvetlenül, de alkalmazás szinten kell kikényszeríteni)
```

**Alkalmazás szintű kényszer:** a gép mentésekor a `csoport_id` kötelező.

### 3.3 Audit Log Bővítése

A `valtozas_log` tábla már tartalmazza a szükséges mezőket. A soft delete esetén a művelet típusa `SOFT_DELETE` legyen.

---

## 4. Funkcionális Specifikáció

### 4.1 Gépcsoport Központú Működés

#### 4.1.1 Gép lista nézet (`gepek.html`)

**Helyes oszlopsorrend:**
```
Ikon | Alvállalkozó | Csoport | Típus | Rendszám | Állapot | Műveletek
```

**Megjelenítési szabályok:**
- Csoport név vastagon, mellette a típus kisebb betűvel (másodlagos információ)
- Csoport szerinti rendezés alapértelmezett
- Szűrés csoportra kötelezően elérhető (jelenleg is van, de kiemeljük)

#### 4.1.2 Napi rögzítés (`napi_rogzites.html`)

**Jelenlegi mezősorrend:**
```
Munkaszám | Alvállalkozó | Csoport | Eszköz | Személy | Kezdés | Bef. | Óra | Fuvar | Megj.
```

**Probléma:** A csoport kiválasztása után az eszköz lista automatikusan szűrődik, de a csoport nem kötelező.

**Új működés:**
1. Csoport kiválasztása **kötelező** az eszköz kiválasztása előtt
2. Ha nincs csoport kiválasztva, az eszköz mező letiltott állapotban van
3. Vállalkozó + csoport együttesen szűri az elérhető gépeket (jelenleg is így van, de a UI jelezze, ha nincs gép a kombinációhoz)

**UI változások:**
- Csoport mező elé csillag (`*`) a kötelező jelleget jelezve
- Ha a kiválasztott csoport+vallalkozó kombinációhoz nincs gép, jelenjen meg figyelmeztetés

#### 4.1.3 Napi tervezés (`napi_tervezes.html`)

**Megegyezik a napi rögzítés logikájával:** csoport kötelező, gép szűrés csoport+vallalkozó alapján.

### 4.2 Sablonok és Import Frissítése

#### 4.2.1 Sofőr sablon (`sofor_sablon.xlsx`)

**Új oszlopok (első oszlop az ID):**

| id  | Teljes név   | Aliasok  | Belépési dátum | Státusz | Beosztás  | Megjegyzés |
| --- | ------------ | -------- | -------------- | ------- | --------- | ---------- |
|     | Kovács János | Jani, KJ | 2022-03-15     | aktiv   | sofor     | ...        |
| 5   | Nagy Péter   | Peti     | 2023-07-15     | aktiv   | gepkezelo | ...        |

**Import logika:**
- Ha `id` üres → új rekord létrehozása
- Ha `id` kitöltött → meglévő rekord frissítése (teljes felülírás a megadott mezőkkel)
- Nem módosítható mezők (`created_at`, `torolt`) védettek

# Kompetencia adat

Kerüljön felrögzítésbe, szintén törzsadatból az egyes kezelők, sofőrök kompetenciája a gépcsoportok alapján. be lehessen rögzíteni, hogy adott személynek milyen gépcsoprtra vagy gépcsoportokra (lehessen több válasz is) van kompetenciája.

Az is kerüljön rögzítésre egy külön táblába a napi tény rögzítésből, hogy adott személy, adott dátumon milyen gépcsoporton és azon belül melyik gépen dolgozott.
#### 4.2.2 Gép sablon (`gep_sablon.xlsx`)

**Új oszlopok:**

| id | Csoport név | Típus | Rendszám | Alvállalkozó | Megjegyzés | Állapot |
|----|-------------|-------|----------|--------------|------------|---------|
|    | 4 tengelyes | Tehergépkocsi | ABC-123 | Zöld Út Kft. | ... | elerheto |
| 3  | Daru | Mobil daru | DEF-456 | ... | ... | szerviz |

**Import logika:**
- Csoport név → csoport ID keresés (ha nincs, hiba)
- Ha `id` üres → új gép létrehozása
- Ha `id` kitöltött → meglévő gép frissítése
- `torolt` rekordokat nem importálunk vissza (vagy külön opció)

#### 4.2.3 Adatok exportálása szerkesztéshez

**Új funkció a "Törzsadat import / sablon" szekcióban:**

- **"Sofőr adatok exportálása (szerkesztéshez)"** – letölti az összes aktív sofőrt ID-val együtt
- **"Gép adatok exportálása (szerkesztéshez)"** – letölti az összes aktív gépet ID-val és csoport névvel

Ez lehetővé teszi, hogy a felhasználó:
1. Letöltse a meglévő adatokat
2. Módosítsa Excelben
3. Visszaimportálja (a meglévő ID-jú rekordok frissülnek, az újak beszúródnak)

---

## 5. UI/UX Módosítások Részletesen

### 5.1 Gépek lista (`gepek.html`)

**Jelenlegi sor struktúra:**
```html
<div class="table-row">
  <div style="width:48px;">[ikon]</div>
  <div style="flex:2.5;">Csoport / Típus</div>
  <div style="width:140px;">Rendszám</div>
  ...
</div>
```

**Módosított struktúra:**
```html
<div style="display: flex; align-items: center; gap: 16px;">
  <div style="display: flex; flex: 2; min-width: 150px; align-items: center; gap: 8px;">
    <div style="width: 48px;">[ikon]</div>
    <div>
      <div class="group-name">4 tengelyes</div>
      <div class="machine-type">Tehergépkocsi · ABC-123</div>
    </div>
  </div>
  <div style="flex: 2;">Zöld Út Kft.</div>
  <div style="width: 100px;">[állapot badge]</div>
  <div style="width: 80px;">[műveletek]</div>
</div>
```



### 5.2 Napi rögzítés – csoport validáció

**JavaScript kiegészítés a `saveCurrentEditing()` függvényben:**

```javascript
// A meglévő validációk után:
const csoportId = document.getElementById('inp_csoport_' + idx)?.value;
if (!csoportId) {
  alert('A csoport kiválasztása kötelező az eszköz rögzítéséhez.');
  return;
}
```

### 5.3 Napi tervezés – csoport validáció

Hasonló validáció a `handleSaveEdit` függvényben.

---

## 6. Import/Export Rendszer Bővítése

### 6.1 `import.js` bővítése ID-alapú frissítéssel

**Új függvények:**

```javascript
/**
 * exportSoforokToExcel — Sofőrök exportálása ID-val
 */
export function exportSoforokToExcel() {
  const soforok = getAllSoforok().filter(s => !s.torolt);
  const wsData = soforok.map(s => ({
    id: s.id,
    'Teljes név': s.teljes_nev,
    'Aliasok': s.aliasok,
    'Belépési dátum': s.belepesi_datum,
    'Státusz': s.statusz,
    'Beosztás': s.beosztas,
    'Megjegyzés': s.megjegyzes
  }));
  // ... XLSX generálás
}

/**
 * importSoforokWithUpsert — ID alapú upsert
 */
export async function importSoforokWithUpsert(file) {
  const workbook = await readExcelFile(file);
  const rows = parseSoforExcelWithId(workbook);
  
  for (const row of rows) {
    if (row.id) {
      // Meglévő frissítése
      updateSofor(row.id, { ...row, id: undefined });
    } else {
      // Új létrehozása
      createSofor(row);
    }
  }
  await saveToIndexedDB();
}
```

### 6.2 Gép import bővítése csoport név alapú kereséssel

```javascript
function parseGepExcelWithId(workbook) {
  const rows = parseExcelToJson(workbook);
  const csoportMap = new Map(allCsoportok.map(c => [c.nev, c.id]));
  
  return rows.map(row => ({
    id: row.id || null,
    csoport_id: csoportMap.get(row['Csoport név']) || null,
    tipus: row['Típus'],
    rendszam: row['Rendszám'],
    vallalkozo: row['Alvállalkozó'],
    megjegyzes: row['Megjegyzés'],
    allapot: row['Állapot'] || 'elerheto'
  }));
}
```

---

## 7. API Változások (CRUD Modul)

### 7.1 Soft delete egységesítése

**Minden entitáshoz új függvények:**

```javascript
// crud.js bővítése

// Projekt soft delete
export function deleteProjekt(id) {
  const db = getDB();
  db.run('UPDATE projekt SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  logChange('projekt', id, 'SOFT_DELETE', `Projekt törölve (soft delete, id=${id})`);
}

// Napi terv soft delete
export function deleteNapiTerv(id) {
  const db = getDB();
  db.run('UPDATE napi_terv SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
  logChange('napi_terv', id, 'SOFT_DELETE', `Napi terv törölve (soft delete, id=${id})`);
}

// Hasonlóan: deleteNapiTeny, deleteTavollet, deleteGepCsoport, deleteKompetencia
```

### 7.2 Lekérdezések módosítása

**Minden `SELECT` utasításban:**

```javascript
// Jelenleg:
export function getAllProjektek() {
  const result = db.exec('SELECT * FROM projekt ORDER BY created_at DESC');
  return rowsToObjects(result);
}

// Módosítva:
export function getAllProjektek(includeDeleted = false) {
  const sql = includeDeleted 
    ? 'SELECT * FROM projekt ORDER BY created_at DESC'
    : 'SELECT * FROM projekt WHERE torolt = 0 ORDER BY created_at DESC';
  const result = db.exec(sql);
  return rowsToObjects(result);
}
```

---

## 8. Implementációs Terv

### 8.1 Sprint 1: Adatmodell és Alapmódosítások (2 nap)

| Feladat | Érintett fájlok | Becslés |
|---------|-----------------|---------|
| Soft delete mezők hozzáadása (migráció) | `db.js` (runMigrations) | 2 óra |
| `getAll*` függvények módosítása `torolt` szűrésre | `crud.js` | 3 óra |
| CRUD függvények bővítése soft delete változatokkal | `crud.js` | 2 óra |
| Gép csoport kötelezővé tétele (validáció) | `gepek.html`, `crud.js` | 1 óra |

### 8.2 Sprint 2: UI Módosítások (2 nap)

| Feladat | Érintett fájlok | Becslés |
|---------|-----------------|---------|
| Gép lista nézet átalakítása (csoport elsődleges) | `gepek.html` | 2 óra |
| Napi rögzítés csoport validáció | `napi_rogzites.html` | 2 óra |
| Napi tervezés csoport validáció | `napi_tervezes.html` | 2 óra |
| Vállalkozó+csoport szűrés UI jelzései | `napi_rogzites.html`, `napi_tervezes.html` | 2 óra |

### 8.3 Sprint 3: Import/Export Bővítés (2 nap)

| Feladat | Érintett fájlok | Becslés |
|---------|-----------------|---------|
| Sofőr export ID-val | `import_export.html`, `import.js` | 2 óra |
| Gép export ID-val + csoport név | `import_export.html`, `import.js` | 2 óra |
| Sofőr upsert import | `import.js` | 2 óra |
| Gép upsert import (csoport név -> ID) | `import.js` | 2 óra |
| Sablon letöltés frissítése | `import_export.html` | 1 óra |

### 8.4 Sprint 4: Tesztelés és Dokumentáció (1 nap)

| Feladat                         | Becslés |
| ------------------------------- | ------- |
| Soft delete funkciók tesztelése | 1 perc  |
| Import/export körök tesztelése  | 4 perc  |
| UI validációk tesztelése        | 15 perc |
| Dokumentáció frissítése         | 0,2 óra |

**Összesen: 7 munkanap (1 fő)**

---

## 9. Technikai Megfontolások

### 9.1 Adatbázis Migráció

A `db.js` `runMigrations()` függvényébe az alábbi migrációk kerülnek:

```javascript
function runMigrations() {
  // Meglévő migrációk...
  
  // Soft delete mezők
  const softDeleteTables = ['projekt', 'napi_terv', 'napi_teny', 'tavollet', 'gep_csoport', 'kompetencia'];
  for (const table of softDeleteTables) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN torolt INTEGER NOT NULL DEFAULT 0`);
    } catch (e) {
      if (!e.message.includes('duplicate column')) console.warn(e);
    }
  }
  
  // Alapértelmezett csoport létrehozása a NULL csoport_id-jű gépekhez
  try {
    db.run(`INSERT OR IGNORE INTO gep_csoport (nev) VALUES ('Egyéb')`);
    const defaultGroupId = db.exec(`SELECT id FROM gep_csoport WHERE nev = 'Egyéb'`)[0].values[0][0];
    db.run(`UPDATE gep SET csoport_id = ? WHERE csoport_id IS NULL`, [defaultGroupId]);
  } catch (e) {
    console.warn('[db] Default group migration error:', e);
  }
}
```

### 9.2 Visszafelé Kompatibilitás

- A régi export fájlok (ID nélkül) továbbra is importálhatók – az ID hiánya új rekordként értelmezendő.
- A `torolt` mező nélküli régi adatbázisok automatikusan migrálódnak.

### 9.3 Teljesítmény

- A `torolt = 0` szűrés minden lekérdezésben – index létrehozása javasolt:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_sofor_torolt ON sofor(torolt);
  CREATE INDEX IF NOT EXISTS idx_gep_torolt ON gep(torolt);
  -- hasonlóan a többi táblára
  ```

---

## 10. Kockázatok és Mérséklésük

| Kockázat | Valószínűség | Hatás | Mérséklés |
|----------|--------------|-------|-----------|
| Meglévő import fájlok nem kompatibilisek | Közepes | Közepes | Alapértelmezett értékek, figyelmeztető üzenetek |
| Soft delete után a lekérdezések lassulhatnak | Alacsony | Alacsony | Indexek létrehozása |
| Felhasználók nem értik az ID-s importot | Közepes | Alacsony | Súgószöveg, tooltip a sablon letöltésnél |
| NULL csoport_id-jű gépek kezelése | Alacsony | Közepes | Automatikus migráció "Egyéb" csoportba |

---

## 11. Következő Lépések

1. **Jóváhagyás** – A terv elfogadása a megrendelő részéről
2. **Fejlesztői környezet beállítása** – Verziókövetés ág létrehozása a változtatásokhoz
3. **Sprint 1 indítása** – Adatmodell migráció és CRUD módosítások
4. **Tesztelés** – Minden sprint után regression teszt

A terv elfogadása esetén a részletes technikai specifikációt és a pontos kódmódosításokat is rendelkezésre bocsátom.