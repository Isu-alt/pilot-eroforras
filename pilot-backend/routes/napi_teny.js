import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, requireDispatcher } from '../auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();
const audit = auditMiddleware('napi_teny');

router.use(authenticate);

// JOIN lekérdezés alap — újrahasználható
const BASE_SELECT = `
  SELECT nt.id, nt.datum, nt.sofor_id, s.teljes_nev AS sofor_nev,
         nt.projekt_id, p.munkaszam AS projekt_munkaszam,
         nt.gep_id, g.tipus AS gep_tipus, g.rendszam AS gep_rendszam,
         gc.nev AS csoport_nev, g.vallalkozo AS gep_vallalkozo,
         nt.kezd_idopont, nt.befejezes_idopont, nt.munkaora,
         nt.fuvarok_szama, nt.allapot, nt.megjegyzes, nt.forras,
         nt.created_at, nt.updated_at
  FROM napi_teny nt
  LEFT JOIN sofor s    ON s.id  = nt.sofor_id   AND s.torolt  = FALSE
  LEFT JOIN projekt p  ON p.id  = nt.projekt_id  AND p.torolt  = FALSE
  LEFT JOIN gep g      ON g.id  = nt.gep_id      AND g.torolt  = FALSE
  LEFT JOIN gep_csoport gc ON gc.id = g.csoport_id AND gc.torolt = FALSE
`;

/**
 * GET /api/napi_teny
 * Query: ?datum=  ?sofor_id=  ?vallalkozo= (gép alvállalkozójára szűr)
 */
router.get('/', async (req, res) => {
  try {
    const conditions = ['nt.torolt = FALSE'];
    const params = [];

    if (req.query.datum) {
      params.push(req.query.datum);
      conditions.push(`nt.datum = $${params.length}`);
    }
    if (req.query.sofor_id) {
      params.push(req.query.sofor_id);
      conditions.push(`nt.sofor_id = $${params.length}`);
    }
    if (req.query.vallalkozo) {
      params.push(`%${req.query.vallalkozo}%`);
      conditions.push(`g.vallalkozo ILIKE $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const result = await query(
      `${BASE_SELECT} WHERE ${where} ORDER BY nt.datum DESC, nt.id DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[napi_teny GET /]', err);
    res.status(500).json({ error: 'Szerver hiba a napi tény lekérdezésekor.' });
  }
});

/**
 * GET /api/napi_teny/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `${BASE_SELECT} WHERE nt.id = $1 AND nt.torolt = FALSE`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Napi tény rekord nem található.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[napi_teny GET /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * POST /api/napi_teny
 * Body: { datum, sofor_id?, projekt_id?, gep_id?, kezd_idopont?, befejezes_idopont?,
 *         munkaora?, fuvarok_szama?, allapot?, megjegyzes?, forras? }
 */
router.post('/', requireDispatcher, audit, async (req, res) => {
  try {
    const {
      datum, sofor_id, projekt_id, gep_id,
      kezd_idopont, befejezes_idopont, munkaora,
      fuvarok_szama, allapot, megjegyzes, forras,
    } = req.body;

    if (!datum) {
      return res.status(400).json({ error: 'A datum mező kötelező.' });
    }

    const result = await query(
      `INSERT INTO napi_teny
         (datum, sofor_id, projekt_id, gep_id, kezd_idopont, befejezes_idopont,
          munkaora, fuvarok_szama, allapot, megjegyzes, forras)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        datum,
        sofor_id           || null,
        projekt_id         || null,
        gep_id             || null,
        kezd_idopont       || null,
        befejezes_idopont  || null,
        munkaora           != null ? munkaora      : null,
        fuvarok_szama      != null ? fuvarok_szama : null,
        allapot            || 'rogzitett',
        megjegyzes         || null,
        forras             || 'manualis',
      ]
    );

    const newRec = result.rows[0];
    await req.auditLog(newRec.id, 'INSERT', `Új napi tény: ${datum}, sofőr ${sofor_id || '—'}`);

    res.status(201).json(newRec);
  } catch (err) {
    console.error('[napi_teny POST]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * PUT /api/napi_teny/:id
 */
router.put('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const {
      datum, sofor_id, projekt_id, gep_id,
      kezd_idopont, befejezes_idopont, munkaora,
      fuvarok_szama, allapot, megjegyzes, forras,
    } = req.body;

    const existing = await query(
      'SELECT id FROM napi_teny WHERE id = $1 AND torolt = FALSE',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Napi tény rekord nem található.' });
    }

    const result = await query(
      `UPDATE napi_teny SET
        datum              = COALESCE($1,  datum),
        sofor_id           = COALESCE($2,  sofor_id),
        projekt_id         = COALESCE($3,  projekt_id),
        gep_id             = COALESCE($4,  gep_id),
        kezd_idopont       = COALESCE($5,  kezd_idopont),
        befejezes_idopont  = COALESCE($6,  befejezes_idopont),
        munkaora           = COALESCE($7,  munkaora),
        fuvarok_szama      = COALESCE($8,  fuvarok_szama),
        allapot            = COALESCE($9,  allapot),
        megjegyzes         = COALESCE($10, megjegyzes),
        forras             = COALESCE($11, forras)
       WHERE id = $12 AND torolt = FALSE
       RETURNING *`,
      [
        datum              || null,
        sofor_id           || null,
        projekt_id         || null,
        gep_id             || null,
        kezd_idopont       || null,
        befejezes_idopont  || null,
        munkaora           != null ? munkaora      : null,
        fuvarok_szama      != null ? fuvarok_szama : null,
        allapot            || null,
        megjegyzes         !== undefined ? megjegyzes : null,
        forras             || null,
        req.params.id,
      ]
    );

    const updated = result.rows[0];
    await req.auditLog(updated.id, 'UPDATE', `Napi tény módosítva: id ${updated.id}`);

    res.json(updated);
  } catch (err) {
    console.error('[napi_teny PUT /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * DELETE /api/napi_teny/:id — soft delete
 */
router.delete('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const result = await query(
      `UPDATE napi_teny SET torolt = TRUE
       WHERE id = $1 AND torolt = FALSE
       RETURNING id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Napi tény rekord nem található.' });
    }

    await req.auditLog(result.rows[0].id, 'SOFT_DELETE', `Napi tény törölve: id ${result.rows[0].id}`);

    res.json({ message: 'Napi tény törölve.', id: result.rows[0].id });
  } catch (err) {
    console.error('[napi_teny DELETE /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

export default router;
