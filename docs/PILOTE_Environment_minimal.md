# Pilot fejlesztői környezet (Windows) — telepítés és beállítás (lépésről lépésre)

Ez a dokumentum röviden és pontosan összefoglalja, mit kell telepíteni és hogyan kell beállítani a pilot projektet Windows alatt. A környezet: Node.js + TypeScript (stabil 5.x) + Express 4 + Prisma 4 + SQLite (fájl alapú), plusz gyors JavaScript fallback lehetőség. Kövesd pontosan a parancsokat PowerShellben.

## 1. Előfeltételek (telepítsd ha nincs)

- Node.js LTS (ajánlott: 18.x vagy 20.x) — ellenőrzés: `node -v`, `npm -v`.
- Git for Windows (Git Bash opcionális).
- VS Code (szerkesztéshez).
- (Ajánlott) DB Browser for SQLite vagy VS Code SQLite extension a `dev.db` böngészéséhez.

## 2. Ajánlott VS Code kiterjesztések

- ESLint
- Prettier
- Prisma
- SQLite vagy SQLTools
- Thunder Client vagy REST Client
- GitLens

## 3. Projekt fájlok és tartalom (másold be pontosan)

1) package.json (helyettesítsd a projekt gyökérben)

{  
"name": "pilot-eroforras",  
"version": "0.1.0",  
"private": true,  
"scripts": {  
"dev": "ts-node-dev --respawn --transpile-only src/index.ts",  
"build": "tsc",  
"start": "node dist/index.js",  
"prisma:migrate": "prisma migrate dev --name init",  
"prisma:studio": "prisma studio"  
},  
"dependencies": {  
"express": "4.18.2",  
"@prisma/client": "4.13.0",  
"xlsx": "0.18.5"  
},  
"devDependencies": {  
"prisma": "4.13.0",  
"typescript": "5.1.6",  
"ts-node-dev": "2.0.0",  
"@types/node": "18.16.19",  
"@types/express": "4.17.17",  
"eslint": "8.40.0",  
"prettier": "2.8.8"  
}  
}

2) tsconfig.json

{  
"compilerOptions": {  
"target": "ES2020",  
"module": "commonjs",  
"outDir": "dist",  
"rootDir": "src",  
"strict": true,  
"moduleResolution": "node",  
"esModuleInterop": true,  
"skipLibCheck": true,  
"resolveJsonModule": true,  
"forceConsistentCasingInFileNames": true  
},  
"include": ["src"]  
}

3) .env (projekt gyökér)

DATABASE_URL="file:./dev.db"

4) prisma/schema.prisma (teljes, felülírható tartalom)

datasource db {  
provider = "sqlite"  
url = env("DATABASE_URL")  
}  
  
generator client {  
provider = "prisma-client-js"  
}  
  
model Equipment {  
id String @id @default(uuid())  
name String  
type String  
manufacturer String?  
model String?  
serialNumber String?  
createdAt DateTime @default(now())  
  
dimensions EquipmentDimensions?  
insurances EquipmentInsurance[]  
permits EquipmentPermit[]  
maintenancePlans MaintenancePlan[]  
}  
  
model EquipmentDimensions {  
id String @id @default(uuid())  
equipment Equipment @relation(fields: [equipmentId], references: [id])  
equipmentId String @unique  
length_m Float?  
width_m Float?  
height_m Float?  
tare_kg Int?  
gross_kg Int?  
}  
  
model Person {  
id String @id @default(uuid())  
name String  
role String?  
vacations Vacation[]  
}  
  
model Vacation {  
id String @id @default(uuid())  
person Person @relation(fields: [personId], references: [id])  
personId String  
type String  
startDate DateTime  
endDate DateTime  
status String  
}  
  
model MaintenancePlan {  
id String @id @default(uuid())  
equipment Equipment @relation(fields: [equipmentId], references: [id])  
equipmentId String  
planType String  
recommendedDate DateTime?  
estimatedEffortHours Float?  
status String  
}  
  
model ActualRecord {  
id String @id @default(uuid())  
planId String?  
equipmentId String?  
personId String?  
actualStart DateTime?  
actualEnd DateTime?  
actualHours Float?  
createdAt DateTime @default(now())  
financial ActualFinancial?  
}  
  
model ActualFinancial {  
id String @id @default(uuid())  
actualRecord ActualRecord @relation(fields: [actualRecordId], references: [id])  
actualRecordId String @unique  
laborCost Float?  
partsCost Float?  
externalCost Float?  
totalCost Float?  
}  
  
model EquipmentInsurance {  
id String @id @default(uuid())  
equipment Equipment @relation(fields: [equipmentId], references: [id])  
equipmentId String  
insurer String  
policyNumber String?  
validFrom DateTime?  
validUntil DateTime?  
coverageAmount Float?  
}  
  
model EquipmentPermit {  
id String @id @default(uuid())  
equipment Equipment @relation(fields: [equipmentId], references: [id])  
equipmentId String  
permitType String  
issueDate DateTime?  
expiryDate DateTime?  
}

