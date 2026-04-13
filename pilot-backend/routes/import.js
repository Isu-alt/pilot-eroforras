import { Router } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { query, getClient } from '../db.js';
import { authenticate, requireDispatcher } from '../auth.js';
import { auditLog } from '../middleware/audit.js';

const router = Router();

// Multer: memóriában tartjuk a feltöltött fájlt (nem írjuk lemezre)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Csak .xlsx fájl fogadható el.'));
    }
  },
});

router.use(authenticate, requireDispatcher);

// ─── Segédfüggvények ────────────────────────────────────────────────────────

/**
 * Normalizál egy nevet az összehasonlításhoz:
 * kisbetű, ékezet nélkül, extra szóköz nélkül
 */
function normalizeName(str) {
  if (!str) return '';
  return str
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy match: visszaadja a legjobban egyező sofőr id-ját,
 * ha a normalizált nevek megegyeznek vagy az egyik tartalmazza a másikat.
 */
function fuzzyMatchSofor(name, soforok) {
  const norm = normalizeName(name);
  if (!norm) return null;

  // 1. Pontos egyezés
  const exact = soforok.find(s => normalizeName(s.teljes_nev) === norm);
  if (exact) return exact.id;

  // 2. Alias egyezés (aliasok vesszővel elválasztott lista)
  const byAlias = soforok.find(s => {
    if (!s.aliasok) return false;
    const aliases = s.aliasok.split(',').map(a => normalizeName(a.trim()));
    return aliases.includes(norm);
  });
  if (byAlias) return byAlias.id;

  // 3. Tartalmaz (egyik a másikban)
  const partial = soforok.find(s => {
    const sNorm = normalizeName(s.teljes_nev);
    return sNorm.includes(norm) || norm.includes(sNorm);
  });
  if (partial) return partial.id;

  return null;
}

/**
 * Excel cella értékét stringgé alakítja.
 */
function cellValue(cell) {
  if (cell == null || cell.value == null) return null;
  const v = cell.value;
  if (typeof v === 'object' && v.text) return v.text.toString().trim();  // rich text
  if (typeof v === 'object' && v.result != null) return v.result.toString().trim(); // formula
  return v.toString().trim();
}

/**
 * Excel soros date (serial number) → 'YYYY-MM-DD' string, vagy null ha nem dátum
 */
function excelDateToStr(cell) {
  const v = cell?.value;
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  const s = cellValue(cell);
  if (!s) return null;
  // Próbálja Date-ként értelmezni
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

// ─── POST /api/import/soforok ────────────────────────────────────────────────

/**
 * POST /api/import/soforok
 * Multipart Excel upload. Várt oszlopok (első sor = fejléc):
 *   id | teljes_nev | aliasok | belepesi_datum | statusz | beosztas | megjegyzes
 *
 * Ha az id-val egyező rekord létezik → UPDATE, egyébként INSERT.
 * Ha nincs id de a név egyezik (fuzzy) → UPDATE, egyébként INSERT.
 */
router.post('/soforok', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nincs feltöltött fájl.' });
  }

  const felhasznalo = req.user?.nev || req.user?.felhasznalonev || 'rendszer';
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ error: 'Az Excel fájl üres.' });
    }

    // Fejléc sor beolvasása (1. sor)
    const headers = [];
    sheet.getRow(1).eachCell((cell, colNum) => {
      headers[colNum] = normalizeName(cellValue(cell));
    });

    const colIdx = (name) => headers.indexOf(normalizeName(name)) + 1 || null;
    const COL = {
      id:             colIdx('id'),
      teljes_nev:     colIdx('teljes_nev'),
      aliasok:        colIdx('aliasok'),
      belepesi_datum: colIdx('belepesi_datum'),
      statusz:        colIdx('statusz'),
      beosztas:       colIdx('beosztas'),
      megjegyzes:     colIdx('megjegyzes'),
    };

    if (!COL.teljes_nev) {
      return res.status(400).json({ error: 'Hiányzó kötelező oszlop: teljes_nev' });
    }

    // Meglévő sofőrök betöltése fuzzy matchhez
    const existingRes = await query('SELECT id, teljes_nev, aliasok FROM sofor WHERE torolt = FALSE');
    const soforok = existingRes.rows;

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);

      const teljes_nev = COL.teljes_nev ? cellValue(row.getCell(COL.teljes_nev)) : null;
      if (!teljes_nev) continue; // Üres sor kihagyása

      try {
        const idCell = COL.id ? cellValue(row.getCell(COL.id)) : null;
        const importId = idCell ? parseInt(idCell, 10) : null;

        const data = {
          teljes_nev,
          aliasok:        COL.aliasok        ? cellValue(row.getCell(COL.aliasok))        : null,
          belepesi_datum: COL.belepesi_datum  ? excelDateToStr(row.getCell(COL.belepesi_datum)) : null,
          statusz:        COL.statusz        ? cellValue(row.getCell(COL.statusz))        : null,
          beosztas:       COL.beosztas       ? cellValue(row.getCell(COL.beosztas))       : null,
          megjegyzes:     COL.megjegyzes     ? cellValue(row.getCell(COL.megjegyzes))     : null,
        };

        // Megkeresés: id elsőbbsége, majd fuzzy match
        let existingId = null;
        if (importId && !isNaN(importId)) {
          const check = await query('SELECT id FROM sofor WHERE id = $1 AND torolt = FALSE', [importId]);
          if (check.rows.length > 0) existingId = importId;
        }
        if (!existingId) {
          existingId = fuzzyMatchSofor(teljes_nev, soforok);
        }

        if (existingId) {
          await query(
            `UPDATE sofor SET
              teljes_nev     = COALESCE($1, teljes_nev),
              aliasok        = COALESCE($2, aliasok),
              belepesi_datum = COALESCE($3, belepesi_datum),
              statusz        = COALESCE($4, statusz),
              beosztas       = COALESCE($5, beosztas),
              megjegyzes     = COALESCE($6, megjegyzes)
             WHERE id = $7`,
            [data.teljes_nev, data.aliasok, data.belepesi_datum, data.statusz, data.beosztas, data.megjegyzes, existingId]
          );
          await auditLog('sofor', existingId, 'UPDATE', `Import frissítés: ${teljes_nev}`, felhasznalo);
          results.updated++;
          // Frissítjük a cache-t is
          const idx = soforok.findIndex(s => s.id === existingId);
          if (idx >= 0) soforok[idx].teljes_nev = teljes_nev;
        } else {
          const insRes = await query(
            `INSERT INTO sofor (teljes_nev, aliasok, belepesi_datum, statusz, beosztas, megjegyzes)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [
              data.teljes_nev,
              data.aliasok,
              data.belepesi_datum,
              data.statusz    || 'aktiv',
              data.beosztas   || 'sofor',
              data.megjegyzes,
            ]
          );
          const newId = insRes.rows[0].id;
          await auditLog('sofor', newId, 'INSERT', `Import felvétel: ${teljes_nev}`, felhasznalo);
          soforok.push({ id: newId, teljes_nev, aliasok: data.aliasok });
          results.inserted++;
        }
      } catch (rowErr) {
        results.errors.push({ row: rowNum, error: rowErr.message });
        results.skipped++;
      }
    }

    res.json({ message: 'Sofőr import kész.', ...results });
  } catch (err) {
    console.error('[import/soforok]', err);
    res.status(500).json({ error: 'Import hiba: ' + err.message });
  }
});

// ─── POST /api/import/gepek ──────────────────────────────────────────────────

/**
 * POST /api/import/gepek
 * Várt oszlopok: id | tipus | rendszam | megjegyzes | vallalkozo | csoport_nev | allapot
 *
 * Upsert: id → rendszam egyezés sorrendben.
 * csoport_nev alapján megkeresi a csoport_id-t.
 */
router.post('/gepek', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nincs feltöltött fájl.' });
  }

  const felhasznalo = req.user?.nev || req.user?.felhasznalonev || 'rendszer';
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ error: 'Az Excel fájl üres.' });

    const headers = [];
    sheet.getRow(1).eachCell((cell, colNum) => {
      headers[colNum] = normalizeName(cellValue(cell));
    });
    const colIdx = (name) => headers.indexOf(normalizeName(name)) + 1 || null;
    const COL = {
      id:          colIdx('id'),
      tipus:       colIdx('tipus'),
      rendszam:    colIdx('rendszam'),
      megjegyzes:  colIdx('megjegyzes'),
      vallalkozo:  colIdx('vallalkozo'),
      csoport_nev: colIdx('csoport_nev'),
      allapot:     colIdx('allapot'),
    };

    // Gépcsoportok betöltése (nev → id map)
    const csoportRes = await query('SELECT id, nev FROM gep_csoport WHERE torolt = FALSE');
    const csoportMap = new Map(csoportRes.rows.map(r => [normalizeName(r.nev), r.id]));

    // Meglévő gépek rendszám → id map
    const gepRes = await query('SELECT id, rendszam FROM gep WHERE torolt = FALSE');
    const rendszamMap = new Map(gepRes.rows.filter(r => r.rendszam).map(r => [r.rendszam.trim().toUpperCase(), r.id]));

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const tipus    = COL.tipus    ? cellValue(row.getCell(COL.tipus))    : null;
      const rendszam = COL.rendszam ? cellValue(row.getCell(COL.rendszam)) : null;

      if (!tipus && !rendszam) continue;

      try {
        const idCell = COL.id ? cellValue(row.getCell(COL.id)) : null;
        const importId = idCell ? parseInt(idCell, 10) : null;

        const csoportNev = COL.csoport_nev ? cellValue(row.getCell(COL.csoport_nev)) : null;
        const csoport_id = csoportNev ? (csoportMap.get(normalizeName(csoportNev)) || null) : null;

        const data = {
          tipus,
          rendszam,
          megjegyzes:  COL.megjegyzes ? cellValue(row.getCell(COL.megjegyzes)) : null,
          vallalkozo:  COL.vallalkozo ? cellValue(row.getCell(COL.vallalkozo)) : null,
          csoport_id,
          allapot:     COL.allapot    ? cellValue(row.getCell(COL.allapot))    : null,
        };

        let existingId = null;
        if (importId && !isNaN(importId)) {
          const check = await query('SELECT id FROM gep WHERE id = $1 AND torolt = FALSE', [importId]);
          if (check.rows.length > 0) existingId = importId;
        }
        if (!existingId && rendszam) {
          existingId = rendszamMap.get(rendszam.trim().toUpperCase()) || null;
        }

        if (existingId) {
          await query(
            `UPDATE gep SET
              tipus      = COALESCE($1, tipus),
              rendszam   = COALESCE($2, rendszam),
              megjegyzes = COALESCE($3, megjegyzes),
              vallalkozo = COALESCE($4, vallalkozo),
              csoport_id = COALESCE($5, csoport_id),
              allapot    = COALESCE($6, allapot)
             WHERE id = $7`,
            [data.tipus, data.rendszam, data.megjegyzes, data.vallalkozo, data.csoport_id, data.allapot, existingId]
          );
          await auditLog('gep', existingId, 'UPDATE', `Import frissítés: ${tipus} ${rendszam}`, felhasznalo);
          results.updated++;
        } else {
          const insRes = await query(
            `INSERT INTO gep (tipus, rendszam, megjegyzes, vallalkozo, csoport_id, allapot)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [data.tipus, data.rendszam, data.megjegyzes, data.vallalkozo, data.csoport_id, data.allapot || 'elerheto']
          );
          const newId = insRes.rows[0].id;
          await auditLog('gep', newId, 'INSERT', `Import felvétel: ${tipus} ${rendszam}`, felhasznalo);
          if (rendszam) rendszamMap.set(rendszam.trim().toUpperCase(), newId);
          results.inserted++;
        }
      } catch (rowErr) {
        results.errors.push({ row: rowNum, error: rowErr.message });
        results.skipped++;
      }
    }

    res.json({ message: 'Gép import kész.', ...results });
  } catch (err) {
    console.error('[import/gepek]', err);
    res.status(500).json({ error: 'Import hiba: ' + err.message });
  }
});

