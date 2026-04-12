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
 * @param {{ teljes_nev: string, aliasok?: string, belepesi_datum?: string, statusz?: string, beosztas?: string, megjegyzes?: string }} data
 * @returns {number} Az új rekord id-ja
 */
export function createSofor(data) {
  try {
    const db = getDB();
    db.run(
      `INSERT INTO sofor (teljes_nev, aliasok, belepesi_datum, statusz, beosztas, megjegyzes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.teljes_nev,
        data.aliasok        ?? null,
        data.belepesi_datum ?? null,
        data.statusz        ?? 'aktiv',
        data.beosztas       ?? 'sofor',
        data.megjegyzes     ?? null,
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
    const result = db.exec('SELECT * FROM sofor WHERE torolt = 0 ORDER BY teljes_nev');
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
           beosztas       = COALESCE(?, beosztas),
           megjegyzes     = COALESCE(?, megjegyzes),
           updated_at     = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.teljes_nev     ?? null,
        data.aliasok        ?? null,
        data.belepesi_datum ?? null,
        data.statusz        ?? null,
        data.beosztas       ?? null,
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
    db.run('UPDATE sofor SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    logChange('sofor', id, 'SOFT_DELETE', `Sofőr törölve (soft delete, id=${id})`);
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
    const result = db.exec('SELECT * FROM projekt WHERE torolt = 0 ORDER BY munkaszam');
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
    db.run('UPDATE projekt SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    logChange('projekt', id, 'SOFT_DELETE', `Projekt törölve (soft delete, id=${id})`);
  } catch (err) {
    console.error('[crud] deleteProjekt hiba:', err);
    throw err;
  }
}

// ─── gep_csoport tábla ───────────────────────────────────────────────────────

/**
 * createGepCsoport — Új gépcsoport rekord létrehozása.
 *
 * @param {string} nev
 * @returns {number} Az új rekord id-ja
 */
export function createGepCsoport(nev) {
  try {
    const db = getDB();
    db.run(`INSERT INTO gep_csoport (nev) VALUES (?)`, [nev]);
    const id = lastInsertId();
    logChange('gep_csoport', id, 'INSERT', `Új gépcsoport létrehozva: ${nev}`);
    return id;
  } catch (err) {
    console.error('[crud] createGepCsoport hiba:', err);
    throw err;
  }
}

/**
 * getAllGepCsoport — Az összes gépcsoport lekérése, névsorban.
 *
 * @returns {Object[]}
 */
export function getAllGepCsoport() {
  try {
    const result = getDB().exec(`SELECT * FROM gep_csoport WHERE torolt = 0 ORDER BY nev`);
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getAllGepCsoport hiba:', err);
    throw err;
  }
}

/**
 * updateGepCsoport — Gépcsoport nevének frissítése.
 *
 * @param {number} id
 * @param {string} nev
 */
export function updateGepCsoport(id, nev) {
  try {
    getDB().run(
      `UPDATE gep_csoport SET nev = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [nev, id]
    );
    logChange('gep_csoport', id, 'UPDATE', `Gépcsoport frissítve (id=${id}): ${nev}`);
  } catch (err) {
    console.error('[crud] updateGepCsoport hiba:', err);
    throw err;
  }
}

/**
 * deleteGepCsoport — Gépcsoport törlése.
 * A csoporthoz tartozó gépek csoport_id mezőjét NULL-ra állítja törlés előtt.
 *
 * @param {number} id
 */
