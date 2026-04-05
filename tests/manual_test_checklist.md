# Pilot Erőforrás — Manuális Tesztelési Ellenőrző Lista

**Alkalmazás:** Pilot Erőforrás (böngészőalapú flottakezelő)
**Fájlok helye:** `src/`
**Tesztelési módszer:** Manuális, böngészőben (Chrome / Firefox)
**Utolsó frissítés:** 2026-04-05

---

## Hogyan használd ezt a listát

Minden tesztlépésnél jelöld meg az eredményt:
- `[x]` — Átment (a várt viselkedés megfigyelhető)
- `[!]` — Hibát talált (írd le a tényleges viselkedést)
- `[-]` — Nem releváns / kihagyva

---

## 1. BEÁLLÍTÁSOK — Felhasználói azonosító (settings.html)

### TC-S-01: Felhasználói azonosító sikeres mentése
**Előfeltétel:** A settings.html meg van nyitva
**Lépések:**
1. Töltsd be: `src/settings.html`
2. A "Név" mezőbe írj be egy nevet (pl. "Kiss János")
3. A "Szerepkör" legördülőből válassz "Diszpécser"-t
4. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] A "Mentve!" felirat megjelenik a gomb mellett
- [ ] A felirat ~2 másodperc után eltűnik
- [ ] A sidebar alján a felhasználónév frissül erre: "Kiss János"
- [ ] Az oldal újratöltése után a mezők az elmentett értékeket mutatják

---

### TC-S-02: Üres névvel mentés — alapértelmezett névhasználat
**Előfeltétel:** settings.html nyitva
**Lépések:**
1. Töröld a "Név" mező tartalmát (hagyd üresen)
2. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] A mentés megtörténik (nincs hibaüzenet)
- [ ] A sidebar "Ismeretlen" feliratot mutat
- [ ] localStorage-ban `dispatcher_identity.name === "Ismeretlen"`

---

### TC-S-03: Adatbázis alaphelyzetbe állítás — modális megerősítés
**Előfeltétel:** Van legalább egy sofőr, projekt vagy gép rögzítve
**Lépések:**
1. Kattints a "Törlés" gombra az "Adatbázis alaphelyzetbe állítása" sornál
2. Megjelenik a megerősítő modal
3. Kattints a "Mégsem" gombra

**Várt eredmény:**
- [ ] A modal megjelenik
- [ ] "Mégsem" hatására a modal bezárul, az adatbázis változatlan marad
- [ ] A háttérre kattintás szintén bezárja a modalt

---

### TC-S-04: Adatbázis alaphelyzetbe állítás — végrehajtás
**Előfeltétel:** Van legalább egy rekord az adatbázisban
**Lépések:**
1. Kattints a "Törlés" gombra
2. Kattints az "Igen, törlöm" gombra a modalban

**Várt eredmény:**
- [ ] A modal bezárul
- [ ] "Adatbázis törölve." visszajelzés megjelenik zölden
- [ ] A sofőrök, projektek, gépek listái üresek lesznek

---

### TC-S-05: Érvénytelen .sqlite fájl visszaállítása
**Előfeltétel:** Készíts egy egyszerű szöveges fájlt `.sqlite` kiterjesztéssel (pl. "nem_valid.sqlite"), melynek tartalma csak szöveg
**Lépések:**
1. Kattints a "Feltöltés" gombra az "Adatbázis visszaállítása" sornál
2. Válaszd ki az érvénytelen .sqlite fájlt

**Várt eredmény:**
- [ ] Megjelenik egy hibaüzenet pirossal: "Hiba a visszaállítás során: Hibás .sqlite fájl..."
- [ ] Az adatbázis változatlan marad (a korábbi adatok elérhetők)
- [ ] A böngésző konzolban `[db] importDB: corrupt SQLite fájl:` üzenet látható

---

## 2. TÖRZSADATOK — Sofőrök (soforok.html)

### TC-D-01: Új sofőr létrehozása — sikeres
**Lépések:**
1. Nyisd meg: `src/soforok.html`
2. Kattints az "+ Új sofőr" gombra
3. A "Teljes név" mezőbe írd: "Kovács Péter"
4. Státusz: "Aktív"
5. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] A form panel bezárul
- [ ] Az "Összes" lista tartalmazza "Kovács Péter"-t
- [ ] Az "Aktív" számláló 1-gyel nő
- [ ] A fejlécben az összes sofőr száma frissül

---

### TC-D-02: Sofőr létrehozása kötelező mező nélkül
**Lépések:**
1. Kattints az "+ Új sofőr" gombra
2. Hagyd üresen a "Teljes név" mezőt
3. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] A mentés NEM történik meg
- [ ] A "Teljes név" mező piros kerettel jelölt lesz
- [ ] "A teljes név megadása kötelező." hibaüzenet megjelenik a mező alatt
- [ ] A form panel nyitva marad