// ─── POST /api/import/napi_terv ──────────────────────────────────────────────

/**
 * POST /api/import/napi_terv
 * Várt oszlopok: datum | sofor_nev | munkaszam | gep_rendszam | kezdes | vegez | megjegyzes
 *
 * - datum: YYYY-MM-DD
 * - sofor_nev: fuzzy match a sofor táblával
 * - munkaszam: egyezés a projekt.munkaszam mezővel
 * - gep_rendszam: egyezés a gep.rendszam mezővel
 * Ha az adott datumra + sofor_id + gep_id kombináció már létezik → UPDATE, egyébként INSERT
 */
router.post('/napi_terv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nincs feltöltött fájl.' });
  }

  const felhasznalo = req.user?.nev || req.user?.felhasznalonev || 'rendszer';
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) return res.status(400).json({ error: 'Az Excel fájl üres.' });

    const headers = [];
    sheet.getRow(1).eachCell((cell, colNum) => {
      headers[colNum] = normalizeName(cellValue(cell));
    });
    const colIdx = (name) => headers.indexOf(normalizeName(name)) + 1 || null;
    const COL = {
      datum:        colIdx('datum'),
      sofor_nev:    colIdx('sofor_nev') || colIdx('sofor'),
      munkaszam:    colIdx('munkaszam'),
      gep_rendszam: colIdx('gep_rendszam') || colIdx('rendszam'),
      kezdes:       colIdx('kezdes'),
      vegez:        colIdx('vegez'),
      megjegyzes:   colIdx('megjegyzes'),
      allapot:      colIdx('allapot'),
    };

    if (!COL.datum) {
      return res.status(400).json({ error: 'Hiányzó kötelező oszlop: datum' });
    }

    // Referenciatáblák betöltése
    const [soforRes, projektRes, gepRes] = await Promise.all([
      query('SELECT id, teljes_nev, aliasok FROM sofor WHERE torolt = FALSE'),
      query('SELECT id, munkaszam FROM projekt WHERE torolt = FALSE'),
      query('SELECT id, rendszam FROM gep WHERE torolt = FALSE'),
    ]);

    const soforok  = soforRes.rows;
    const projektMap = new Map(projektRes.rows.map(r => [r.munkaszam.trim(), r.id]));
    const gepMap     = new Map(gepRes.rows.filter(r => r.rendszam).map(r => [r.rendszam.trim().toUpperCase(), r.id]));

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);

      const datumStr = COL.datum ? excelDateToStr(row.getCell(COL.datum)) : null;
      if (!datumStr) continue;

      try {
        const soforNev    = COL.sofor_nev    ? cellValue(row.getCell(COL.sofor_nev))    : null;
        const munkaszam   = COL.munkaszam    ? cellValue(row.getCell(COL.munkaszam))    : null;
        const gepRendszam = COL.gep_rendszam ? cellValue(row.getCell(COL.gep_rendszam)) : null;
        const kezdes      = COL.kezdes       ? cellValue(row.getCell(COL.kezdes))       : null;
        const vegez       = COL.vegez        ? cellValue(row.getCell(COL.vegez))        : null;
        const megjegyzes  = COL.megjegyzes   ? cellValue(row.getCell(COL.megjegyzes))   : null;
        const allapot     = COL.allapot      ? cellValue(row.getCell(COL.allapot))      : null;

        const sofor_id   = soforNev    ? fuzzyMatchSofor(soforNev, soforok)                          : null;
        const projekt_id = munkaszam   ? (projektMap.get(munkaszam.trim()) || null)                   : null;
        const gep_id     = gepRendszam ? (gepMap.get(gepRendszam.trim().toUpperCase()) || null)       : null;

        // Egyedi kulcs: datum + sofor_id + gep_id (ha mindkettő megvan)
        let existingId = null;
        if (sofor_id || gep_id) {
          const conditions = ['datum = $1', 'torolt = FALSE'];
          const params = [datumStr];
          if (sofor_id) { params.push(sofor_id);  conditions.push(`sofor_id = $${params.length}`); }
          if (gep_id)   { params.push(gep_id);    conditions.push(`gep_id = $${params.length}`);   }

          const check = await query(
            `SELECT id FROM napi_terv WHERE ${conditions.join(' AND ')} LIMIT 1`,
            params
          );
          if (check.rows.length > 0) existingId = check.rows[0].id;
        }

        if (existingId) {
          await query(
            `UPDATE napi_terv SET
              projekt_id = COALESCE($1, projekt_id),
              gep_id     = COALESCE($2, gep_id),
              kezdes     = COALESCE($3, kezdes),
              vegez      = COALESCE($4, vegez),
              megjegyzes = COALESCE($5, megjegyzes),
              allapot    = COALESCE($6, allapot),
              forras     = 'import'
             WHERE id = $7`,
            [projekt_id, gep_id, kezdes, vegez, megjegyzes, allapot || null, existingId]
          );
          await auditLog('napi_terv', existingId, 'UPDATE', `Import frissítés: ${datumStr}`, felhasznalo);
          results.updated++;
        } else {
          const insRes = await query(
            `INSERT INTO napi_terv (datum, sofor_id, projekt_id, gep_id, kezdes, vegez, megjegyzes, allapot, forras)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'import') RETURNING id`,
            [datumStr, sofor_id, projekt_id, gep_id, kezdes, vegez, megjegyzes, allapot || 'javasolt']
          );
          await auditLog('napi_terv', insRes.rows[0].id, 'INSERT', `Import felvétel: ${datumStr}`, felhasznalo);
          results.inserted++;
        }
      } catch (rowErr) {
        results.errors.push({ row: rowNum, error: rowErr.message });
        results.skipped++;
      }
    }

    res.json({ message: 'Napi terv import kész.', ...results });
  } catch (err) {
    console.error('[import/napi_terv]', err);
    res.status(500).json({ error: 'Import hiba: ' + err.message });
  }
});

export default router;