5) src/index.ts (TypeScript entry — másold be pontosan)

import express from 'express';  
import { PrismaClient } from '@prisma/client';  
  
const prisma = new PrismaClient();  
const app = express();  
app.use(express.json());  
  
app.get('/health', (_req, res) => res.json({ ok: true }));  
  
app.get('/equipment', async (_req, res) => {  
try {  
const list = await prisma.equipment.findMany();  
res.json(list);  
} catch (err) {  
console.error('DB error:', err);  
res.status(500).json({ error: 'DB error' });  
}  
});  
  
app.post('/equipment', async (req, res) => {  
try {  
const e = await prisma.equipment.create({ data: req.body });  
res.status(201).json(e);  
} catch (err) {  
console.error('DB error:', err);  
res.status(500).json({ error: 'DB error' });  
}  
});  
  
app.get('/persons', async (_req, res) => {  
try {  
const list = await prisma.person.findMany();  
res.json(list);  
} catch (err) {  
console.error('DB error:', err);  
res.status(500).json({ error: 'DB error' });  
}  
});  
  
app.post('/persons', async (req, res) => {  
try {  
const p = await prisma.person.create({ data: req.body });  
res.status(201).json(p);  
} catch (err) {  
console.error('DB error:', err);  
res.status(500).json({ error: 'DB error' });  
}  
});  
  
const PORT = process.env.PORT || 3000;  
app.listen(PORT, () => console.log(`Dev server running on http://localhost:${PORT}`));

6) (Fallback) Gyors Node.js JavaScript szerver ha gond van a TS-sel:

// server.js (fallback)  
const express = require('express');  
const { PrismaClient } = require('@prisma/client');  
const prisma = new PrismaClient();  
const app = express();  
app.use(express.json());  
app.get('/health', (_req, res) => res.json({ ok: true }));  
app.listen(process.env.PORT || 3000, () => console.log('Node server running'));

## 4. Lépésről lépésre telepítés PowerShell-ben (projekt gyökér)

1. Telepítsd a függőségeket:

npm install

1. Ellenőrizd/generáld Prisma klienst:

npx prisma generate

1. Migráció (dev):

npx prisma migrate dev --name init

(Fejlesztésnél ha kér resetet, `y` elfogadható.)

1. Indítsd a dev szervert:

npm run dev

1. Teszt: nyisd meg a böngészőben: `http://localhost:3000/health` — válasznak `{ "ok": true }` kell jönnie.

## 5. Hasznos parancsok és eszközök

- Prisma Studio (grafikus DB böngésző): `npm run prisma:studio`
- Ha TS futtatásnál gond: `npx ts-node src/index.ts` vagy `npm run build` + `npm start`.
- Gyors fallback: `node server.js` ha létrehoztad a fallback fájlt.
- DB fájl: `dev.db` a projekt gyökérben (nyisd DB Browser-rel).

## 6. Hibakeresési tippek (Windows)

- Ha `ERR_CONNECTION_REFUSED`: ellenőrizd, fut-e a szerver (`npm run dev` kimenet).
- Ha TypeScript fordítási hibák (TS1005, Unterminated string): ellenőrizd, hogy `src/index.ts` pontosan a fenti kóddal szerepel — nincs benne shell-maradvány vagy rossz idézőjel.
- Ha Prisma schema hibák: futtasd `npx prisma format`, majd `npx prisma validate` (ellenőrizd a `prisma/schema.prisma` elejét, ne legyen előtte bármilyen PowerShell szöveg).
- ExecutionPolicy probléma futtatáskor (csak script futtatásra vonatkozik): `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` (ideiglenes).

## 7. Excel import / export röviden

- Használható csomag: `xlsx`. Export példa szerveroldalon:

import XLSX from 'xlsx';  
// JSON -> sheet -> file  
const data = [{ name: 'CAT 320', type: 'machine' }];  
const ws = XLSX.utils.json_to_sheet(data);  
const wb = XLSX.utils.book_new();  
XLSX.utils.book_append_sheet(wb, ws, 'Equipment');  
XLSX.writeFile(wb, 'equipment-export.xlsx');

- Import: olvasd be a fájlt a `XLSX.readFile(...)` és konvertáld JSON-re `XLSX.utils.sheet_to_json(...)`.

## 8. Checklist — indítás előtt

- [ ] Node.js és npm telepítve
- [ ] VS Code és kiterjesztések telepítve
- [ ] package.json és tsconfig.json a fent megadott (stabil) verziókkal
- [ ] prisma/schema.prisma felülírva a valid sémával
- [ ] `.env` létrehozva: `DATABASE_URL="file:./dev.db"`
- [ ] `npm install` lefutott
- [ ] `npx prisma generate` és `npx prisma migrate dev --name init` sikeres
- [ ] `npm run dev` indítja a szervert és `http://localhost:3000/health` OK

## 9. További javasolt következő lépések (pilot)