---

### TC-D-03: Sofőr szerkesztése
**Előfeltétel:** Létezik legalább egy sofőr
**Lépések:**
1. Kattints a ceruza ikonra egy aktív sofőr sorában
2. Módosítsd a nevét (pl. "Kovács Péter Zoltán"-ra)
3. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] A lista a frissített nevet mutatja
- [ ] Az `updated_at` mező frissült (a crud-test.html-en ellenőrizhető)

---

### TC-D-04: Sofőr törlése
**Előfeltétel:** Létezik legalább egy sofőr
**Lépések:**
1. Kattints a szemetes ikonra egy aktív sofőr sorában
2. Az alert megerősítőben kattints "OK"-ra

**Várt eredmény:**
- [ ] A sofőr eltűnik a listából
- [ ] A számlálók csökkennek

---

### TC-D-05: Alias hozzáadása sofőrhöz
**Lépések:**
1. Nyiss meg egy sofőr szerkesztő formját
2. Az "Aliasok / becénevek" mezőbe írj be "KP"-t
3. Nyomj Entert

**Várt eredmény:**
- [ ] A "KP" alias megjelenik egy badge-ként a listában
- [ ] Az X gombra kattintva az alias eltávolítható
- [ ] Mentés után az alias sorszáma megjelenik a táblázatban

---

### TC-D-06: Szűrő tabok működése
**Előfeltétel:** Van aktív és inaktív sofőr is
**Lépések:**
1. Kattints az "Aktív" tabra
2. Kattints az "Inaktív" tabra
3. Kattints az "Összes" tabra

**Várt eredmény:**
- [ ] Minden tab csak a megfelelő státuszú sofőröket mutatja
- [ ] A számlálók helyesen tükrözik a szűrt darabszámokat
- [ ] Az aktív tab vizuálisan kiemelten jelenik meg

---

## 3. TÖRZSADATOK — Projektek (projektek.html)

### TC-P-01: Új projekt létrehozása — sikeres
**Lépések:**
1. Nyisd meg: `src/projektek.html`
2. Kattints az "+ Új projekt" gombra
3. A "Munkaszám" mezőbe írd: "P-2026-001"
4. Helyszín: "Budapest"
5. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] A projekt megjelenik a listában "P-2026-001" munkaszámmal
- [ ] A fejlécszámláló 1-gyel nő

---

### TC-P-02: Duplikált munkaszám — hiba
**Előfeltétel:** Létezik "P-2026-001" munkaszámú projekt
**Lépések:**
1. Kattints az "+ Új projekt" gombra
2. A "Munkaszám" mezőbe írd: "P-2026-001" (ugyanaz)
3. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] Hibaüzenet jelenik meg (alert vagy form szintű hiba)
- [ ] Az SQLite UNIQUE constraint megsértésének jelzése látható
- [ ] A duplikált rekord NEM kerül a listába

---

## 4. TÖRZSADATOK — Gépek (gepek.html)

### TC-G-01: Új gép létrehozása — sikeres
**Lépések:**
1. Nyisd meg: `src/gepek.html`
2. Kattints az "+ Új gép" gombra
3. Típus: "Tehergépkocsi"
4. Rendszám: "ABC-123"
5. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] A gép megjelenik a listában
- [ ] A rendszám és típus helyesen jelenik meg

---

### TC-G-02: Gép minden mező nélkül
**Lépések:**
1. Kattints az "+ Új gép" gombra
2. Hagyj minden mezőt üresen
3. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] A gép rekord létrejön (a `gep` táblában nincs NOT NULL kényszer típusnál/rendszámnál)
- [ ] A lista "—" vagy üres értékeket mutat az üres mezőknél

---

## 5. NAPI RÖGZÍTÉS (napi_rogzites.html)

### TC-R-01: Napi tény rögzítése — teljes happy path
**Előfeltétel:** Van legalább egy sofőr, projekt és gép
**Lépések:**
1. Nyisd meg: `src/napi_rogzites.html`
2. Ellenőrizd, hogy a mai dátum látható a dátum pill-ben
3. Kattints az "+ Új sor hozzáadása" gombra
4. A sofőr mezőbe írd be egy létező sofőr nevét
5. A projekt mezőbe írd be egy létező munkaszámot
6. A gép mezőbe írd be egy létező gépet
7. Kezdés: "07:00", Befejezés: "15:00"
8. Fuvar: "5"
9. Kattints a "Mentés" gombra (jobb felső sarok)

