import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, requireDispatcher } from '../auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();
const audit = auditMiddleware('projekt');

router.use(authenticate);

/**
 * GET /api/projektek
 * Query: ?q= (munkaszam vagy helyszin részleges egyezés)
 */
router.get('/', async (req, res) => {
  try {
    const conditions = ['torolt = FALSE'];
    const params = [];

    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      conditions.push(`(munkaszam ILIKE $${params.length} OR helyszin ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT id, munkaszam, helyszin, megrendelo, leiras, created_at, updated_at
       FROM projekt
       WHERE ${where}
       ORDER BY munkaszam`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[projektek GET /]', err);
    res.status(500).json({ error: 'Szerver hiba a projektek lekérdezésekor.' });
  }
});

/**
 * GET /api/projektek/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, munkaszam, helyszin, megrendelo, leiras, created_at, updated_at
       FROM projekt
       WHERE id = $1 AND torolt = FALSE`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projekt nem található.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[projektek GET /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * POST /api/projektek
 * Body: { munkaszam, helyszin?, megrendelo?, leiras? }
 */
router.post('/', requireDispatcher, audit, async (req, res) => {
  try {
    const { munkaszam, helyszin, megrendelo, leiras } = req.body;

    if (!munkaszam) {
      return res.status(400).json({ error: 'A munkaszam mező kötelező.' });
    }

    const result = await query(
      `INSERT INTO projekt (munkaszam, helyszin, megrendelo, leiras)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [munkaszam, helyszin || null, megrendelo || null, leiras || null]
    );

    const newProjekt = result.rows[0];
    await req.auditLog(newProjekt.id, 'INSERT', `Új projekt: ${newProjekt.munkaszam}`);

    res.status(201).json(newProjekt);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ez a munkaszám már létezik.' });
    }
    console.error('[projektek POST]', err);
    res.status(500).json({ error: 'Szerver hiba a projekt létrehozásakor.' });
  }
});

/**
 * PUT /api/projektek/:id
 */
router.put('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const { munkaszam, helyszin, megrendelo, leiras } = req.body;

    const existing = await query(
      'SELECT id FROM projekt WHERE id = $1 AND torolt = FALSE',
      [req.params.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Projekt nem található.' });
    }

    const result = await query(
      `UPDATE projekt SET
        munkaszam  = COALESCE($1, munkaszam),
        helyszin   = COALESCE($2, helyszin),
        megrendelo = COALESCE($3, megrendelo),
        leiras     = COALESCE($4, leiras)
       WHERE id = $5 AND torolt = FALSE
       RETURNING *`,
      [
        munkaszam  || null,
        helyszin   !== undefined ? helyszin   : null,
        megrendelo !== undefined ? megrendelo : null,
        leiras     !== undefined ? leiras     : null,
        req.params.id,
      ]
    );

    const updated = result.rows[0];
    await req.auditLog(updated.id, 'UPDATE', `Projekt módosítva: ${updated.munkaszam}`);

    res.json(updated);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ez a munkaszám már létezik.' });
    }
    console.error('[projektek PUT /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * DELETE /api/projektek/:id — soft delete
 */
router.delete('/:id', requireDispatcher, audit, async (req, res) => {
  try {
    const result = await query(
      `UPDATE projekt SET torolt = TRUE
       WHERE id = $1 AND torolt = FALSE
       RETURNING id, munkaszam`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projekt nem található.' });
    }

    const deleted = result.rows[0];
    await req.auditLog(deleted.id, 'SOFT_DELETE', `Projekt törölve: ${deleted.munkaszam}`);

    res.json({ message: 'Projekt törölve.', id: deleted.id });
  } catch (err) {
    console.error('[projektek DELETE /:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

export default router;
