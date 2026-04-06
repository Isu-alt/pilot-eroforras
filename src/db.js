/**
 * db.js — Fő adatbázis modul (sql.js + IndexedDB)
 *
 * Felelős:
 *  - sql.js WASM betöltése és SQLite adatbázis inicializálása
 *  - Séma létrehozása (CREATE TABLE IF NOT EXISTS)
 *  - Mentés és visszatöltés IndexedDB-be/-ből
 *  - Adatbázis exportálása .sqlite fájlként
 *  - Adatbázis importálása .sqlite fájlból
 */

// ─── Modul-szintű állapot ────────────────────────────────────────────────────

/** @type {import('sql.js').Database|null} Aktív SQLite adatbázis példány */
let db = null;

/** @type {import('sql.js').SqlJsStatic|null} sql.js motor példány */
let SQL = null;

// IndexedDB konfiguráció
const IDB_NAME  = 'pilot-db';
const IDB_STORE = 'db';
const IDB_KEY   = 'main';

// ─── Publikus API ────────────────────────────────────────────────────────────

/**
 * initDB — sql.js betöltése, adatbázis inicializálása.
 *
 * Ha IndexedDB-ben van mentett állapot, azt tölti be;
 * egyébként üres adatbázist hoz létre.
 * Mindkét esetben meghívja a createSchema()-t.
 *
 * @returns {Promise<import('sql.js').Database>}
 */
export async function initDB() {
  try {
    // sql.js motor betöltése CDN-ről (WASM fájl is CDN-ről)
    SQL = await initSqlJs({
      locateFile: f => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/' + f,
    });

    // Megpróbáljuk visszatölteni a mentett adatbázist IndexedDB-ből
    const saved = await loadFromIndexedDB();

    if (saved) {
      // Mentett bináris blob → Database példány
      db = new SQL.Database(saved);
      console.log('[db] Adatbázis visszatöltve IndexedDB-ből.');
    } else {
      // Első indítás: üres adatbázis
      db = new SQL.Database();
      console.log('[db] Új adatbázis létrehozva.');
    }

    // Séma létrehozása (idempotens: IF NOT EXISTS)
    createSchema();

    return db;
  } catch (err) {
    console.error('[db] initDB hiba:', err);
    throw err;
  }
}

/**
 * createSchema — Összes tábla létrehozása, ha még nem léteznek.
 * Idempotens: biztonságosan hívható meglévő adatbázison is.
 */