**Várt eredmény:**
- [ ] A sor szerkesztési módból "done" (pipa badge) állapotba kerül
- [ ] A munkaóra automatikusan "8.00"-t mutat
- [ ] A progress bar frissül (pl. "1 / 1 rögzítve")
- [ ] Mentés után a rekord megjelenik az adott napra ismételt betöltéskor is

---

### TC-R-02: Dátumnavigáció
**Lépések:**
1. Kattints a bal nyíl (<) gombra
2. Kattints a jobb nyíl (>) gombra kétszer

**Várt eredmény:**
- [ ] A dátum pill napra pontosan lép vissza/előre
- [ ] A napnév helyesen frissül (hétfő, kedd, stb.)
- [ ] A mai napnál "(ma)" felirat jelenik meg
- [ ] Más napra váltáskor az adott nap rekordjai töltődnek be

---

### TC-R-03: Munkaóra automatikus számítása
**Lépések:**
1. Adj hozzá új sort
2. Kezdés mezőbe: "08:30"
3. Befejezés mezőbe: "12:00"

**Várt eredmény:**
- [ ] Az "Óra" oszlopban azonnal "3.50" jelenik meg (3 óra 30 perc)
- [ ] Befejezés mező ürítésekor "—" jelenik meg

---

### TC-R-04: Sor törlése rögzítés közben
**Előfeltétel:** Van legalább egy szerkesztés alatt lévő sor
**Lépések:**
1. Kattints a piros X gombra a sor jobb szélén

**Várt eredmény:**
- [ ] Ha a sornak még nincs adatbázis-azonosítója: törlés megerősítés nélkül
- [ ] Ha van mentett rekord: megerősítő confirm megjelenik
- [ ] A sor eltűnik a listából

---

## 6. NAPI TERVEZÉS (napi_tervezes.html)

### TC-T-01: Napi terv létrehozása és jóváhagyása
**Előfeltétel:** Van legalább egy sofőr és projekt
**Lépések:**
1. Nyisd meg: `src/napi_tervezes.html`
2. Kattints a "Javaslat generálása" gombra
3. Az előző nap adatai alapján javaslat jelenik meg
4. Egy sor "OK" gombjára kattintva fogadd el
5. Kattints a "Mentés" gombra

**Várt eredmény:**
- [ ] Az elfogadott sor állapota "elfogadott"-ra vált (zöld badge)
- [ ] Az összefoglaló sávban az "Elfogadva" számláló nő
- [ ] Mentés után a rekord `allapot = 'elfogadott'` értékkel mentődik

---

### TC-T-02: Terv elutasítása ("Nem" gomb)
**Lépések:**
1. Egy javasolt sor "Nem" gombjára kattints

**Várt eredmény:**
- [ ] A sor állapota "elutasítva"-ra vált (piros badge)
- [ ] Az "Elutasítva" számláló nő

---

### TC-T-03: Összefoglaló sáv helyessége
**Lépések:**
1. Tölts be napot, amelyen van 2 elfogadott, 1 elutasított és 1 várakozó terv

**Várt eredmény:**
- [ ] A sáv pontosan `Várakozó: 1 | Elfogadva: 2 | Módosítva: 0 | Elutasítva: 1` értékeket mutat

---

## 7. IMPORT / EXPORT (import_export.html)

### TC-E-01: Export gombok megléte és kattinthatósága
**Lépések:**
1. Nyisd meg: `src/import_export.html`
2. Ellenőrizd, hogy az export kártyák megjelennek

**Várt eredmény:**
- [ ] Látható legalább egy export gomb (pl. "Exportálás Excel-be" vagy hasonló)
- [ ] A gombok kattinthatók (nem disabled állapotban)
- [ ] Üres adatbázisnál is megjelennek az export opciók

---

### TC-E-02: Excel import — üres fájl
**Előfeltétel:** Készíts egy teljesen üres `.xlsx` fájlt
**Lépések:**
1. A drop zone-ra húzd az üres Excel fájlt, VAGY kattints a "böngészés" linkre és válaszd ki
2. A rendszer feldolgozza a fájlt

**Várt eredmény:**
- [ ] Hibaüzenet VAGY "0 sor feldolgozva" visszajelzés jelenik meg
- [ ] Az alkalmazás NEM fagy le és NEM dob kezeletlen kivételt
- [ ] Az adatbázis tartalma változatlan marad

---

### TC-E-03: Excel import — érvényes fájl
**Előfeltétel:** Készíts egy Excel fájlt az elvártnak megfelelő oszlopokkal és legalább 2 adatsorral
**Lépések:**
1. Importáld a fájlt
2. Ellenőrizd az előnézeti táblázatot

