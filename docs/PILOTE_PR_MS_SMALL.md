# Diszpécserrendszer terv

**Cél:** Egy egyszerű, webböngészőben futtatható, szerver nélküli diszpécserrendszer tervezése, amelyben napi tények rögzíthetők és ebből automatikusan előállítható a következő napi tervezés. Első körben az adattárolás alapja SQLite (böngészőben: sql.js + IndexedDB vagy fájlként exportált .sqlite), a felhasználói felület egyszerű HTML/JS/CSS fájlokból áll, amelyekhez nincs szükség webszerverre.

---

## Tartalom

1. Rövid összefoglaló
2. Funkcionális követelmények
3. Technológiai döntések
4. Adatmodell (SQLite séma)
5. Frontend oldalak (offline, fájl alapú HTML-ek)
6. Felhasználói élmény és adatbeviteli folyamatok
7. Import folyamat részletek (Excel -> normalizált DB)
8. Technikai megvalósítás (példák és megfontolások)
9. Architektúrális terv (komponensek és adatáramlás)
10. Implementációs lépések (MVP ütemezés)
11. Példa SQL lekérdezések és export
12. Karbantartás és jövőbeli kiterjesztések

---

## 1. Rövid összefoglaló
A rendszer célja, hogy a havi Excel alapú tervből és a napi tényadatokból egy egységes, megbízható forrást biztosítson a sofőrök/gépes kezelők munkanapjainak követésére és a következő napi tervezéshez. Offline használatot kell támogatnia (helyi fájlok, böngésző), valamint lehetőséget adni az adatok exportjára (.xlsx, .csv, .sqlite) és importjára.

## 2. Funkcionális követelmények

**Főbb szerepek és jogosultságok:**
- Admin: rendszertörzs karbantartása (sofőrök, projektek, gépek), adatimport, export.
- Diszpécser / Operátor: napi tények rögzítése, módosítása, másnapi terv készítése.
- Olvasó: csak megtekintésre jogosult riportoknál.

**Funkciók:**
1. Sofőrök és operátorok törzsadatainak kezelése (egyetlen forrás, aliasok).
2. Projektek/munkák törzsadatainak kezelése (munkaszám, helyszín, megrendelő).
3. Napi munkarendelések rögzítése: egy sor = egy sofőr egy nap egy munkára (géptípus, munkaszám, helyszín, kezdés, befejezés, megjegyzés).
4. Napi tények (teljesített munka) rögzítése: tényóra, feladat státusz, fuvarok száma.
5. Másnapi tervezés automatikus előkészítése a napi tények alapján (másolat / javasolt terv generálás).
6. Import: Excel-ek (havi fájlok) beolvasása és normalizálása (névegységesítés, dátum kinyerés lapnévből).
7. Export: napi kimutatás sofőronként (CSV/XLSX) és teljes adatbázis mentés (.sqlite).
8. Keresés és szűrés: sofőrre, dátumra, munkaszámra, helyszínre.
9. Naplózás és verziózás: fontosabb módosítások rögzítése (ki, mikor, mit módosított).

## 3. Technológiai döntések

**Adatbázis:** SQLite-szerű működés a kliens oldalon: sql.js (SQLite WASM) + IndexedDB perzisztencia. Alternatívaként lehetőség van a felhasználónak letölteni/ feltölteni .sqlite fájlt.

**Frontend:** Tiszta HTML/JS/CSS, egy fájl / oldal per fő funkció (single-file HTML-ek), nincs szükség webszerverre. Modern ES modules használata ajánlott.

**Kiegészítők:**
- sql.js (CDN)
- SheetJS (xlsx) CDN a .xlsx import/export kezelésére
- CSS: egyszerű, reszponzív stílus saját CSS-sel vagy minimal Tailwind CDN-nel

## 4. Adatmodell (SQLite séma)

Alapelvek: normalizáció, auditálhatóság, egyszerű lekérdezhetőség.

### Táblák

1) `sofor`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `teljes_nev` TEXT NOT NULL
- `aliasok` TEXT -- JSON tömb vagy vesszővel elválasztott string
- `belepesi_datum` DATE
- `statusz` TEXT
- `megjegyzes` TEXT
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP

2) `projekt`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `munkaszam` TEXT NOT NULL UNIQUE
- `helyszin` TEXT
- `megrendelo` TEXT
- `leiras` TEXT
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP

3) `gep`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `tipus` TEXT
- `rendszam` TEXT
- `megjegyzes` TEXT
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP

4) `napi_terv`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `datum` DATE NOT NULL
- `sofor_id` INTEGER REFERENCES sofor(id)
- `projekt_id` INTEGER REFERENCES projekt(id)
- `gep_id` INTEGER REFERENCES gep(id)
- `kezdes` TIME NULL
- `vegez` TIME NULL
- `allapot` TEXT
- `megjegyzes` TEXT
- `forras` TEXT -- 'import'/'manuális'
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP

5) `napi_teny`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `datum` DATE NOT NULL
- `sofor_id` INTEGER REFERENCES sofor(id)
- `projekt_id` INTEGER REFERENCES projekt(id)
- `gep_id` INTEGER REFERENCES gep(id)
- `kezd_idopont` DATETIME
- `befejezes_idopont` DATETIME
- `munkaora` REAL
- `fuvarok_szama` INTEGER
- `allapot` TEXT
- `megjegyzes` TEXT
- `forras` TEXT
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP

6) `valtozas_log`
- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `tabla` TEXT
- `rekord_id` INTEGER
- `muvelet` TEXT
- `felhasznalo` TEXT
- `idopont` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- `leiras` TEXT

## 5. Frontend oldalak

