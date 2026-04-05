/**
 * crud.js — CRUD wrapper függvények és audit log
 *
 * Minden write művelet (create/update/delete) automatikusan naplóz
 * a valtozas_log táblába. A modul az aktív db példányt mindig
 * a getDB() hívással szerzi be — soha nem tárolja lokálisan.
 *
 * sql.js result struktúra: { columns: string[], values: any[][] }
 * A rowsToObjects() segédfüggvény ezt alakítja JS objektumok tömbjévé.
 */

import { getDB } from './db.js';
import { getIdentity } from './identity.js';

// ─── Belső segédfüggvények ───────────────────────────────────────────────────

/**
 * rowsToObjects — sql.js exec() eredményét JS objektumok tömbjévé alakítja.
 *
 * Az exec() egy tömböt ad vissza, ahol minden elem egy SELECT eredmény:
 *   [{ columns: ['id','nev',...], values: [[1,'Péter'],[2,'Pál']] }, ...]
 *
 * Ha az eredmény üres (nincs egyező sor), üres tömböt ad vissza.
 *
 * @param {Array} resultSet - db.exec() visszatérési értéke
 * @returns {Object[]}
 */
function rowsToObjects(resultSet) {
  // exec() üres tömböt ad vissza, ha nincs eredmény
  if (!resultSet || resultSet.length === 0) return [];

  const { columns, values } = resultSet[0];

  if (!values || values.length === 0) return [];

  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * logChange — Változásnaplót ír a valtozas_log táblába.
 *
 * Minden create/update/delete művelet után automatikusan hívódik.
 * A felhasználó nevét a settings oldalon beállított identity adja
 * (localStorage "dispatcher_identity"), alapértelmezés: 'Ismeretlen'.
 *
 * @param {string} tabla     - Érintett tábla neve (pl. 'sofor')
 * @param {number} rekord_id - Érintett rekord azonosítója
 * @param {string} muvelet   - 'INSERT' | 'UPDATE' | 'DELETE'
 * @param {string} leiras    - Emberi olvasható leírás
 */
function logChange(tabla, rekord_id, muvelet, leiras) {
  try {
    const db = getDB();
    const felhasznalo = getIdentity().name;
    db.run(
      `INSERT INTO valtozas_log (tabla, rekord_id, muvelet, felhasznalo, leiras)
       VALUES (?, ?, ?, ?, ?)`,
      [tabla, rekord_id, muvelet, felhasznalo, leiras]
    );
  } catch (err) {
    // Az audit log hiba nem szakítja meg a fő műveletet — csak logolunk
    console.error('[crud] logChange hiba:', err);
  }
}

/**
 * lastInsertId — Az utolsó INSERT által generált ROWID lekérése.
 *
 * sql.js nem adja vissza a lastInsertRowid-t db.run()-ból,
 * ezért SELECT last_insert_rowid()-vel kérdezzük le.
 *
 * @returns {number}
 */
function lastInsertId() {
  const db = getDB();
  const result = db.exec('SELECT last_insert_rowid()');
  return result[0].values[0][0];
}

// ─── sofor tábla ─────────────────────────────────────────────────────────────

/**
 * createSofor — Új sofőr rekord létrehozása.
 *
 * @param {{ teljes_nev: string, aliasok?: string, belepesi_datum?: string, statusz?: string, megjegyzes?: string }} data
 * @returns {number} Az új rekord id-ja
 */
export function createSofor(data) {
  try {
    const db = getDB();
    db.run(
      `INSERT INTO sofor (teljes_nev, aliasok, belepesi_datum, statusz, megjegyzes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.teljes_nev,
        data.aliasok    ?? null,
        data.belepesi_datum ?? null,
        data.statusz    ?? 'aktiv',
        data.megjegyzes ?? null,
      ]
    );
    const id = lastInsertId();
    logChange('sofor', id, 'INSERT', `Új sofőr létrehozva: ${data.teljes_nev}`);
    return id;
  } catch (err) {
    console.error('[crud] createSofor hiba:', err);
    throw err;
  }
}

/**
 * getAllSoforok — Az összes sofőr lekérése, created_at szerint csökkenő sorrendben.
 *
 * @returns {Object[]}
 */
export function getAllSoforok() {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM sofor ORDER BY created_at DESC');
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getAllSoforok hiba:', err);
    throw err;
  }
}

/**
 * getSoforById — Egy sofőr lekérése id alapján.
 *
 * @param {number} id
 * @returns {Object|null}
 */
export function getSoforById(id) {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM sofor WHERE id = ?', [id]);
    const rows = rowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[crud] getSoforById hiba:', err);
    throw err;
  }
}

/**
 * updateSofor — Sofőr rekord frissítése. Automatikusan beállítja az updated_at-t.
 *
 * @param {number} id
 * @param {Object} data - A frissítendő mezők (csak a megadottak változnak)
 */
export function updateSofor(id, data) {
  try {
    const db = getDB();
    db.run(
      `UPDATE sofor
       SET teljes_nev     = COALESCE(?, teljes_nev),
           aliasok        = COALESCE(?, aliasok),
           belepesi_datum = COALESCE(?, belepesi_datum),
           statusz        = COALESCE(?, statusz),
           megjegyzes     = COALESCE(?, megjegyzes),
           updated_at     = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.teljes_nev     ?? null,
        data.aliasok        ?? null,
        data.belepesi_datum ?? null,
        data.statusz        ?? null,
        data.megjegyzes     ?? null,
        id,
      ]
    );
    logChange('sofor', id, 'UPDATE', `Sofőr frissítve (id=${id}): ${JSON.stringify(data)}`);
  } catch (err) {
    console.error('[crud] updateSofor hiba:', err);
    throw err;
  }
}