export function createSchema() {
  if (!db) throw new Error('[db] createSchema: adatbázis nincs inicializálva.');

  try {
    db.run(`
      -- Sofőrök törzsadatai
      CREATE TABLE IF NOT EXISTS sofor (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        teljes_nev     TEXT    NOT NULL,
        aliasok        TEXT,                          -- vesszővel elválasztott becénevek/rövidítések
        belepesi_datum DATE,
        statusz        TEXT    DEFAULT 'aktiv',       -- aktiv | inaktiv
        beosztas       TEXT    NOT NULL DEFAULT 'sofor', -- sofor | gepkezelo | sofor_es_gepkezelo
        megjegyzes     TEXT,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP
      );
    `);

    db.run(`
      -- Projektek / munkák
      CREATE TABLE IF NOT EXISTS projekt (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        munkaszam   TEXT    NOT NULL UNIQUE,          -- egyedi munkaszám / azonosító
        helyszin    TEXT,
        megrendelo  TEXT,
        leiras      TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP
      );
    `);

    db.run(`
      -- Gépek / járművek
      CREATE TABLE IF NOT EXISTS gep (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        tipus      TEXT,                              -- pl. 'daru', 'tehergépkocsi'
        rendszam   TEXT,
        megjegyzes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);

    db.run(`
      -- Napi terv (diszpécser által tervezett beosztás)
      CREATE TABLE IF NOT EXISTS napi_terv (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        datum      DATE    NOT NULL,
        sofor_id   INTEGER REFERENCES sofor(id),
        projekt_id INTEGER REFERENCES projekt(id),
        gep_id     INTEGER REFERENCES gep(id),
        kezdes     TIME,                              -- tervezett kezdési időpont (HH:MM)
        vegez      TIME,                              -- tervezett befejezési időpont
        allapot    TEXT    DEFAULT 'javasolt',        -- javasolt | elfogadott | torolt
        megjegyzes TEXT,
        forras     TEXT    DEFAULT 'manualis',        -- manualis | import
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);

    db.run(`
      -- Napi tény (ténylegesen elvégzett munka, visszaigazolás)
      CREATE TABLE IF NOT EXISTS napi_teny (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        datum               DATE    NOT NULL,
        sofor_id            INTEGER REFERENCES sofor(id),
        projekt_id          INTEGER REFERENCES projekt(id),
        gep_id              INTEGER REFERENCES gep(id),
        kezd_idopont        DATETIME,                -- tényleges kezdés
        befejezes_idopont   DATETIME,                -- tényleges befejezés
        munkaora            REAL,                    -- ledolgozott órák száma
        fuvarok_szama       INTEGER,
        allapot             TEXT    DEFAULT 'rogzitett',   -- rogzitett | lezart | torolt
        megjegyzes          TEXT,
        forras              TEXT    DEFAULT 'manualis',
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP
      );
    `);

    db.run(`
      -- Változásnapló (audit trail)
      CREATE TABLE IF NOT EXISTS valtozas_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        tabla       TEXT,                             -- érintett tábla neve
        rekord_id   INTEGER,                          -- érintett rekord azonosítója
        muvelet     TEXT,                             -- INSERT | UPDATE | DELETE
        felhasznalo TEXT    DEFAULT 'rendszer',
        idopont     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        leiras      TEXT                              -- emberi olvasható leírás
      );
    `);

    db.run(`
      -- Távollét tervezés (szabadság, betegség, egyéb távollétek)
      CREATE TABLE IF NOT EXISTS tavollet (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        sofor_id    INTEGER NOT NULL REFERENCES sofor(id),
        datum_tol   DATE    NOT NULL,
        datum_ig    DATE    NOT NULL,
        tipus       TEXT    NOT NULL DEFAULT 'szabadsag', -- szabadsag | betegseg | egyeb
        megjegyzes  TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP
      );
    `);

    db.run(`
      -- Kompetencia mátrix (sofőr ↔ gép jogosultságok)
      CREATE TABLE IF NOT EXISTS kompetencia (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        sofor_id  INTEGER NOT NULL REFERENCES sofor(id),
        gep_id    INTEGER NOT NULL REFERENCES gep(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sofor_id, gep_id)
      );
    `);

    db.run(`
      -- Felhasználók és szerepkörök (autentikáció)
      CREATE TABLE IF NOT EXISTS felhasznalo (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        nev            TEXT    NOT NULL,
        felhasznalonev TEXT    NOT NULL UNIQUE,
        jelszo_hash    TEXT    NOT NULL,
        szerep         TEXT    NOT NULL DEFAULT 'diszpecser',
        aktiv          INTEGER NOT NULL DEFAULT 1,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP
      );
    `);

    console.log('[db] Séma sikeresen létrehozva / ellenőrizve.');
  } catch (err) {
    console.error('[db] createSchema hiba:', err);
    throw err;
  }
}

/**
 * saveToIndexedDB — Az aktuális adatbázist elmenti IndexedDB-be.
 *
 * A db.export() Uint8Array-t ad vissza (SQLite bináris formátum),
 * amelyet az IDBObjectStore-ba mentünk.
 *
 * @returns {Promise<void>}
 */
export async function saveToIndexedDB() {
  if (!db) throw new Error('[db] saveToIndexedDB: adatbázis nincs inicializálva.');

  try {
    const data = db.export(); // Uint8Array

    await idbPut(IDB_NAME, IDB_STORE, IDB_KEY, data);
    console.log('[db] Adatbázis mentve IndexedDB-be.', data.byteLength, 'bájt');
  } catch (err) {
    console.error('[db] saveToIndexedDB hiba:', err);
    throw err;
  }
}

/**
 * loadFromIndexedDB — Visszatölti a mentett adatbázis blobot IndexedDB-ből.
 *
 * @returns {Promise<Uint8Array|null>} Mentett adat, vagy null ha nincs mentés
 */
export async function loadFromIndexedDB() {
  try {
    const data = await idbGet(IDB_NAME, IDB_STORE, IDB_KEY);
    return data ?? null;
  } catch (err) {
    console.error('[db] loadFromIndexedDB hiba:', err);
    return null;
  }
}

/**
 * exportDB — Letölti az adatbázist .sqlite fájlként a böngészőből.
 *
 * Blob + URL.createObjectURL + anchor click trick.
 *
 * @param {string} [fileName='pilot-eroforras.sqlite'] A letöltési fájlnév
 */
export function exportDB(fileName = 'pilot-eroforras.sqlite') {
  if (!db) throw new Error('[db] exportDB: adatbázis nincs inicializálva.');

  try {
    const data = db.export();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    const url  = URL.createObjectURL(blob);

    const anchor    = document.createElement('a');
    anchor.href     = url;
    anchor.download = fileName;
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Felszabadítjuk az objektum URL-t rövid késleltetéssel
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    console.log('[db] Adatbázis exportálva:', fileName);
  } catch (err) {
    console.error('[db] exportDB hiba:', err);
    throw err;
  }
}

/**
 * importDB — Betölt egy .sqlite fájlt, lecseréli az aktuális adatbázis példányt,
 * és elmenti IndexedDB-be.
 *
 * @param {File} file A felhasználó által kiválasztott .sqlite fájl
 * @returns {Promise<void>}
 */
export async function importDB(file) {
  if (!SQL) throw new Error('[db] importDB: sql.js nincs inicializálva. Hívd meg előbb az initDB()-t.');

  // Elmentjük az aktuális példányt — corrupt fájl esetén visszaállítunk rá
  const prevDb = db;

  try {
    const buffer = await readFileAsArrayBuffer(file);
    const data   = new Uint8Array(buffer);

    // Új példány létrehozásának kísérlete — corrupt adat esetén kivételt dob
    let newDb;
    try {
      newDb = new SQL.Database(data);
    } catch (parseErr) {
      // Visszaállítás az előző példányra, a régi db-t NEM zárjuk be
      db = prevDb;
      console.error('[db] importDB: corrupt SQLite fájl:', parseErr);
      throw new Error('Hibás .sqlite fájl — az adatbázis változatlan maradt.');
    }

    // Csak sikeres parse után zárjuk be a régit
    if (prevDb) {
      prevDb.close();
    }

    db = newDb;

    // Séma biztosítása (ha a fájl régebbi verzióból való)
    createSchema();

    // Mentés IndexedDB-be, hogy következő betöltéskor is elérhető legyen
    await saveToIndexedDB();

    console.log('[db] Adatbázis sikeresen importálva:', file.name);
  } catch (err) {
    console.error('[db] importDB hiba:', err);
    throw err;
  }
}

/**
 * getDB — Visszaadja az aktív adatbázis példányt.
 * Más modulok ebből férnek hozzá a db-hez anélkül,
 * hogy importálnák a belső `db` változót.
 *
 * @returns {import('sql.js').Database}
 */
export function getDB() {
  if (!db) throw new Error('[db] getDB: adatbázis nincs inicializálva. Hívd meg előbb az initDB()-t.');
  return db;
}

/**
 * seedDefaultAdmin — Alapértelmezett admin felhasználó létrehozása, ha a tábla üres.
 *
 * Jelszó hash-elés SubtleCrypto SHA-256-tal (nincs só — helyi app).
 * Az auth.js-t NEM importálja (körkörös függőség elkerülése).
 *
 * @returns {Promise<boolean>} true ha seedelés történt, false ha már voltak felhasználók
 */
export async function seedDefaultAdmin() {
  if (!db) throw new Error('[db] seedDefaultAdmin: adatbázis nincs inicializálva.');

  try {
    // Ellenőrzés: van-e már felhasználó?
    const result = db.exec('SELECT COUNT(*) as cnt FROM felhasznalo');
    const count = result[0]?.values[0]?.[0] ?? 0;

    if (count > 0) {
      return false; // Már van legalább egy felhasználó
    }

    // SHA-256 hash SubtleCrypto-val (inline, az auth.js importálása nélkül)
    const encoder = new TextEncoder();
    const data = encoder.encode('admin');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    db.run(
      `INSERT INTO felhasznalo (nev, felhasznalonev, jelszo_hash, szerep, aktiv)
       VALUES (?, ?, ?, 'admin', 1)`,
      ['Adminisztrátor', 'admin', hashHex]
    );

    await saveToIndexedDB();

    console.log('[db] Alapértelmezett admin felhasználó létrehozva.');
    return true;
  } catch (err) {
    console.error('[db] seedDefaultAdmin hiba:', err);
    throw err;
  }
}

// ─── Belső segédfüggvények ───────────────────────────────────────────────────

/**
 * idbOpen — Megnyit (vagy létrehoz) egy IndexedDB adatbázist.
 * Ha az object store még nem létezik, létrehozza az onupgradeneeded callbackben.
 *
 * @param {string} dbName
 * @param {string} storeName
 * @returns {Promise<IDBDatabase>}
 */
function idbOpen(dbName, storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = event => {
      const idb = event.target.result;
      if (!idb.objectStoreNames.contains(storeName)) {
        idb.createObjectStore(storeName);
      }
    };

    request.onsuccess = event => resolve(event.target.result);
    request.onerror   = event => reject(event.target.error);
  });
}