- Készíts egyszerű Postman / Thunder Client gyűjteményt CRUD ellenőrzéshez (equipment / persons).
- Adj hozzá egy egyszerű Excel import endpointot a feltöltéshez és tömeges betöltéshez (prisma kliens használatával).
- Adj hozzá alap logger-t és error handling middleware-t (működésbiztonság).
- Később gondolkodj Docker devcontainer-en (ha több dev használja egyszerre a környezetet).

Rövid összegzés: állítsd be a csomagokat a fenti, stabil verziókra, másold be a megadott fájlokat, futtasd `npm install`, `npx prisma generate`, `npx prisma migrate dev --name init` majd `npm run dev`. Ha bárhol hibát kapsz, másold ide a teljes konzol-kimenetet (parancs + hiba), és lépésről lépésre segítek.

A kontextus alapján az előző válasz a fejlesztői környezet komponenseinek magyarázatánál és az összefoglalónál tartott. Folytatom onnan:

## 🔄 A Fejlesztési Munkafolyamat Összefoglalása

A rendszer teljes életciklusa az alábbi lépéseken halad végig, minden alkalommal amikor fejlesztési munkát végzünk:

### 1. lépés – Függőségek telepítése

npm install

Ez telepíti az összes szükséges csomagot a `package.json` alapján. Csak egyszer kell futtatni, hacsak nem adunk hozzá új csomagot.

### 2. lépés – Prisma kliens generálása

npx prisma generate

Ez a parancs beolvassa a `prisma/schema.prisma` fájlt, és létrehozza a TypeScript típusokat és adatbázis-hozzáférési kódot a `node_modules/@prisma/client` mappában. **Minden schema módosítás után újra kell futtatni.**

### 3. lépés – Adatbázis migráció

npx prisma migrate dev --name init

Ez ténylegesen létrehozza (vagy frissíti) az adatbázis táblákat a `dev.db` SQLite fájlban. A `--name` paraméter egy leíró nevet ad a migrációs fájlnak, amely a `prisma/migrations/` mappában tárolódik.

### 4. lépés – Szerver indítása

npm run dev

Ez elindítja a `ts-node-dev`-et, amely:

- Lefordítja a TypeScript kódot futás közben
- Figyeli a fájlváltozásokat
- Automatikusan újraindítja a szervert módosításkor

## 🧩 Komponensek Kapcsolatrendszere

HTTP Kérés  
│  
▼  
Express Router (routes/)  
│ ← Fogadja a kérést, validálja az útvonalat  
▼  
Controller / Handler (index.ts)  
│ ← Üzleti logika, adatfeldolgozás  
▼  
Prisma Client  
│ ← Típusbiztos adatbázis-műveletek  
▼  
SQLite Adatbázis (dev.db)  
│ ← Fizikai adattárolás  
▼  
Prisma Client visszaadja az adatot  
│  
▼  
Express → JSON válasz a kliensnek

## ⚠️ Leggyakoribb Hibák és Megoldásaik

| Hiba                                                   | Ok                                           | Megoldás                                                              |
| ------------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------- |
| `Prisma schema validation error`                       | Helytelen tartalom a `schema.prisma` fájlban | Cseréld le a fájl tartalmát a helyes sémával                          |
| `cannot be loaded because running scripts is disabled` | PowerShell végrehajtási szabályzat           | Futtasd: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| `Cannot find module '@prisma/client'`                  | Prisma kliens nem lett generálva             | Futtasd: `npx prisma generate`                                        |
| `Table does not exist`                                 | Migráció nem futott le                       | Futtasd: `npx prisma migrate dev`                                     |
| `Port already in use`                                  | A szerver már fut egy másik terminálban      | Zárd be a másik terminált, vagy változtasd meg a portot `.env`-ben    |

  

## 📁 Projekt Mappastruktúra

projekt-mappa/  
│  
├── prisma/  
│ ├── schema.prisma ← Adatbázis séma definíció  
│ └── migrations/ ← Migrációs előzmények  
│  
├── src/  
│ └── index.ts ← Fő szerverfájl (Express + Prisma)  
│  
├── .env ← Környezeti változók (DB URL, PORT)  
├── package.json ← Projekt függőségek és scriptek  
├── tsconfig.json ← TypeScript fordítói beállítások  
└── dev.db ← SQLite adatbázis fájl (automatikusan jön létre)

## ✅ Összefoglalás – Kulcspontok

- **Node.js + TypeScript** adja az alapot: biztonságos, típusos szerverkód
- **Express** kezeli a HTTP útvonalakat és kéréseket
- **Prisma** elvégzi az adatbázis-kommunikációt típusbiztos módon
- **SQLite** egyszerű, fájlalapú adatbázis – tökéletes prototípushoz
- A fejlesztési ciklus: `generate` → `migrate` → `dev` parancsok sorrendben
- A legtöbb hiba a schema fájl hibás tartalmából vagy a migrációk kihagyásából ered

Ha bármelyik részhez részletesebb magyarázatra vagy kód példákra van szükséged, szívesen segítek! 🚀