/**
 * deleteSofor — Sofőr rekord törlése.
 *
 * @param {number} id
 */
export function deleteSofor(id) {
  try {
    const db = getDB();
    db.run('DELETE FROM sofor WHERE id = ?', [id]);
    logChange('sofor', id, 'DELETE', `Sofőr törölve (id=${id})`);
  } catch (err) {
    console.error('[crud] deleteSofor hiba:', err);
    throw err;
  }
}

// ─── projekt tábla ───────────────────────────────────────────────────────────

/**
 * createProjekt — Új projekt rekord létrehozása.
 *
 * @param {{ munkaszam: string, helyszin?: string, megrendelo?: string, leiras?: string }} data
 * @returns {number} Az új rekord id-ja
 */
export function createProjekt(data) {
  try {
    const db = getDB();
    db.run(
      `INSERT INTO projekt (munkaszam, helyszin, megrendelo, leiras)
       VALUES (?, ?, ?, ?)`,
      [
        data.munkaszam,
        data.helyszin   ?? null,
        data.megrendelo ?? null,
        data.leiras     ?? null,
      ]
    );
    const id = lastInsertId();
    logChange('projekt', id, 'INSERT', `Új projekt létrehozva: ${data.munkaszam}`);
    return id;
  } catch (err) {
    console.error('[crud] createProjekt hiba:', err);
    throw err;
  }
}

/**
 * getAllProjektek — Az összes projekt lekérése.
 *
 * @returns {Object[]}
 */
export function getAllProjektek() {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM projekt ORDER BY created_at DESC');
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getAllProjektek hiba:', err);
    throw err;
  }
}

/**
 * getProjektById — Egy projekt lekérése id alapján.
 *
 * @param {number} id
 * @returns {Object|null}
 */
export function getProjektById(id) {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM projekt WHERE id = ?', [id]);
    const rows = rowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[crud] getProjektById hiba:', err);
    throw err;
  }
}

/**
 * updateProjekt — Projekt rekord frissítése.
 *
 * @param {number} id
 * @param {Object} data
 */