export function deleteGepCsoport(id) {
  try {
    getDB().run('UPDATE gep_csoport SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    logChange('gep_csoport', id, 'SOFT_DELETE', `Gépcsoport törölve (soft delete, id=${id})`);
  } catch (err) {
    console.error('[crud] deleteGepCsoport hiba:', err);
    throw err;
  }
}

// ─── gep tábla ───────────────────────────────────────────────────────────────

/**
 * createGep — Új gép rekord létrehozása.
 *
 * @param {{ tipus?: string, rendszam?: string, megjegyzes?: string, vallalkozo?: string, csoport_id?: number|null }} data
 * @returns {number} Az új rekord id-ja
 */
export function createGep(data) {
  try {
    const db = getDB();
    db.run(
      `INSERT INTO gep (tipus, rendszam, megjegyzes, vallalkozo, csoport_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.tipus      ?? null,
        data.rendszam   ?? null,
        data.megjegyzes ?? null,
        data.vallalkozo ?? null,
        data.csoport_id ?? null,
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
    const result = db.exec('SELECT * FROM gep WHERE torolt = 0 ORDER BY tipus');
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
 * Megjegyzés: csoport_id nem COALESCE-vel van kezelve, mert azt NULL-ra is
 * szeretnénk állítani (csoport eltávolítása). Az érték `undefined` esetén
 * NULL-t küldünk — a hívó fél felelőssége, hogy mindig explicit értéket adjon.
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
           vallalkozo = COALESCE(?, vallalkozo),
           csoport_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.tipus      ?? null,
        data.rendszam   ?? null,
        data.megjegyzes ?? null,
        data.vallalkozo ?? null,
        data.csoport_id !== undefined ? data.csoport_id : null,
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
    db.run('UPDATE gep SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    logChange('gep', id, 'SOFT_DELETE', `Gép törölve (soft delete, id=${id})`);
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
    const result = db.exec('SELECT * FROM napi_teny WHERE datum = ? AND torolt = 0 ORDER BY kezd_idopont', [datum]);
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
    db.run('UPDATE napi_teny SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    logChange('napi_teny', id, 'SOFT_DELETE', `Napi tény törölve (soft delete, id=${id})`);
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
    const result = db.exec('SELECT * FROM napi_terv WHERE datum = ? AND torolt = 0 ORDER BY kezdes', [datum]);
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
    db.run('UPDATE napi_terv SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    logChange('napi_terv', id, 'SOFT_DELETE', `Napi terv törölve (soft delete, id=${id})`);
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

// ─── tavollet tábla ──────────────────────────────────────────────────────────

/**
 * createTavollet — Új távollét rekord létrehozása.
 *
 * @param {{ sofor_id: number, datum_tol: string, datum_ig: string, tipus?: string, megjegyzes?: string }} data
 * @returns {number} Az új rekord id-ja
 */
export function createTavollet(data) {
  try {
    const db = getDB();
    db.run(
      `INSERT INTO tavollet (sofor_id, datum_tol, datum_ig, tipus, megjegyzes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.sofor_id,
        data.datum_tol,
        data.datum_ig,
        data.tipus      ?? 'szabadsag',
        data.megjegyzes ?? null,
      ]
    );
    const id = lastInsertId();
    logChange('tavollet', id, 'INSERT',
      `Új távollét létrehozva: sofor_id=${data.sofor_id}, ${data.datum_tol} – ${data.datum_ig}`);
    return id;
  } catch (err) {
    console.error('[crud] createTavollet hiba:', err);
    throw err;
  }
}

/**
 * getAllTavollet — Az összes távollét rekord lekérése, legújabb elöl.
 *
 * @returns {Object[]}
 */
export function getAllTavollet() {
  try {
    const db = getDB();
    const result = db.exec('SELECT * FROM tavollet WHERE torolt = 0 ORDER BY created_at DESC');
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getAllTavollet hiba:', err);
    throw err;
  }
}

/**
 * getTavolletBySofor — Egy sofőr összes távollét rekordjának lekérése.
 *
 * @param {number} sofor_id
 * @returns {Object[]}
 */
export function getTavolletBySofor(sofor_id) {
  try {
    const db = getDB();
    const result = db.exec(
      'SELECT * FROM tavollet WHERE sofor_id = ? ORDER BY datum_tol DESC',
      [sofor_id]
    );
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getTavolletBySofor hiba:', err);
    throw err;
  }
}

/**
 * updateTavollet — Távollét rekord frissítése.
 *
 * @param {number} id
 * @param {Object} data
 */
export function updateTavollet(id, data) {
  try {
    const db = getDB();
    db.run(
      `UPDATE tavollet
       SET sofor_id   = COALESCE(?, sofor_id),
           datum_tol  = COALESCE(?, datum_tol),
           datum_ig   = COALESCE(?, datum_ig),
           tipus      = COALESCE(?, tipus),
           megjegyzes = COALESCE(?, megjegyzes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        data.sofor_id   ?? null,
        data.datum_tol  ?? null,
        data.datum_ig   ?? null,
        data.tipus      ?? null,
        data.megjegyzes ?? null,
        id,
      ]
    );
    logChange('tavollet', id, 'UPDATE', `Távollét frissítve (id=${id}): ${JSON.stringify(data)}`);
  } catch (err) {
    console.error('[crud] updateTavollet hiba:', err);
    throw err;
  }
}

/**
 * deleteTavollet — Távollét rekord törlése.
 *
 * @param {number} id
 */
export function deleteTavollet(id) {
  try {
    const db = getDB();
    db.run('UPDATE tavollet SET torolt = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    logChange('tavollet', id, 'SOFT_DELETE', `Távollét törölve (soft delete, id=${id})`);
  } catch (err) {
    console.error('[crud] deleteTavollet hiba:', err);
    throw err;
  }
}

/**
 * getAktivTavollet — Azon sofőrök távollétei, akik az adott napon távolléten vannak.
 * (datum_tol <= datum <= datum_ig)
 *
 * @param {string} datum - ISO dátum string (pl. '2024-03-15')
 * @returns {Object[]}
 */
export function getAktivTavollet(datum) {
  try {
    const db = getDB();
    const result = db.exec(
      `SELECT * FROM tavollet
       WHERE datum_tol <= ? AND datum_ig >= ? AND torolt = 0
       ORDER BY datum_tol`,
      [datum, datum]
    );
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getAktivTavollet hiba:', err);
    throw err;
  }
}

// ─── kompetencia tábla ───────────────────────────────────────────────────────

/**
 * addKompetencia — Sofőr–gép kompetencia kapcsolat hozzáadása.
 * INSERT OR IGNORE: ha már létezik, csendes sikert ad vissza (nem dob hibát).
 *
 * @param {number} sofor_id
 * @param {number} gep_id
 */
export function addKompetencia(sofor_id, gep_id) {
  try {
    const db = getDB();
    db.run(
      'INSERT OR IGNORE INTO kompetencia (sofor_id, gep_id) VALUES (?, ?)',
      [sofor_id, gep_id]
    );
    const id = lastInsertId();
    logChange('kompetencia', id, 'INSERT',
      `Kompetencia hozzáadva: sofor_id=${sofor_id}, gep_id=${gep_id}`);
  } catch (err) {
    console.error('[crud] addKompetencia hiba:', err);
    throw err;
  }
}

/**
 * removeKompetencia — Sofőr–gép kompetencia kapcsolat eltávolítása (soft delete).
 *
 * @param {number} sofor_id
 * @param {number} gep_id
 */
export function removeKompetencia(sofor_id, gep_id) {
  try {
    const db = getDB();
    db.run(
      'UPDATE kompetencia SET torolt = 1 WHERE sofor_id = ? AND gep_id = ? AND torolt = 0',
      [sofor_id, gep_id]
    );
    logChange('kompetencia', 0, 'SOFT_DELETE',
      `Kompetencia eltávolítva (soft delete): sofor_id=${sofor_id}, gep_id=${gep_id}`);
  } catch (err) {
    console.error('[crud] removeKompetencia hiba:', err);
    throw err;
  }
}

/**
 * getKompetenciaBySofor — Egy sofőr összes kompetencia rekordjának lekérése.
 *
 * @param {number} sofor_id
 * @returns {Object[]}
 */
export function getKompetenciaBySofor(sofor_id) {
  try {
    const db = getDB();
    const result = db.exec(
      'SELECT * FROM kompetencia WHERE sofor_id = ? AND torolt = 0 ORDER BY created_at',
      [sofor_id]
    );
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getKompetenciaBySofor hiba:', err);
    throw err;
  }
}

/**
 * getKompetenciaByGep — Egy géphez tartozó összes kompetencia rekord lekérése.
 *
 * @param {number} gep_id
 * @returns {Object[]}
 */
export function getKompetenciaByGep(gep_id) {
  try {
    const db = getDB();
    const result = db.exec(
      'SELECT * FROM kompetencia WHERE gep_id = ? AND torolt = 0 ORDER BY created_at',
      [gep_id]
    );
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getKompetenciaByGep hiba:', err);
    throw err;
  }
}

/**
 * getSoforokByGep — Azon sofőrök lekérése (teljes rekord), akik jogosultak egy gép kezelésére.
 *
 * @param {number} gep_id
 * @returns {Object[]} sofor rekordok tömbje
 */
export function getSoforokByGep(gep_id) {
  try {
    const db = getDB();
    const result = db.exec(
      `SELECT s.* FROM sofor s
       INNER JOIN kompetencia k ON k.sofor_id = s.id
       WHERE k.gep_id = ? AND k.torolt = 0 AND s.torolt = 0
       ORDER BY s.teljes_nev`,
      [gep_id]
    );
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getSoforokByGep hiba:', err);
    throw err;
  }
}

// ─── kompetencia_csoport tábla ────────────────────────────────────────────────
// Gépcsoport-alapú kompetencia (sofőr ↔ gépcsoport jogosultságok)

/**
 * addKompetenciaCsoport — Sofőr–gépcsoport kompetencia kapcsolat hozzáadása.
 * INSERT OR IGNORE: ha már létezik aktív rekord, csendesen sikert ad.
 *
 * @param {number} sofor_id
 * @param {number} csoport_id
 */
export function addKompetenciaCsoport(sofor_id, csoport_id) {
  try {
    const db = getDB();
    // Ha létezik törölt rekord, aktiváljuk azt; különben újat szúrunk be
    const existing = db.exec(
      'SELECT id FROM kompetencia_csoport WHERE sofor_id = ? AND csoport_id = ?',
      [sofor_id, csoport_id]
    );
    if (existing.length > 0 && existing[0].values.length > 0) {
      const existingId = existing[0].values[0][0];
      db.run('UPDATE kompetencia_csoport SET torolt = 0 WHERE id = ?', [existingId]);
      logChange('kompetencia_csoport', existingId, 'UPDATE',
        `Kompetencia visszaállítva: sofor_id=${sofor_id}, csoport_id=${csoport_id}`);
    } else {
      db.run(
        'INSERT INTO kompetencia_csoport (sofor_id, csoport_id) VALUES (?, ?)',
        [sofor_id, csoport_id]
      );
      const id = lastInsertId();
      logChange('kompetencia_csoport', id, 'INSERT',
        `Csoport-kompetencia hozzáadva: sofor_id=${sofor_id}, csoport_id=${csoport_id}`);
    }
  } catch (err) {
    console.error('[crud] addKompetenciaCsoport hiba:', err);
    throw err;
  }
}

/**
 * removeKompetenciaCsoport — Sofőr–gépcsoport kompetencia eltávolítása (soft delete).
 *
 * @param {number} sofor_id
 * @param {number} csoport_id
 */
export function removeKompetenciaCsoport(sofor_id, csoport_id) {
  try {
    const db = getDB();
    db.run(
      'UPDATE kompetencia_csoport SET torolt = 1 WHERE sofor_id = ? AND csoport_id = ? AND torolt = 0',
      [sofor_id, csoport_id]
    );
    logChange('kompetencia_csoport', 0, 'SOFT_DELETE',
      `Csoport-kompetencia eltávolítva: sofor_id=${sofor_id}, csoport_id=${csoport_id}`);
  } catch (err) {
    console.error('[crud] removeKompetenciaCsoport hiba:', err);
    throw err;
  }
}

/**
 * getKompetenciaCsoportBySofor — Egy sofőr aktív gépcsoport-kompetenciáinak lekérése.
 *
 * @param {number} sofor_id
 * @returns {Object[]} kompetencia_csoport rekordok
 */
export function getKompetenciaCsoportBySofor(sofor_id) {
  try {
    const db = getDB();
    const result = db.exec(
      `SELECT kc.*, gc.nev as csoport_nev
       FROM kompetencia_csoport kc
       INNER JOIN gep_csoport gc ON gc.id = kc.csoport_id
       WHERE kc.sofor_id = ? AND kc.torolt = 0
       ORDER BY gc.nev`,
      [sofor_id]
    );
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getKompetenciaCsoportBySofor hiba:', err);
    throw err;
  }
}

/**
 * getSoforokByCsoportKompetencia — Azon sofőrök lekérése, akiknek kompetenciájuk van
 * egy adott gépcsoportra.
 *
 * @param {number} csoport_id
 * @returns {Object[]} sofor rekordok
 */
export function getSoforokByCsoportKompetencia(csoport_id) {
  try {
    const db = getDB();
    const result = db.exec(
      `SELECT s.* FROM sofor s
       INNER JOIN kompetencia_csoport kc ON kc.sofor_id = s.id
       WHERE kc.csoport_id = ? AND kc.torolt = 0 AND s.torolt = 0
       ORDER BY s.teljes_nev`,
      [csoport_id]
    );
    return rowsToObjects(result);
  } catch (err) {
    console.error('[crud] getSoforokByCsoportKompetencia hiba:', err);
    throw err;
  }
}
