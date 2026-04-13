import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, requireDispatcher } from '../auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();
const audit = auditMiddleware('tavollet');

router.use(authenticate);

/**
 * GET /api/tavolletek
 * Query: ?datum=YYYY-MM-DD (az adott napra eső távollét)  ?sofor_id=
 */
router.get('/', async (req, res) => {
  try {
    const conditions = ['t.torolt = FALSE'];
    const params = [];

    if (req.query.sofor_id) {
      params.push(req.query.sofor_id);
      conditions.push(`t.sofor_id = $${params.length}`);
    }
    if (req.query.datum) {
      params.push(req.query.datum);
      // Az adott dátum beleesik a [datum_tol, datum_ig] intervallumba
      conditions.push(`t.datum_tol <= $${params.length} AND t.datum_ig >= $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT t.id, t.sofor_id, s.teljes_nev AS sofor_nev,
              t.datum_tol, t.datum_ig, t.tipus, t.megjegyzes,
              t.created_at, t.updated_at
       FROM tavollet t
       JOIN sofor s ON s.id = t.sofor_id AND s.torolt = FALSE
       WHERE ${where}
       ORDER BY t.datum_tol DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[tavolletek GET /]', err);
    res.status(500).json({ error: 'Szerver hiba a távollétek lekérdezésekor.' });
  }
});

/**
 * GET /api/tavolletek/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT t.id, t.sofor_id, s.teljes_nev AS sofor_nev,
              t.datum_tol, t.datum_ig, t.tipus, t.megjegyzes,
              t.created_at, t.updated_at
       FROM tavollet t
       JOIN sofor s ON s.id = t.sofor_id
       WHERE t.id = $1 AND t.torolt = FALSE`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Távollét nem található.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[tavolletek GET /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * POST /api/tavolletek
 * Body: { sofor_id, datum_tol, datum_ig, tipus?, megjegyzes? }
 */
router.post('/', requireDispatcher, audit, async (req, res) => {
  try {
    const { sofor_id, datum_tol, datum_ig, tipus, megjegyzes } = req.body;

    if (!sofor_id || !datum_tol || !datum_ig) {
      return res.status(400).json({ error: 'sofor_id, datum_tol és datum_ig megadása kötelező.' });
    }

    if (new Date(datum_ig) < new Date(datum_tol)) {
      return res.status(400).json({ error: 'A datum_ig nem lehet korábbi, mint datum_tol.' });
    }

    const result = await query(
      `INSERT INTO tavollet (sofor_id, datum_tol, datum_ig, tipus, megjegyzes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sofor_id, datum_tol, datum_ig, tipus || 'szabadsag', megjegyzes || null]
    );

    const newTavollet = result.rows[0];
    await req.auditLog(newTavollet.id, 'INSERT', `Új távollét: sofőr ${sofor_id}, ${datum_tol} – ${datum_ig}`);

    res.status(201).json(newTavollet);
  } catch (err) {
    console.error('[tavolletek POST]', err);
    res.status(500).json({ error: 'Szerver hiba a távollét létrehozásakor.' });
  }
});

/**
 * PUT /api/tavolletek/:id
 */
router.put('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const { sofor_id, datum_tol, datum_ig, tipus, megjegyzes } = req.body;

    const existing = await query(
      'SELECT id FROM tavollet WHERE id = $1 AND torolt = FALSE',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Távollét nem található.' });
    }

    const result = await query(
      `UPDATE tavollet SET
        sofor_id   = COALESCE($1, sofor_id),
        datum_tol  = COALESCE($2, datum_tol),
        datum_ig   = COALESCE($3, datum_ig),
        tipus      = COALESCE($4, tipus),
        megjegyzes = COALESCE($5, megjegyzes)
       WHERE id = $6 AND torolt = FALSE
       RETURNING *`,
      [
        sofor_id   || null,
        datum_tol  || null,
        datum_ig   || null,
        tipus      || null,
        megjegyzes !== undefined ? megjegyzes : null,
        req.params.id,
      ]
    );

    const updated = result.rows[0];
    await req.auditLog(updated.id, 'UPDATE', `Távollét módosítva: id ${updated.id}`);

    res.json(updated);
  } catch (err) {
    console.error('[tavolletek PUT /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * DELETE /api/tavolletek/:id — soft delete
 */
router.delete('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const result = await query(
      `UPDATE tavollet SET torolt = TRUE
       WHERE id = $1 AND torolt = FALSE
       RETURNING id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Távollét nem található.' });
    }

    await req.auditLog(result.rows[0].id, 'SOFT_DELETE', `Távollét törölve: id ${result.rows[0].id}`);

    res.json({ message: 'Távollét törölve.', id: result.rows[0].id });
  } catch (err) {
    console.error('[tavolletek DELETE /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

export default router;