export function updateProjekt(id, data) {
  try {
    const db = getDB();
    db.run(
      `UPDATE projekt
       SET munkaszam   = COALESCE(?, munkaszam),
           helyszin    = COALESCE(?, helyszin),
           megrendelo  = COALESCE(?, megrendelo),
           leiras      = COALESCE(?, leiras),
           updated_at  = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.munkaszam  ?? null,
        data.helyszin   ?? null,
        data.megrendelo ?? null,
        data.leiras     ?? null,
        id,
      ]
    );
    logChange('projekt', id, 'UPDATE', `Projekt frissítve (id=${id}): ${JSON.stringify(data)}`);
  } catch (err) {
    console.error('[crud] updateProjekt hiba:', err);
    throw err;
  }
}

/**
 * deleteProjekt — Projekt rekord törlése.
 *
 * @param {number} id
 */
export function deleteProjekt(id) {
  try {
    const db = getDB();
    db.run('DELETE FROM projekt WHERE id = ?', [id]);
    logChange('projekt', id, 'DELETE', `Projekt törölve (id=${id})`);
  } catch (err) {
    console.error('[crud] deleteProjekt hiba:', err);
    throw err;
  }
}

// ─── gep tábla ───────────────────────────────────────────────────────────────

/**
 * createGep — Új gép rekord létrehozása.
 *
 * @param {{ tipus?: string, rendszam?: string, megjegyzes?: string }} data
 * @returns {number} Az új rekord id-ja
 */
export function createGep(data) {
  try {
    const db = getDB();
    db.run(
      `INSERT INTO gep (tipus, rendszam, megjegyzes)
       VALUES (?, ?, ?)`,
      [
        data.tipus      ?? null,
        data.rendszam   ?? null,
        data.megjegyzes ?? null,
      ]
    );
    const id = lastInsertId();
    logChange('gep', id, 'INSERT', `Új gép létrehozva: ${data.rendszam ?? data.tipus ?? 'ismeretlen'}`);
    return id;
  } catch (err) {
    console.error('[crud] createGep hiba:', err);
    throw err;
  }
}

/**
 * getAllGepek — Az összes gép lekérése.
 *
 * @returns {Object[]}
 */
export function getAllGepek() {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM gep ORDER BY created_at DESC');
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getAllGepek hiba:', err);
    throw err;
  }
}

/**
 * getGepById — Egy gép lekérése id alapján.
 *
 * @param {number} id
 * @returns {Object|null}
 */
export function getGepById(id) {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM gep WHERE id = ?', [id]);
    const rows = rowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[crud] getGepById hiba:', err);
    throw err;
  }
}

/**
 * updateGep — Gép rekord frissítése.
 *
 * @param {number} id
 * @param {Object} data
 */
export function updateGep(id, data) {
  try {
    const db = getDB();
    db.run(
      `UPDATE gep
       SET tipus      = COALESCE(?, tipus),
           rendszam   = COALESCE(?, rendszam),
           megjegyzes = COALESCE(?, megjegyzes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.tipus      ?? null,
        data.rendszam   ?? null,
        data.megjegyzes ?? null,
        id,
      ]
    );
    logChange('gep', id, 'UPDATE', `Gép frissítve (id=${id}): ${JSON.stringify(data)}`);
  } catch (err) {
    console.error('[crud] updateGep hiba:', err);
    throw err;
  }
}

/**
 * deleteGep — Gép rekord törlése.
 *
 * @param {number} id
 */
export function deleteGep(id) {
  try {
    const db = getDB();
    db.run('DELETE FROM gep WHERE id = ?', [id]);
    logChange('gep', id, 'DELETE', `Gép törölve (id=${id})`);
  } catch (err) {
    console.error('[crud] deleteGep hiba:', err);
    throw err;
  }
}

// ─── napi_teny tábla ─────────────────────────────────────────────────────────

/**
 * createNapiTeny — Új napi tény rekord létrehozása.
 *
 * @param {{ datum: string, sofor_id: number, projekt_id?: number, gep_id?: number,
 *           kezd_idopont?: string, befejezes_idopont?: string, munkaora?: number,
 *           fuvarok_szama?: number, allapot?: string, megjegyzes?: string }} data
 * @returns {number} Az új rekord id-ja
 */
