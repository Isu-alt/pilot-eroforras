# Backlog – PostgreSQL átállás

## 🔴 Magas prioritás (1-2 hét)

### 1. Környezet előkészítés
- [ ] PostgreSQL szerver telepítése (docker vagy natív)
- [ ] `.env` fájl létrehozása a kredenciákkal
- [ ] Node.js projekt inicializálása (npm init, express, pg, dotenv, jsonwebtoken, bcrypt, multer)

### 2. Adatbázis séma létrehozása
- [ ] migration.sql megírása (fenti séma alapján)
- [ ] Tesztadatok beszúrása (seed)
- [ ] Indexek és triggerek tesztelése

### 3. Autentikáció
- [ ] `users` tábla létrehozása
- [ ] `/api/auth/login` végpont (JWT kiadása)
- [ ] JWT middleware (authenticate, requireAdmin)
- [ ] Frontend login.html elkészítése

### 4. Alap CRUD API-k
- [ ] Sofőrök (GET, POST, PUT, DELETE) + version ellenőrzés
- [ ] Projektek (GET, POST, PUT, DELETE)
- [ ] Gépek (GET, POST, PUT, DELETE)
- [ ] Gépcsoportok (GET, POST, PUT, DELETE)
- [ ] Kompetencia (csoport szintű) – GET, POST, DELETE
- [ ] Távollétek (GET, POST, DELETE)

## 🟠 Közepes prioritás (2-3 hét)

### 5. Napi rögzítés és tervezés API
- [ ] `/api/napi_teny` (CRUD, szűrés dátumra, sofőrre)
- [ ] `/api/napi_terv` (CRUD, szűrés)
- [ ] `/api/napi_terv/generate` (javaslat generálása előző napból)
- [ ] Duplikáció ellenőrzés backend oldalon

### 6. Import / Export
- [ ] `/api/import/excel` – fájl feltöltés, sorok feldolgozása (streaming)
- [ ] Sofőr egyeztetés (fuzzy match, alias) backend oldalon
- [ ] `/api/export/csv` – CSV generálás streaming
- [ ] `/api/export/xlsx` – XLSX generálás (ExcelJS könyvtár)
- [ ] `/api/export/sqlite` – teljes adatbázis dump
- [ ] `/api/restore/sqlite` – visszaállítás (admin)

### 7. Frontend átírás (fázis 1)
- [ ] `api.js` modul elkészítése (fetch wrapper)
- [ ] `soforok.html` átírása (CRUD API hívásokra)
- [ ] `projektek.html`, `gepek.html`, `gep_csoportok.html`, `vallalkozok.html` átírása
- [ ] `kompetencia.html` átírása (mátrix lekérése és mentése)

### 8. Audit log bekapcsolása
- [ ] Middleware minden CRUD végpontra
- [ ] Frontend admin felület a log megtekintéséhez (opcionális)

## 🟡 Alacsony prioritás (1-2 hét)

### 9. Valós idejű frissítés (WebSocket)
- [ ] Socket.IO beüzemelése
- [ ] Szerveroldali események broadcast (módosításkor)
- [ ] Frontend feliratkozás és UI frissítés

### 10. Offline cache stratégia
- [ ] Service Worker regisztrálása
- [ ] IndexedDB cache a GET válaszoknak
- [ ] `background sync` a függőben lévő POST/PUT kérésekhez

### 11. Tesztelés és dokumentáció
- [ ] Unit tesztek (Jest) a CRUD függvényekre
- [ ] API tesztek (Supertest)
- [ ] Swagger/OpenAPI dokumentáció generálása
- [ ] Felhasználói kézikönyv frissítése

## 📌 Javaslatok a meglévő UX problémák kezelésére (backend + frontend)

| Probléma | Megoldás (PostgreSQL környezetben) |
|----------|--------------------------------------|
| Nincs valós idejű együttműködés | WebSocket + `version` mező optimista zárolással |
| Nincs "undo" | A `valtozas_log` táblából lehet visszaállítani az előző állapotot (admin funkció) |
| Nincs autosave | Frontend draft mentése localStorage-ba, plusz backend draft API (opcionális) |
| Nincs offline jelzés | Service Worker + IndexedDB cache, UI jelzősáv |
| Nincs keresés kompetencia mátrixban | Frontend szűrő (JavaScript) – már megoldható |
| A `valtozas_log` nem használt | Backend trigger minden módosításkor naplóz |
| Indexek hiánya | A migration.sql tartalmazza a szükséges indexeket |
| Virtuális scroll | Frontend komponens (későbbi feladat) |
| Web Worker az import-hoz | A backend már alapból aszinkron, nem fagyasztja az UI-t |