A következő HTML fájlok javasoltak, mindegyik self-contained (HTML+CSS+JS):
- `index.html` — Dashboard
- `soforok.html` — Sofőrök kezelése
- `projektek.html` — Projektek kezelése
- `gepek.html` — Gépek kezelése
- `napi_rogzites.html` — Napi tények rögzítése
- `napi_tervezes.html` — Másnapi tervezés
- `import_export.html` — Import/Export eszközök
- `settings.html` — Beállítások

Minden oldal a sql.js wrapperen keresztül kommunikál az SQLite adatbázissal a memóriában. A mentést/ betöltést IndexedDB-vel vagy .sqlite fájl letöltéssel oldjuk meg.

## 6. Felhasználói élmény és adatbeviteli folyamatok

- Autocomplete mezők: sofőr/projekt/gép autocompletion a törzsadatokból.
- Alias egyeztetés: import során javaslat a név-matchingre; admin jóváhagyás.
- Hibajelzés és validáció: kötelező mezők ellenőrzése, duplikátum figyelmeztetés.
- Gyors mentés + autosave.

## 7. Import folyamat részletek

Lépések:
1. Feltöltés: a felhasználó feltölti a havi Excel fájlt.
2. Beolvasás SheetJS-sel: minden sheet olvasása.
3. Dátum kinyerése: sheet név -> datum.
4. Sorok normalizálása: minden sor egy rekord lesz `napi_terv` vagy `napi_teny` táblában.
5. Név egyeztetés: aliasok és fuzzy matching (lowercase + ékezet eltávolítás + whitespace trim) alapján javaslat.
6. Felhasználói jóváhagyás: amennyiben találatok nem egyértelműek.

## 8. Technikai megvalósítás

### sql.js + IndexedDB
- sql.js init: let SQL = await initSqlJs({ locateFile: filename => 'https://cdnjs.cloudflare.com/.../sql-wasm.wasm' });
- DB létrehozása memóriában: const db = new SQL.Database();
- Mentés: const binaryArray = db.export(); // majd IndexedDB-be vagy .sqlite letöltés

### SheetJS a beolvasáshoz és exporthoz
- XLSX.read(file, {type:'binary'})
- Sheet-ek feldolgozása, sorok JSON-be konvertálása

### Autocomplete és UI
- Vanilla JS vagy nagyon kis library (pl. autoComplete.js) CDN-ről.

## 9. Architektúrális terv (komponensek és adatáramlás)

Komponensek:
- UI (statikus HTML+JS)
- DB réteg (sql.js wrapper)
- Import/Export modul (SheetJS)
- Persistencia (IndexedDB wrapper)
- Audit log modul

Adatáramlás:
1. Felhasználó megnyitja az index.html fájlt.
2. A JS inicializálja az sql.js adatbázist: betölti a mentett állapotot IndexedDB-ből, vagy létrehoz egy új DB-t.
3. Felhasználó importál Excel fájlokat → SheetJS feldolgozza → JS script normalizálja → DB-be írja.
4. A napi_rogzites.html oldalon a diszpécser beviszi a tényeket → napi_teny-be mentődik → valtozas_log rögzíti.
5. A napi_tervezes.html oldal lekérdezi a tegnapi napi_teny rekordokat és javaslatot generál másnapi napi_terv-re.

## 10. Implementációs lépések (MVP ütemezés)

1. **Séma és DB wrapper implementálása** (2-3 nap)
   - sql.js integráció, init script, CRUD függvények
2. **Törzsadat oldalak** (soforok/projektek/gepek) (2-3 nap)
   - listázás, szerkesztés, alias kezelés
3. **Napi rögzítés oldal** (3-4 nap)
   - űrlap, autocomplete, mentés napi_teny-be
4. **Import/Export modul** (4-5 nap)
   - SheetJS alapú import, alias matching, export CSV/XLSX/.sqlite
5. **Napi tervezés modul** (2-3 nap)
   - előkészítő logika: tegnapi tényekből javaslat másnapi tervre
6. **Dashboard és riportok** (2-3 nap)
7. **Tesztelés és dokumentáció** (3-4 nap)

## 11. Példa SQL lekérdezések és export

1) Sofőr napi munkái adott időszakban:
```sql
SELECT s.teljes_nev, n.datum, p.munkaszam, p.helyszin, g.tipus
FROM napi_teny n
JOIN sofor s ON n.sofor_id = s.id
LEFT JOIN projekt p ON n.projekt_id = p.id
LEFT JOIN gep g ON n.gep_id = g.id
WHERE n.datum BETWEEN '2026-03-01' AND '2026-04-30'
ORDER BY s.teljes_nev, n.datum;
```

2) Másnapi javasolt terv generálása (példa logika): a tegnapi napi_teny rekordokat másoljuk a napi_terv táblába dátummódosítással:
```sql
INSERT INTO napi_terv (datum, sofor_id, projekt_id, gep_id, allapot, forras)
SELECT DATE(n.datum, '+1 day'), n.sofor_id, n.projekt_id, n.gep_id, 'javasolt', 'auto'
FROM napi_teny n
WHERE n.datum = DATE('now','-1 day');
```

## 12. Karbantartás és jövőbeli kiterjesztések

- Szerveres szinkronizáció REST API-val (auth), ha több felhasználó egyszerre használja.
- SMS/Email értesítések a sofőröknek a tervezett munkákról.
- Mobilbarát UI vagy PWA, offline sync.
- Részletes riportok: munkaszám szerinti óraszámok, fuvarok, költségszámítás.

---


- Fuzzy matching javaslat: lowercase, strip diacritics (ékezetek), trim, remove punctuation, compare by token similarity.


---