export function createNapiTeny(data) {
  try {
    const db = getDB();
    db.run(
      `INSERT INTO napi_teny
         (datum, sofor_id, projekt_id, gep_id, kezd_idopont, befejezes_idopont,
          munkaora, fuvarok_szama, allapot, megjegyzes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.datum,
        data.sofor_id,
        data.projekt_id         ?? null,
        data.gep_id             ?? null,
        data.kezd_idopont       ?? null,
        data.befejezes_idopont  ?? null,
        data.munkaora           ?? null,
        data.fuvarok_szama      ?? null,
        data.allapot            ?? 'rogzitett',
        data.megjegyzes         ?? null,
      ]
    );
    const id = lastInsertId();
    logChange('napi_teny', id, 'INSERT', `Új napi tény létrehozva: ${data.datum}, sofőr id=${data.sofor_id}`);
    return id;
  } catch (err) {
    console.error('[crud] createNapiTeny hiba:', err);
    throw err;
  }
}

/**
 * getNapiTenyByDatum — Adott naphoz tartozó összes tény rekord lekérése.
 *
 * @param {string} datum - ISO dátum string (pl. '2024-03-15')
 * @returns {Object[]}
 */
export function getNapiTenyByDatum(datum) {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM napi_teny WHERE datum = ? ORDER BY kezd_idopont', [datum]);
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getNapiTenyByDatum hiba:', err);
    throw err;
  }
}

/**
 * getNapiTenyById — Egy napi tény rekord lekérése id alapján.
 *
 * @param {number} id
 * @returns {Object|null}
 */
export function getNapiTenyById(id) {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM napi_teny WHERE id = ?', [id]);
    const rows = rowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[crud] getNapiTenyById hiba:', err);
    throw err;
  }
}

/**
 * updateNapiTeny — Napi tény rekord frissítése.
 *
 * @param {number} id
 * @param {Object} data
 */
export function updateNapiTeny(id, data) {
  try {
    const db = getDB();
    db.run(
      `UPDATE napi_teny
       SET datum               = COALESCE(?, datum),
           sofor_id            = COALESCE(?, sofor_id),
           projekt_id          = COALESCE(?, projekt_id),
           gep_id              = COALESCE(?, gep_id),
           kezd_idopont        = COALESCE(?, kezd_idopont),
           befejezes_idopont   = COALESCE(?, befejezes_idopont),
           munkaora            = COALESCE(?, munkaora),
           fuvarok_szama       = COALESCE(?, fuvarok_szama),
           allapot             = COALESCE(?, allapot),
           megjegyzes          = COALESCE(?, megjegyzes),
           updated_at          = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.datum              ?? null,
        data.sofor_id           ?? null,
        data.projekt_id         ?? null,
        data.gep_id             ?? null,
        data.kezd_idopont       ?? null,
        data.befejezes_idopont  ?? null,
        data.munkaora           ?? null,
        data.fuvarok_szama      ?? null,
        data.allapot            ?? null,
        data.megjegyzes         ?? null,
        id,
      ]
    );
    logChange('napi_teny', id, 'UPDATE', `Napi tény frissítve (id=${id}): ${JSON.stringify(data)}`);
  } catch (err) {
    console.error('[crud] updateNapiTeny hiba:', err);
    throw err;
  }
}

/**
 * deleteNapiTeny — Napi tény rekord törlése.
 *
 * @param {number} id
 */
export function deleteNapiTeny(id) {
  try {
    const db = getDB();
    db.run('DELETE FROM napi_teny WHERE id = ?', [id]);
    logChange('napi_teny', id, 'DELETE', `Napi tény törölve (id=${id})`);
  } catch (err) {
    console.error('[crud] deleteNapiTeny hiba:', err);
    throw err;
  }
}

// ─── napi_terv tábla ─────────────────────────────────────────────────────────

/**
 * createNapiTerv — Új napi terv rekord létrehozása.
 *
 * @param {{ datum: string, sofor_id: number, projekt_id?: number, gep_id?: number,
 *           kezdes?: string, vegez?: string, allapot?: string,
 *           megjegyzes?: string, forras?: string }} data
 * @returns {number} Az új rekord id-ja
 */
