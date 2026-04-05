# Pilot Erőforrás — Felhasználói kézikönyv

**Verzió:** 1.0
**Alkalmazás:** Pilot Erőforrás (böngészőalapú flottakezelő)
**Technológia:** Vanilla JS / HTML, sql.js (WASM SQLite), IndexedDB, SheetJS

---

## Tartalomjegyzék

1. [Az alkalmazásról](#1-az-alkalmazásról)
2. [Első indítás — beállítások](#2-első-indítás--beállítások)
3. [Törzsadatok felvitele](#3-törzsadatok-felvitele)
   - 3.1 [Sofőrök](#31-sofőrök)
   - 3.2 [Projektek](#32-projektek)
   - 3.3 [Gépek](#33-gépek)
4. [Napi tényadat rögzítése](#4-napi-tényadat-rögzítése)
5. [Napi tervjavaslat készítése és jóváhagyása](#5-napi-tervjavaslat-készítése-és-jóváhagyása)
6. [Excel import munkafolyamat](#6-excel-import-munkafolyamat)
7. [Adatok exportálása](#7-adatok-exportálása)
8. [Dashboard használata és KPI-k értelmezése](#8-dashboard-használata-és-kpi-k-értelmezése)

---

## 1. Az alkalmazásról

A Pilot Erőforrás egy böngészőalapú flottakezelő alkalmazás, amely **internetkapcsolat nélkül** is működik. Az adatok kizárólag a böngészőben tárolódnak (IndexedDB), szerverre semmi nem kerül fel. Az alkalmazást egy statikus webszerveren (pl. VS Code Live Server) kell megnyitni — egyszerűen a fájlrendszerből, `file://` protokollal történő megnyitás esetén egyes böngésző-biztonsági korlátozások miatt az ES modul-betöltés nem működik.

### Navigáció

A bal oldali sávban (sidebar) találhatók az oldalak:

| Menüpont | Oldal | Leírás |
|---|---|---|
| Dashboard | `index.html` | Napi terv-tény páros nézet és KPI-k |
| Sofőrök | `soforok.html` | Sofőrtörzs kezelése |
| Projektek | `projektek.html` | Projekttörzs kezelése |
| Gépek | `gepek.html` | Géptörzs kezelése |
| Napi rögzítés | `napi_rogzites.html` | Tényleges munkavégzés rögzítése |
| Napi tervezés | `napi_tervezes.html` | Tervjavaslatok összeállítása és jóváhagyása |
| Import / Export | `import_export.html` | Excel import, CSV/XLSX/SQLite export |
| Beállítások | `settings.html` | Felhasználói azonosító és adatbázis-kezelés |

A sidebar alján mindig látható az aktuálisan beállított felhasználónév.

---

## 2. Első indítás — beállítások

Első használat előtt ajánlott beállítani a felhasználói azonosítót, mert ez jelenik meg a változásnaplóban minden adatmódosításnál.

### Felhasználói azonosító beállítása

1. Kattints a **Beállítások** menüpontra (`settings.html`).
2. A **Felhasználói azonosító** kártyán töltsd ki a **Név** mezőt (pl. `Kiss János`).
3. Válassz **Szerepkört** a legördülőből:
   - **Diszpécser** — napi beosztás tervezése és rögzítése
   - **Admin** — teljes hozzáférés, adatbázis-műveletek
   - **Olvasó** — csak megtekintés
4. Kattints a **Mentés** gombra. A visszajelzés: `Mentve!` felirat jelenik meg 2 másodpercre.

> **Megjegyzés:** A beállítás a böngésző `localStorage`-ban tárolódik (`dispatcher_identity` kulcson). Böngésző-adatok törlésekor elvész — ebben az esetben az alapértelmezett érték `Ismeretlen / Diszpécser` lesz.

### Adatbázis állapota első indításkor

Ha még nincs mentett adatbázis (pl. első böngésző-megnyitás), az alkalmazás automatikusan létrehozza az üres adatbázis-sémát. A konzolban (`F12 → Console`) a `[db] Új adatbázis létrehozva.` üzenet jelenik meg. Ezt követően már elvégezhető a törzsadatok felvitele.

---

## 3. Törzsadatok felvitele

A napi rögzítés és tervezés előfeltétele, hogy legyenek felrögzítve a sofőrök, projektek és gépek. A sorrend tetszőleges, de célszerű a sofőrökkel kezdeni, mivel az Excel-import is ezekhez egyezteti a neveket.

### 3.1 Sofőrök

**Oldal:** `soforok.html`

#### Új sofőr felvitele

1. Kattints az **+ Új sofőr** gombra (jobb felső sarok).
2. Az oldalsó panelen töltsd ki a mezőket:
   - **Teljes név** *(kötelező)* — pl. `Nagy Gábor`
   - **Státusz** — `Aktív` vagy `Inaktív`
   - **Aliasok / becénevek** — az Excel-importnál erre alapozza a fuzzy egyeztetést (ld. [6. fejezet](#6-excel-import-munkafolyamat))
3. Alias hozzáadásához gépeld be az alias szöveget az **Új alias** mezőbe, majd nyomj **Enter**-t. Egy sofőrhöz több alias is megadható.
4. Kattints a **Mentés** gombra.

#### Sofőr szerkesztése és törlése

- A sor jobb szélén lévő ceruza ikonra kattintva megnyílik a szerkesztő panel.
- A kuka ikonra kattintva a rendszer megerősítést kér (`Biztosan törli ezt a sofőrt?`), majd törli a rekordot.
- Inaktív sofőröknél mindkét ikon halványított és nem kattintható.

#### Szűrés és keresés

- Az **Összes / Aktív / Inaktív** tabok szűrik a listát státusz szerint.
- A **Keresés névben...** mezőben gépelve valós időben szűr a `teljes_nev` mező tartalmára (kis-nagybetű érzéketlen).

#### Aliasok szerepe

Az `aliasok` mező JSON-tömbként tárolódik az adatbázisban (pl. `["Gabi","Nagy G."]`). Az Excel-import (`import.js` → `matchSofor()`) ezeket a neveket is figyelembe veszi az egyeztetésnél. Ha az importált Excel-sorban `Nagy Gábor` helyett `Gabor Nagy` szerepel, a rendszer automatikusan fuzzy egyeztetést végez, és ha elfogadod, az alias el is mentődik.

---

### 3.2 Projektek

**Oldal:** `projektek.html`

#### Új projekt felvitele

1. Kattints az **+ Új projekt** gombra.
2. Töltsd ki a mezőket:

   | Mező | Kötelező | Leírás |
   |---|---|---|
   | `munkaszam` | Igen | Egyedi munkaszám / azonosító (pl. `2024-M-001`) |
   | `helyszin` | Nem | Munkavégzés helye |
   | `megrendelo` | Nem | Megrendelő neve |
   | `leiras` | Nem | Szabad szöveges leírás |

3. Kattints a **Mentés** gombra.

> **Fontos:** A `munkaszam` mező értékének **egyedinek** kell lennie az adatbázisban. Duplikált munkaszám esetén a mentés hibával tér vissza.

---

### 3.3 Gépek

**Oldal:** `gepek.html`

#### Új gép felvitele

1. Kattints az **+ Új gép** gombra.
2. Töltsd ki a mezőket:

   | Mező | Leírás |
   |---|---|
   | `tipus` | Gép típusa (pl. `daru`, `tehergépkocsi`) |
   | `rendszam` | Rendszám (pl. `ABC-123`) |
   | `megjegyzes` | Egyéb megjegyzés |

3. Kattints a **Mentés** gombra.

---

## 4. Napi tényadat rögzítése

**Oldal:** `napi_rogzites.html`

Ezen az oldalon rögzíthetők a ténylegesen elvégzett munkák (napi_teny tábla). Az oldal az aktuális napot nyitja meg alapértelmezetten.

### Dátumnavigáció

- A fejlécben lévő **◀ / ▶** nyilakkal lehet léptetni a napot.
- A zöld keretű dátumcímke (`.date-pill`) mutatja az aktuális napot és a nap nevét; ha a mai napot nézed, `(ma)` felirat is megjelenik.

### Sor állapotai

Minden sor három állapot egyikében lehet:

| Állapot | Vizuális jelzés | Leírás |
|---|---|---|
| `done` (zöld) | Zöld körös számjegy | Az összes kötelező mező kitöltve és mentve |
| `editing` (szürke) | Szürke körös szám | Aktívan szerkesztés alatt |
| `incomplete` (piros) | Piros `!` jel | A sor még nincs teljesen kitöltve |

### Új sor felvitele

1. Kattints az **Új sor hozzáadása** gombra (alsó szaggatott keret).
2. A sor szerkesztő módba lép. Töltsd ki a mezőket — az autocomplete a törzsadatokból javaslatokat ad:

   | Oszlop | Mező | Leírás |
   |---|---|---|
   | Sofőr | `sofor_id` | Sofőr neve (autocomplete: aktív sofőrök) |
   | Projekt / munkaszám | `projekt_id` | Projekt munkaszáma (autocomplete) |
   | Gép | `gep_id` | Rendszám (autocomplete) |
   | Kezdés | `kezd_idopont` | `HH:MM` formátum |
   | Befejezés | `befejezes_idopont` | `HH:MM` formátum |
   | Óra | `munkaora` | Automatikusan számolódik a kezdés/befejezés alapján |
   | Fuvar | `fuvarok_szama` | Egész szám |
   | Megjegyzés | `megjegyzes` | Szabad szöveg |

3. A sor automatikusan kiszámítja a munkaidőt (`munkaora`) a kezdés és befejezés különbsége alapján.

### Mentés

- A **Mentés** gomb (jobb felső sarok) az összes módosított sort egyszerre menti az adatbázisba és IndexedDB-be.
- A fejlécben a progress sáv (`X / Y rögzítve`) mutatja, hogy az összes sor közül mennyi van `done` állapotban.

### Meglévő sor szerkesztése

A sor bármely cellájára kattintva szerkesztő módba lép. A módosítás a **Mentés** gombbal véglegesíthető.

### Sor törlése

A sor végén lévő kuka ikonra kattintva a rekord törlődik. Ha az adatbázisban már mentett rekordhoz tartozik, az adatbázisból is törlésre kerül.

---

## 5. Napi tervjavaslat készítése és jóváhagyása

**Oldal:** `napi_tervezes.html`

A Napi tervezés oldalon a diszpécser előzetesen megtervezi a másnapi beosztást. A tervrekordok a `napi_terv` táblában tárolódnak `allapot` mezővel.

### Állapotok

| Állapot (`allapot`) | Szín | Leírás |
|---|---|---|
| `javasolt` (Várakozó) | Szürke pont | Generált vagy manuálisan felvett javaslat, még nem bírálták el |
| `elfogadott` | Zöld sor | Jóváhagyott terv |
| módosítva | Sárga sor | Elfogadva, de értékek módosultak |
| elutasítva | Piros (halványított) sor | Elutasított terv |

### Dátumnavigáció és forrásnapot-jelző

A fejlécben a dátumnyilakkal más napra lehet navigálni. A `Forrás: ÉÉÉÉ-HH-NN` felirat mutatja, melyik napból töltötte be a rendszer az előző nap terveit a javaslat-generáláshoz.

### Tervjavaslat automatikus generálása

1. Kattints a **Javaslat generálása** gombra.
2. A rendszer az előző nap beosztását veszi alapul, és az összes aktív sofőrre létrehoz egy `javasolt` állapotú tervsort az aktuális napra.
3. A generált sorok megjelennek a táblázatban.

### Manuális terv felvitele

1. Kattints az **Új sor hozzáadása** gombra.
2. Töltsd ki a sorban az oszlopokat (Sofőr, Projekt, Gép, Kezdés, Befejezés, Megjegyzés).
3. Az újonnan felvett sor `javasolt` (`forras: 'manualis'`) állapotban kerül mentésre.

### Sorok jóváhagyása és elutasítása

Minden sor végén egy akciógomb-csoport látható:

- **Elfogad** (zöld pipa ikon) — a sor `allapot` értékét `elfogadott`-ra állítja
- **Elutasít** (piros X ikon) — a sor `allapot` értékét `torolt`-ra állítja, a sor elhalványul
- **Szerkeszt** (ceruza ikon) — szerkesztő módba lépteti a sort, ahol a mezők módosíthatók

### Összefoglaló sáv

Az oldal tetején lévő összefoglaló sáv (`summary-bar`) folyamatosan mutatja az aktuális naphoz tartozó sorok állapot szerinti eloszlását:

- **Várakozó** — `javasolt` sorok száma
- **Elfogadva** — `elfogadott` sorok száma
- **Módosítva** — módosított, de elfogadott sorok száma
- **Elutasítva** — `torolt` sorok száma

### Mentés

A **Mentés** gomb az összes változtatást egyszerre írja az adatbázisba és IndexedDB-be.

---

## 6. Excel import munkafolyamat

**Oldal:** `import_export.html` — *Excel import* szekció

Az Excel-import az előre elkészített beosztási táblázatokat importálja a `napi_terv` táblába. A folyamat három lépésből áll.

### Az Excel-fájl formai követelményei

- Formátum: `.xlsx` vagy `.xls`
- Az adatok sheet-enként (munkalapok) vannak rendezve
- A sheet neve tartalmazza a dátumot (ld. alább)
- Minden sorban legyen **sofőrnév** — az üres sofőrnevű sorok kihagyásra kerülnek

#### Elvárt oszlopnevek (rugalmas felismerés)

Az import a következő oszlopneveket ismeri fel (ékezetes és ékezet nélküli, kis- és nagybetű érzéketlen):

| Adatmező | Elfogadott oszlopnevek |
|---|---|
| Sofőrnév | `sofor`, `sofőr`, `nev`, `név`, `driver`, `name` |
| Munkaszám | `munkaszam`, `munkaszám`, `project`, `projekt`, `munka` |
| Gép rendszáma | `gep`, `gép`, `rendszam`, `rendszám`, `truck` |
| Kezdési időpont | `kezdes`, `kezdés`, `start`, `tol`, `től` |
| Befejezési időpont | `vegez`, `végez`, `end`, `ig`, `befejez` |
| Megjegyzés | `megjegyzes`, `megjegyzés`, `note`, `comment` |

#### Dátum felismerés sheet névből

A rendszer automatikusan felismeri a dátumot a sheet névből a következő formátumokban:

| Példa sheet-név | Felismert dátum |
|---|---|
| `2026.03.15` | 2026-03-15 |
| `2026-03-15` | 2026-03-15 |
| `15.03.2026` | 2026-03-15 |
| `03.15` | aktuális év + 03-15 |
| `március 15` | aktuális év + 03-15 |
| `márc.15` | aktuális év + 03-15 |

Ha a dátum nem ismerhető fel, az importálás folytatható, de az előnézet táblázatban a dátum mező üres marad — ilyenkor kézzel kell megadni.

### Lépések

#### 1. lépés — Excel fájl feltöltése

1. Nyisd meg az **Import / Export** oldalt.
2. Az **Excel fájl feltöltése** szekcióban húzd rá a fájlt a szaggatott keretes zónára, vagy kattints a **tallózz** linkre.
3. A rendszer beolvassa a fájlt (SheetJS `window.XLSX.read()`), majd megjeleníti a **Sheet kiválasztása** panelt.

#### 2. lépés — Sheet kiválasztása

A táblázat minden sheet-hez mutatja:
- **Sheet neve**
- **Érzékelt dátum** (vagy `—` ha nem sikerült felismerni)
- **Sorok száma**

1. A bal oldali checkbox-szal jelöld be a importálni kívánt sheet-eket.
2. Ha a dátum nem lett felismerve, adj meg egy dátumot kézzel a dátum-beviteli mezőben.
3. Kattints az **Előnézet betöltése** gombra.

#### 3. lépés — Import előnézet és sofőr-egyeztetés

Az előnézet táblázat minden sort megjelenít a következő oszlopokkal:

| Oszlop | Leírás |
|---|---|
| Dátum | Az importált nap |
| Sofőrnév (eredeti) | Az Excelből kiolvasott nyers szöveg |
| Egyezés | Az egyeztetés típusa (badge) |
| Sofőr hozzárendelés | Legördülő: a javasolt sofőr, felülbírálható |
| Projekt | Felismert projekt munkaszám alapján |
| Gép | Felismert gép rendszám alapján |
| Kezdés / Befejezés | Időpontok |
| Kihagyás | Checkbox: a sort kihagyja az importból |

#### Egyezési szintek (match badge)

| Badge | Szín | Egyeztetés módja | Pontszám |
|---|---|---|---|
| `exact` | Zöld | Pontos névegyezés (normalizálva) | 1.0 |
| `alias` | Zöld | Alias listán egyezik | 0.9 |
| `fuzzy` | Sárga | Token-halmaz egyezés (pl. „Nagy Gábor" ↔ „Gábor Nagy") | 0.75 |
| `levenshtein` | Narancssárga | Max. 2 betű elgépelés | 0.65 |
| `partial` | Sárgás | Az egyik tartalmazza a másikat | 0.6 |
| `unknown` | Piros | Nem sikerült egyeztetni | — |

Ha egy sor `unknown` állapotban van, a **Sofőr hozzárendelés** legördülőből kézzel kell kiválasztani a megfelelő sofőrt, vagy a **Kihagyás** checkbox-szal ki kell hagyni a sort.

4. Ellenőrizd az előnézetet, szükség esetén javítsd a hozzárendeléseket.
5. Kattints az **Import végrehajtása** gombra.

#### Eredmény

Az import után egy banner jelenik meg a beillesztett, kihagyott és hibás sorok számával:

- **Beillesztett:** sikeresen létrehozott `napi_terv` rekordok száma
- **Kihagyott:** `soforId` nélküli vagy kihagyásra jelölt sorok
- **Hibák:** ha valamely sor adatbázisba írása meghiúsult, a hibaüzenet itt jelenik meg

> **Megjegyzés az aliasok automatikus mentéséről:** Ha egy sort nem pontos névegyezéssel (`exact`) párosítottak, de az importot mégis jóváhagyod, a rendszer automatikusan hozzáadja az eredeti Excel-nevet a sofőr alias listájához (`saveAliasIfNew()`). Így a következő alkalommal az egyeztetés már alias szinten (`alias`) fog sikerülni.

---

## 7. Adatok exportálása

**Oldal:** `import_export.html` — *Adatexport* szekció

### Szűrési lehetőségek

Az export előtt szűkíthető az exportált adatkör:

- **Időszak:** `exportFrom` és `exportTo` dátummezőkkel adható meg a kezdő és záró dátum
- **Sofőr:** az `exportSofor` legördülőből kiválasztható egy konkrét sofőr (alapértelmezetten: összes)
- **Szűrők törlése** gomb: visszaállítja a szűrőket

### Exportálási formátumok

#### CSV export

- Gomb: **Letöltés CSV**
- Tartalom: `napi_teny` tábla rekordjai a szűrési feltételek szerint, JOIN-olt mezőkkel (sofőr neve, projekt munkaszáma, gép rendszáma)
- Fájlnév: `pilot-teny-export.csv`

#### XLSX (Excel) export

- Gomb: **Letöltés XLSX**
- Tartalom: két munkalap:
  - `Napi tény` — a szűrt `napi_teny` rekordok
  - `Napi terv` — a szűrt `napi_terv` rekordok
- Fájlnév: `pilot-export.xlsx`
- A SheetJS (`window.XLSX`) könyvtár végzi a generálást

#### SQLite adatbázis-mentés

- Gomb: **Letöltés .sqlite**
- Tartalom: a teljes adatbázis bináris másolata (`db.export()`)
- Fájlnév: `pilot-eroforras.sqlite`
- Célja: teljes mentés (backup), visszaállítható a **Visszaállítás .sqlite fájlból** szekción vagy a Beállítások oldalon

### Adatbázis visszaállítása export oldalon

Az **Adatbázis visszaállítása** szekcióban:

1. Kattints a **Fájl választása…** gombra.
2. Válaszd ki a korábban elmentett `.sqlite` fájlt.
3. A rendszer ellenőrzi a fájl érvényességét, majd lecseréli az adatbázist (`importDB()`).
4. A `restoreStatus` mező mutatja a visszaállítás eredményét (`status-ok` vagy `status-err` stílussal).

> **Figyelem:** A visszaállítás felülírja a jelenlegi összes adatot. Előtte készíts biztonsági mentést a **Letöltés .sqlite** gombbal.

---

## 8. Dashboard használata és KPI-k értelmezése

**Oldal:** `index.html`

A Dashboard az aktuális nap terv-tény összevetését jeleníti meg egy áttekintő táblázatban és KPI-kártyákon.

### Dátum kiválasztása

A fejlécben a naptár ikonos gomb mögötti dátum-beviteli mezővel bármely nap megjelenítése lehetséges. Az aktuális nap dátuma alapértelmezetten van kijelölve.

### Szűrés és keresés

A szűrősávban (`filter-bar`) az alábbi eszközök érhetők el:

| Eszköz | Leírás |
|---|---|
| Dátumválasztó | A megjelenített nap kiválasztása |
| Sofőr keresés | Szabad szöveges szűrés a sofőr nevére |
| **Minden** chip | Összes sor megjelenítése |
| **Egyezés** chip | Csak az egyező terv-tény párok |
| **Eltérés** chip | Terv és tény is van, de az értékek eltérnek |
| **Hiányzó terv** chip | Van tény, de nincs terv (nem tervezett munkavégzés) |
| **Nem tervezett tény** chip | Ugyanaz, mint Hiányzó terv |

### Terv-tény páros táblázat

A táblázat minden aktív sofőrt mutat, akinek az adott napra van terve **vagy** ténye:

| Oszlop | Leírás |
|---|---|
| Sofőr | Sofőr neve |
| Terv | A napi_terv rekord adatai (projekt, gép, időpontok) |
| Tény | A napi_teny rekord adatai (projekt, gép, munkaidő) |
| Állapot | Szín jelzés az egyezés szintjéről |

#### Sor állapotok (state)

| State | Jelzés | Feltétel |
|---|---|---|
| `egyezes` | Zöld pont | Van terv + tény, az értékek egyeznek |
| `elteres` | Narancssárga pont | Van terv + tény, az értékek eltérnek |
| `hianyzo` | Piros pont | Van terv, de nincs tény |
| `hianyzo_terv` / `nem_tervezett` | Piros pont | Van tény, de nincs terv |

### KPI-kártyák

Az oldal alján öt KPI-csempe (`kpi-strip`) található:

| KPI | ID | Mit mér |
|---|---|---|
| **Egyezés** | `kpiEgyezes` | Hány sofőrnél egyezik a terv és a tény |
| **Eltérés** | `kpiElteres` | Hány sofőrnél tér el a terv és a tény |
| **Hiányzó adat** | `kpiHianyzo` | Hány sofőrnél hiányzik vagy a terv, vagy a tény |
| **Tervezett órák** | `kpiTervOra` | Az aktuális napra tervezett összes munkaidő (napi_terv rekordok alapján) |
| **Rögzített tény** | `kpiTenyOra` | Az aktuális napra rögzített tényleges munkaidő (munkaora összeg) |

A **Rögzített tény** KPI alatt egy progress bar is megjelenik, amely a rögzített/tervezett arány százalékát mutatja.

---

*A kézikönyv az alkalmazás forráskódja alapján készült. Technikai részletekért ld. az admin kézikönyvet.*
