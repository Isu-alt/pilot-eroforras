import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, requireDispatcher } from '../auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();
const audit = auditMiddleware('gep');

router.use(authenticate);

/**
 * GET /api/gepek
 * Query: ?vallalkozo=  ?csoport_id=  ?allapot=
 * Válasz tartalmaz JOIN-olt csoport_nev mezőt.
 */
router.get('/', async (req, res) => {
  try {
    const conditions = ['g.torolt = FALSE'];
    const params = [];

    if (req.query.vallalkozo) {
      params.push(`%${req.query.vallalkozo}%`);
      conditions.push(`g.vallalkozo ILIKE $${params.length}`);
    }
    if (req.query.csoport_id) {
      params.push(req.query.csoport_id);
      conditions.push(`g.csoport_id = $${params.length}`);
    }
    if (req.query.allapot) {
      params.push(req.query.allapot);
      conditions.push(`g.allapot = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT g.id, g.tipus, g.rendszam, g.megjegyzes, g.vallalkozo,
              g.csoport_id, gc.nev AS csoport_nev, g.allapot,
              g.created_at, g.updated_at
       FROM gep g
       LEFT JOIN gep_csoport gc ON gc.id = g.csoport_id AND gc.torolt = FALSE
       WHERE ${where}
       ORDER BY g.tipus, g.rendszam`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[gepek GET /]', err);
    res.status(500).json({ error: 'Szerver hiba a gépek lekérdezésekor.' });
  }
});

/**
 * GET /api/gepek/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT g.id, g.tipus, g.rendszam, g.megjegyzes, g.vallalkozo,
              g.csoport_id, gc.nev AS csoport_nev, g.allapot,
              g.created_at, g.updated_at
       FROM gep g
       LEFT JOIN gep_csoport gc ON gc.id = g.csoport_id AND gc.torolt = FALSE
       WHERE g.id = $1 AND g.torolt = FALSE`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gép nem található.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[gepek GET /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * POST /api/gepek
 * Body: { tipus?, rendszam?, megjegyzes?, vallalkozo?, csoport_id?, allapot? }
 */
router.post('/', requireDispatcher, audit, async (req, res) => {
  try {
    const { tipus, rendszam, megjegyzes, vallalkozo, csoport_id, allapot } = req.body;

    const result = await query(
      `INSERT INTO gep (tipus, rendszam, megjegyzes, vallalkozo, csoport_id, allapot)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tipus      || null,
        rendszam   || null,
        megjegyzes || null,
        vallalkozo || null,
        csoport_id || null,
        allapot    || 'elerheto',
      ]
    );

    const newGep = result.rows[0];
    await req.auditLog(newGep.id, 'INSERT', `Új gép: ${newGep.tipus || ''} ${newGep.rendszam || ''}`);

    res.status(201).json(newGep);
  } catch (err) {
    console.error('[gepek POST]', err);
    res.status(500).json({ error: 'Szerver hiba a gép létrehozásakor.' });
  }
});

/**
 * PUT /api/gepek/:id
 */
router.put('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const { tipus, rendszam, megjegyzes, vallalkozo, csoport_id, allapot } = req.body;

    const existing = await query(
      'SELECT id FROM gep WHERE id = $1 AND torolt = FALSE',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Gép nem található.' });
    }

    const result = await query(
      `UPDATE gep SET
        tipus      = COALESCE($1, tipus),
        rendszam   = COALESCE($2, rendszam),
        megjegyzes = COALESCE($3, megjegyzes),
        vallalkozo = COALESCE($4, vallalkozo),
        csoport_id = COALESCE($5, csoport_id),
        allapot    = COALESCE($6, allapot)
       WHERE id = $7 AND torolt = FALSE
       RETURNING *`,
      [
        tipus      !== undefined ? tipus      : null,
        rendszam   !== undefined ? rendszam   : null,
        megjegyzes !== undefined ? megjegyzes : null,
        vallalkozo !== undefined ? vallalkozo : null,
        csoport_id !== undefined ? csoport_id : null,
        allapot    !== undefined ? allapot    : null,
        req.params.id,
      ]
    );

    const updated = result.rows[0];
    await req.auditLog(updated.id, 'UPDATE', `Gép módosítva: ${updated.tipus || ''} ${updated.rendszam || ''}`);

    res.json(updated);
  } catch (err) {
    console.error('[gepek PUT /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * DELETE /api/gepek/:id — soft delete
 */
router.delete('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const result = await query(
      `UPDATE gep SET torolt = TRUE
       WHERE id = $1 AND torolt = FALSE
       RETURNING id, tipus, rendszam`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gép nem található.' });
    }

    const deleted = result.rows[0];
    await req.auditLog(deleted.id, 'SOFT_DELETE', `Gép törölve: ${deleted.tipus || ''} ${deleted.rendszam || ''}`);

    res.json({ message: 'Gép törölve.', id: deleted.id });
  } catch (err) {
    console.error('[gepek DELETE /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

export default router;
