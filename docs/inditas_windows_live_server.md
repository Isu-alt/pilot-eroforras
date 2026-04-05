# Pilot Erőforrás — Indítás Windows Live Serverrel (kezdőknek)

Ez az útmutató feltételezi, hogy még nem volt dolgod VS Code-dal vagy webszerverrel.

---

## 1. lépés — VS Code telepítése (ha még nincs)

1. Nyisd meg a böngészőt és menj erre a címre: **https://code.visualstudio.com**
2. Kattints a nagy kék **Download for Windows** gombra
3. Futtasd a letöltött telepítőt (VSCodeSetup.exe), mindenhol kattints **Next**, majd **Install**

---

## 2. lépés — Live Server bővítmény telepítése

1. Nyisd meg a VS Code-ot
2. A bal oldalsávban kattints a négy kis négyzetből álló ikonra (Extensions — `Ctrl+Shift+X`)
3. A keresőmezőbe írd be: **Live Server**
4. Az első találat: „Live Server" — szerzője: *Ritwick Dey*
5. Kattints a **Install** gombra

![Live Server keresés az Extensions panelen]

---

## 3. lépés — A projekt megnyitása VS Code-ban

1. VS Code-ban: **File → Open Folder…**
2. Keresd meg azt a mappát, ahova a programot kicsomagoltad (pl. `C:\Users\User\Documents\GitHub\pilot-eroforras`)
3. Kattints a **Select Folder** gombra
4. A bal oldalt megjelenik a projekt mappastruktúrája

---

## 4. lépés — Program indítása

1. A bal oldali fájllistában nyisd meg a **`src`** mappát
2. Kattints jobb gombbal az **`index.html`** fájlra
3. A felugró menüből válaszd: **Open with Live Server**
4. A böngésző automatikusan megnyílik, és betölti a programot ezen a címen:

   ```
   http://127.0.0.1:5500/src/index.html
   ```

> **Ez a cím csak a saját gépedet jelenti** — más gépen nem érhető el.

---

## 5. lépés — Első használat

Az első betöltéskor az alkalmazásnak **internetkapcsolat szükséges** (egy adatbázis-motort tölt le automatikusan a háttérben). Ez csak az első alkalommal szükséges.

1. A program megnyílik a dashboardon
2. Menj a **Beállítások** oldalra (bal oldali menü alján: ⚙ Beállítások)
3. Add meg a nevedet és a szerepkörödet, majd kattints a **Mentés** gombra
4. Ezután kezdheted el a törzsadatok felvitelét (sofőrök, gépek, projektek)

---

## Gyakori kérdések

**Miért nem elég simán duplán kattintani az `index.html`-re?**

Ha duplán kattintasz, a böngésző `file://` protokollon nyitja meg. A program biztonsági okokból nem tud így betölteni bizonyos fájlokat (WASM adatbázismotor). A Live Server `http://` protokollon szolgálja ki a fájlokat, ami szükséges a működéshez.

---

**Bezártam a böngészőt — elveszett az adat?**

Nem. Az adatok a böngésző saját tárolójában (IndexedDB) vannak elmentve. A következő megnyitáskor ugyanott folytathatod.

---

**Megnyitom a Live Servert, de a böngésző fehér oldalt mutat.**

- Ellenőrizd, hogy a Live Server fut-e (a VS Code ablak alján kell látni: „Port: 5500")
- Győződj meg róla, hogy internetkapcsolat van az első betöltésnél
- Próbáld meg a `Ctrl+Shift+I` → Console fület megnyitni a böngészőben — ott látszik a hibaüzenet

---

**Másik gépen is el tudom érni a programot?**

Alapból nem — a Live Server csak a saját gépeden érhető el. Ha hálózaton belüli megosztás kell, az admin kézikönyvben találsz erre megoldást.

---

## Gyors referencia

| Teendő | Lépés |
|--------|-------|
| Program indítása | Jobb klikk `src/index.html` → Open with Live Server |
| Program leállítása | VS Code jobb alsó sarok → kattints a „Port: 5500" jelzőre → Stop |
| Böngésző cím | `http://127.0.0.1:5500/src/index.html` |
| Adat helye | A böngésző IndexedDB tárhelye (nem törlődik böngészőbezáráskor) |