/**
 * idbPut — Értéket ír IndexedDB-be.
 *
 * @param {string} dbName
 * @param {string} storeName
 * @param {string} key
 * @param {any}    value
 * @returns {Promise<void>}
 */
async function idbPut(dbName, storeName, key, value) {
  const idb = await idbOpen(dbName, storeName);
  return new Promise((resolve, reject) => {
    const tx      = idb.transaction(storeName, 'readwrite');
    const store   = tx.objectStore(storeName);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror   = event => reject(event.target.error);
    tx.oncomplete     = () => idb.close();
  });
}

/**
 * idbGet — Értéket olvas IndexedDB-ből.
 *
 * @param {string} dbName
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<any>}
 */
async function idbGet(dbName, storeName, key) {
  const idb = await idbOpen(dbName, storeName);
  return new Promise((resolve, reject) => {
    const tx      = idb.transaction(storeName, 'readonly');
    const store   = tx.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = event => resolve(event.target.result);
    request.onerror   = event => reject(event.target.error);
    tx.oncomplete     = () => idb.close();
  });
}

/**
 * readFileAsArrayBuffer — File objektumot olvas ArrayBuffer-ré (Promise wrapper).
 *
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = event => resolve(event.target.result);
    reader.onerror = event => reject(event.target.error);
    reader.readAsArrayBuffer(file);
  });
}
