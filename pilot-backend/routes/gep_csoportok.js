import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, requireAdmin } from '../auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();
const audit = auditMiddleware('gep_csoport');

router.use(authenticate);

/**
 * GET /api/gep_csoportok
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, nev, created_at, updated_at
       FROM gep_csoport
       WHERE torolt = FALSE
       ORDER BY nev`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[gep_csoportok GET /]', err);
    res.status(500).json({ error: 'Szerver hiba a gépcsoportok lekérdezésekor.' });
  }
});

/**
 * POST /api/gep_csoportok
 * Body: { nev }
 */
router.post('/', requireAdmin, audit, async (req, res) => {
  try {
    const { nev } = req.body;

    if (!nev) {
      return res.status(400).json({ error: 'A nev mező kötelező.' });
    }

    const result = await query(
      `INSERT INTO gep_csoport (nev) VALUES ($1) RETURNING *`,
      [nev]
    );

    const newCsoport = result.rows[0];
    await req.auditLog(newCsoport.id, 'INSERT', `Új gépcsoport: ${newCsoport.nev}`);

    res.status(201).json(newCsoport);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ez a gépcsoport-név már létezik.' });
    }
    console.error('[gep_csoportok POST]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * PUT /api/gep_csoportok/:id
 * Body: { nev }
 */
router.put('/:id', requireAdmin, audit, async (req, res) => {
  try {
    const { nev } = req.body;

    const existing = await query(
      'SELECT id FROM gep_csoport WHERE id = $1 AND torolt = FALSE',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Gépcsoport nem található.' });
    }

    const result = await query(
      `UPDATE gep_csoport SET nev = COALESCE($1, nev)
       WHERE id = $2 AND torolt = FALSE
       RETURNING *`,
      [nev || null, req.params.id]
    );

    const updated = result.rows[0];
    await req.auditLog(updated.id, 'UPDATE', `Gépcsoport módosítva: ${updated.nev}`);

    res.json(updated);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ez a gépcsoport-név már létezik.' });
    }
    console.error('[gep_csoportok PUT /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * DELETE /api/gep_csoportok/:id — soft delete
 */
router.delete('/:id', requireAdmin, audit, async (req, res) => {
  try {
    const result = await query(
      `UPDATE gep_csoport SET torolt = TRUE
       WHERE id = $1 AND torolt = FALSE
       RETURNING id, nev`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gépcsoport nem található.' });
    }

    const deleted = result.rows[0];
    await req.auditLog(deleted.id, 'SOFT_DELETE', `Gépcsoport törölve: ${deleted.nev}`);

    res.json({ message: 'Gépcsoport törölve.', id: deleted.id });
  } catch (err) {
    console.error('[gep_csoportok DELETE /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

export default router;
