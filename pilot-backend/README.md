# Pilot Erőforrás — Backend

Node.js/Express REST API PostgreSQL adatbázissal.

## Telepítés

```bash
cd pilot-backend
npm install
```

## Konfiguráció

Másold a `.env.example` fájlt `.env`-vé, majd töltsd ki az értékeket:

```bash
cp .env.example .env
```

A `.env` tartalmazza:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — PostgreSQL kapcsolat
- `JWT_SECRET` — min. 32 karakter hosszú titkos kulcs (élesben erős véletlenszámot használj)
- `JWT_EXPIRES_IN` — pl. `8h`, `24h`
- `PORT` — szerver port (default: 3000)

## Adatbázis létrehozása

```bash
# 1. Hozz létre egy adatbázist PostgreSQL-ben
psql -U postgres -c "CREATE DATABASE pilot_eroforras;"

# 2. Futtasd a migrációs szkriptet
psql -U postgres -d pilot_eroforras -f migration.sql
```

A `migration.sql` létrehozza az összes táblát, indexet, triggert és egy seed admin felhasználót.

**Fontos:** A seed admin jelszó placeholder (`password` hash). Bejelentkezés után azonnal változtasd meg, vagy futtatás előtt generálj valódi bcrypt hash-t:

```bash
node -e "import('bcrypt').then(b => b.default.hash('sajat_jelszo', 10).then(console.log))"
```

Majd cseréld le a hash-t a `migration.sql` fájl végén az INSERT utasításban.

## Indítás

```bash
# Fejlesztés (auto-reload)
npm run dev

# Éles
npm start
```

A szerver a `http://localhost:3000` címen indul.

## Végpontok áttekintése

| Metódus | Path | Leírás |
|---------|------|--------|
| POST | `/api/auth/login` | Bejelentkezés, JWT token visszaadás |
| GET | `/api/auth/me` | Bejelentkezett user adatai |
| GET/POST/PUT/DELETE | `/api/soforok` | Sofőrök CRUD |
| GET/POST/PUT/DELETE | `/api/projektek` | Projektek CRUD |
| GET/POST/PUT/DELETE | `/api/gep_csoportok` | Gépcsoportok CRUD (admin) |
| GET/POST/PUT/DELETE | `/api/gepek` | Gépek CRUD |
| GET | `/api/kompetencia/sofor/:id` | Sofőr gép-kompetenciái |
| GET | `/api/kompetencia/csoport/:id` | Sofőr gépcsoport-kompetenciái |
| POST/DELETE | `/api/kompetencia/csoport` | Gépcsoport-kompetencia kezelés |
| GET/POST/PUT/DELETE | `/api/tavolletek` | Távollétek CRUD |
| GET/POST/PUT/DELETE | `/api/napi_teny` | Napi tény CRUD |
| GET/POST/PUT/DELETE | `/api/napi_terv` | Napi terv CRUD |
| POST | `/api/import/soforok` | Excel import — sofőrök |
| POST | `/api/import/gepek` | Excel import — gépek |
| POST | `/api/import/napi_terv` | Excel import — napi terv |
| GET | `/api/export/soforok.xlsx` | Sofőrök XLSX export |
| GET | `/api/export/gepek.xlsx` | Gépek XLSX export |
| GET | `/api/export/napi_teny.csv` | Napi tény CSV export |
| GET | `/api/export/napi_teny.xlsx` | Napi tény XLSX export |
| GET | `/health` | Health check |

## Autentikáció

Minden `/api/*` endpoint (a `/api/auth/login` kivételével) `Authorization: Bearer <token>` fejlécet vár.

Szerepkörök:
- `admin` — teljes hozzáférés
- `diszpecser` — olvasás + write, admin funkciók nélkül

## Import Excel formátum

### Sofőrök (`/api/import/soforok`)
Első sor fejléc: `id | teljes_nev | aliasok | belepesi_datum | statusz | beosztas | megjegyzes`

### Gépek (`/api/import/gepek`)
Első sor fejléc: `id | tipus | rendszam | megjegyzes | vallalkozo | csoport_nev | allapot`

### Napi terv (`/api/import/napi_terv`)
Első sor fejléc: `datum | sofor_nev | munkaszam | gep_rendszam | kezdes | vegez | megjegyzes`