export function createNapiTerv(data) {
  try {
    const db = getDB();
    db.run(
      `INSERT INTO napi_terv
         (datum, sofor_id, projekt_id, gep_id, kezdes, vegez, allapot, megjegyzes, forras)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.datum,
        data.sofor_id,
        data.projekt_id ?? null,
        data.gep_id     ?? null,
        data.kezdes     ?? null,
        data.vegez      ?? null,
        data.allapot    ?? 'javasolt',
        data.megjegyzes ?? null,
        data.forras     ?? 'manualis',
      ]
    );
    const id = lastInsertId();
    logChange('napi_terv', id, 'INSERT', `Új napi terv létrehozva: ${data.datum}, sofőr id=${data.sofor_id}`);
    return id;
  } catch (err) {
    console.error('[crud] createNapiTerv hiba:', err);
    throw err;
  }
}

/**
 * getNapiTervByDatum — Adott naphoz tartozó összes terv rekord lekérése.
 *
 * @param {string} datum - ISO dátum string (pl. '2024-03-15')
 * @returns {Object[]}
 */
export function getNapiTervByDatum(datum) {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM napi_terv WHERE datum = ? ORDER BY kezdes', [datum]);
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getNapiTervByDatum hiba:', err);
    throw err;
  }
}

/**
 * getNapiTervById — Egy napi terv rekord lekérése id alapján.
 *
 * @param {number} id
 * @returns {Object|null}
 */
export function getNapiTervById(id) {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM napi_terv WHERE id = ?', [id]);
    const rows = rowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[crud] getNapiTervById hiba:', err);
    throw err;
  }
}

/**
 * updateNapiTerv — Napi terv rekord frissítése.
 *
 * @param {number} id
 * @param {Object} data
 */
export function updateNapiTerv(id, data) {
  try {
    const db = getDB();
    db.run(
      `UPDATE napi_terv
       SET datum       = COALESCE(?, datum),
           sofor_id    = COALESCE(?, sofor_id),
           projekt_id  = COALESCE(?, projekt_id),
           gep_id      = COALESCE(?, gep_id),
           kezdes      = COALESCE(?, kezdes),
           vegez       = COALESCE(?, vegez),
           allapot     = COALESCE(?, allapot),
           megjegyzes  = COALESCE(?, megjegyzes),
           forras      = COALESCE(?, forras),
           updated_at  = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.datum      ?? null,
        data.sofor_id   ?? null,
        data.projekt_id ?? null,
        data.gep_id     ?? null,
        data.kezdes     ?? null,
        data.vegez      ?? null,
        data.allapot    ?? null,
        data.megjegyzes ?? null,
        data.forras     ?? null,
        id,
      ]
    );
    logChange('napi_terv', id, 'UPDATE', `Napi terv frissítve (id=${id}): ${JSON.stringify(data)}`);
  } catch (err) {
    console.error('[crud] updateNapiTerv hiba:', err);
    throw err;
  }
}

/**
 * deleteNapiTerv — Napi terv rekord törlése.
 *
 * @param {number} id
 */
export function deleteNapiTerv(id) {
  try {
    const db = getDB();
    db.run('DELETE FROM napi_terv WHERE id = ?', [id]);
    logChange('napi_terv', id, 'DELETE', `Napi terv törölve (id=${id})`);
  } catch (err) {
    console.error('[crud] deleteNapiTerv hiba:', err);
    throw err;
  }
}

// ─── Publikus segédfüggvény (teszteléshez, diagnosztikához) ──────────────────

/**
 * getValtozasLog — Az összes audit log bejegyzés lekérése, legújabb elöl.
 *
 * Nem szükséges a fő CRUD API-hoz, de a teszteléshez és az UI-hoz hasznos.
 *
 * @returns {Object[]}
 */
export function getValtozasLog() {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM valtozas_log ORDER BY idopont DESC');
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getValtozasLog hiba:', err);
    throw err;
  }
}
