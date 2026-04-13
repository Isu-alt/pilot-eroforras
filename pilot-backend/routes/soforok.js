import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, requireDispatcher } from '../auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();
const audit = auditMiddleware('sofor');

// Minden route igényel autentikációt
router.use(authenticate);

/**
 * GET /api/soforok
 * Query params: ?statusz=aktiv|inaktiv  ?beosztas=sofor|gepkezelo|sofor_es_gepkezelo
 */
router.get('/', async (req, res) => {
  try {
    const conditions = ['torolt = FALSE'];
    const params = [];

    if (req.query.statusz) {
      params.push(req.query.statusz);
      conditions.push(`statusz = $${params.length}`);
    }
    if (req.query.beosztas) {
      params.push(req.query.beosztas);
      conditions.push(`beosztas = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT id, teljes_nev, aliasok, belepesi_datum, statusz, beosztas, megjegyzes, created_at, updated_at
       FROM sofor
       WHERE ${where}
       ORDER BY teljes_nev`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[soforok GET /]', err);
    res.status(500).json({ error: 'Szerver hiba a sofőrök lekérdezésekor.' });
  }
});

/**
 * GET /api/soforok/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, teljes_nev, aliasok, belepesi_datum, statusz, beosztas, megjegyzes, created_at, updated_at
       FROM sofor
       WHERE id = $1 AND torolt = FALSE`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sofőr nem található.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[soforok GET /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * POST /api/soforok
 * Body: { teljes_nev, aliasok?, belepesi_datum?, statusz?, beosztas?, megjegyzes? }
 */
router.post('/', requireDispatcher, audit, async (req, res) => {
  try {
    const { teljes_nev, aliasok, belepesi_datum, statusz, beosztas, megjegyzes } = req.body;

    if (!teljes_nev) {
      return res.status(400).json({ error: 'A teljes_nev mező kötelező.' });
    }

    const result = await query(
      `INSERT INTO sofor (teljes_nev, aliasok, belepesi_datum, statusz, beosztas, megjegyzes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        teljes_nev,
        aliasok    || null,
        belepesi_datum || null,
        statusz    || 'aktiv',
        beosztas   || 'sofor',
        megjegyzes || null,
      ]
    );

    const newSofor = result.rows[0];
    await req.auditLog(newSofor.id, 'INSERT', `Új sofőr: ${newSofor.teljes_nev}`);

    res.status(201).json(newSofor);
  } catch (err) {
    console.error('[soforok POST]', err);
    res.status(500).json({ error: 'Szerver hiba a sofőr létrehozásakor.' });
  }
});

/**
 * PUT /api/soforok/:id
 * Body: bármely mező amit frissíteni kell
 */
router.put('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const { teljes_nev, aliasok, belepesi_datum, statusz, beosztas, megjegyzes } = req.body;

    // Ellenőrzés: létezik-e a rekord
    const existing = await query(
      'SELECT id FROM sofor WHERE id = $1 AND torolt = FALSE',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Sofőr nem található.' });
    }

    const result = await query(
      `UPDATE sofor SET
        teljes_nev     = COALESCE($1, teljes_nev),
        aliasok        = COALESCE($2, aliasok),
        belepesi_datum = COALESCE($3, belepesi_datum),
        statusz        = COALESCE($4, statusz),
        beosztas       = COALESCE($5, beosztas),
        megjegyzes     = COALESCE($6, megjegyzes)
       WHERE id = $7 AND torolt = FALSE
       RETURNING *`,
      [
        teljes_nev     || null,
        aliasok        !== undefined ? aliasok        : null,
        belepesi_datum !== undefined ? belepesi_datum : null,
        statusz        || null,
        beosztas       || null,
        megjegyzes     !== undefined ? megjegyzes     : null,
        req.params.id,
      ]
    );

    const updated = result.rows[0];
    await req.auditLog(updated.id, 'UPDATE', `Sofőr módosítva: ${updated.teljes_nev}`);

    res.json(updated);
  } catch (err) {
    console.error('[soforok PUT /:id]', err);
    res.status(500).json({ error: 'Szerver hiba a sofőr frissítésekor.' });
  }
});

/**
 * DELETE /api/soforok/:id  — soft delete
 */
router.delete('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const result = await query(
      `UPDATE sofor SET torolt = TRUE
       WHERE id = $1 AND torolt = FALSE
       RETURNING id, teljes_nev`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sofőr nem található.' });
    }

    const deleted = result.rows[0];
    await req.auditLog(deleted.id, 'SOFT_DELETE', `Sofőr törölve: ${deleted.teljes_nev}`);

    res.json({ message: 'Sofőr törölve.', id: deleted.id });
  } catch (err) {
    console.error('[soforok DELETE /:id]', err);
    res.status(500).json({ error: 'Szerver hiba a sofőr törlésekor.' });
  }
});

export default router;