**Várt eredmény:**
- [ ] A sheet-választó megjelenik (ha több sheet van)
- [ ] A review táblázat megmutatja az egyező/ismeretlen sofőrök match-eredményét
- [ ] A color coding helyes: zöld = pontos egyezés, sárga = fuzzy, piros = ismeretlen

---

### TC-E-04: Adatbázis visszaállítás érvényes .sqlite fájlból
**Előfeltétel:** Van egy korábban exportált érvényes .sqlite fájl
**Lépések:**
1. Menj a Settings oldalra
2. Kattints a "Feltöltés" gombra
3. Válaszd ki az érvényes .sqlite fájlt

**Várt eredmény:**
- [ ] "Az adatbázis sikeresen visszaállítva." üzenet zölden megjelenik
- [ ] A sofőrök/projektek/gépek listái az importált adatokat mutatják

---

## 8. DASHBOARD (index.html)

### TC-DAS-01: KPI csempék adattal rendelkeznek
**Előfeltétel:** Van legalább 1 napi_terv és 1 napi_teny rekord a mai napra
**Lépések:**
1. Nyisd meg: `src/index.html`
2. Ellenőrizd a KPI csempéket (szám értékek, nem "0" vagy "—")

**Várt eredmény:**
- [ ] A csempék valós számokat mutatnak (nem placeholder értékeket)
- [ ] A Plan vs Actual táblázat sorai megjelennek a mai dátumhoz

---

### TC-DAS-02: Dátumszűrő működése
**Lépések:**
1. Kattints a dátumválasztóra a filter sávban
2. Válassz egy múltbeli napot, amelyre van adat

**Várt eredmény:**
- [ ] A megjelenített adatok az adott napra vonatkoznak
- [ ] A Plan vs Actual tábla frissül

---

### TC-DAS-03: Keresés sofőr névre
**Előfeltétel:** Több sofőr adata látható a táblázatban
**Lépések:**
1. A keresőmezőbe írd be egy sofőr nevének első néhány betűjét

**Várt eredmény:**
- [ ] A táblázat szűkül, csak az egyező sofőr(ok) sorát mutatja
- [ ] Keresőmező törlése után minden sor újra megjelenik

---

## 9. NAVIGÁCIÓ ÉS ÁLTALÁNOS UI

### TC-NAV-01: Sidebar navigáció minden oldalon
**Lépések:**
1. Minden oldalon kattintsd végig a sidebar összes nav elemét

**Várt eredmény:**
- [ ] Minden link megfelelő oldalra navigál
- [ ] Az aktív oldal nav eleme vizuálisan ki van emelve (`.nav-item.active`)
- [ ] Oldalbetöltési hibák nem jelennek meg (Console: 0 piros error)

---

### TC-NAV-02: Sidebar felhasználónév megjelenik
**Előfeltétel:** Beállítások oldalon elmentett felhasználónév
**Lépések:**
1. Navigálj bármelyik oldalra

**Várt eredmény:**
- [ ] A sidebar alján a beállított felhasználónév jelenik meg (nem "—")

---

### TC-NAV-03: IndexedDB perzisztencia oldalbetöltés után
**Lépések:**
1. Hozz létre egy sofőrt, projektet és gépet
2. Zárd be a böngészőfület
3. Nyisd meg újra ugyanazt az oldalt

**Várt eredmény:**
- [ ] A korábban felvitt adatok megmaradnak (IndexedDB-ből visszatöltve)
- [ ] Sem az adatok, sem az adatbázis séma nem veszett el

---

## 10. AUDIT LOG ELLENŐRZÉSE

### TC-LOG-01: Változásnapló bejegyzések ellenőrzése
**Eszköz:** `src/crud-test.html` vagy böngésző konzol
**Lépések:**
1. Hozz létre egy sofőrt, majd frissítsd, majd töröld
2. Ellenőrizd a `valtozas_log` táblát

**Várt eredmény:**
- [ ] 3 bejegyzés keletkezett: INSERT, UPDATE, DELETE
- [ ] A `felhasznalo` mező a beállított felhasználónevet mutatja (nem "Ismeretlen")
- [ ] A `leiras` mező emberi olvasható szöveget tartalmaz

---

## Hibajegyzék

| # | TC azonosító | Leírás | Súlyosság | Dátum |
|---|-------------|--------|-----------|-------|
|   |             |        |           |       |

**Súlyossági szintek:**
- **KRITIKUS** — Az alkalmazás használhatatlan, adatvesztés lehetséges
- **MAGAS** — Fő funkció nem működik
- **KÖZEPES** — Mellékfunkció nem működik, kerülőút lehetséges
- **ALACSONY** — UI/UX zavar, funkcionalitást nem érinti
