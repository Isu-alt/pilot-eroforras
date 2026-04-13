import { Router } from 'express';
import { query } from '../db.js';
import { authenticate, requireDispatcher } from '../auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();

router.use(authenticate);

/**
 * GET /api/kompetencia/sofor/:sofor_id
 * Sofőr gép-kompetenciái (JOIN-olt gép adatokkal)
 */
router.get('/sofor/:sofor_id', async (req, res) => {
  try {
    const result = await query(
      `SELECT k.id, k.sofor_id, k.gep_id, k.torolt, k.created_at,
              g.tipus AS gep_tipus, g.rendszam AS gep_rendszam,
              gc.nev AS csoport_nev
       FROM kompetencia k
       JOIN gep g ON g.id = k.gep_id AND g.torolt = FALSE
       LEFT JOIN gep_csoport gc ON gc.id = g.csoport_id AND gc.torolt = FALSE
       WHERE k.sofor_id = $1 AND k.torolt = FALSE
       ORDER BY g.tipus, g.rendszam`,
      [req.params.sofor_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[kompetencia GET /sofor/:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * GET /api/kompetencia/csoport/:sofor_id
 * Sofőr gépcsoport-kompetenciái
 */
router.get('/csoport/:sofor_id', async (req, res) => {
  try {
    const result = await query(
      `SELECT kc.id, kc.sofor_id, kc.csoport_id, kc.torolt, kc.created_at,
              gc.nev AS csoport_nev
       FROM kompetencia_csoport kc
       JOIN gep_csoport gc ON gc.id = kc.csoport_id AND gc.torolt = FALSE
       WHERE kc.sofor_id = $1 AND kc.torolt = FALSE
       ORDER BY gc.nev`,
      [req.params.sofor_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('[kompetencia GET /csoport/:id]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * POST /api/kompetencia/csoport
 * Body: { sofor_id, csoport_id }
 * Ha már létezik (de törölve van), visszaállítja (torolt = FALSE)
 */
router.post('/csoport', requireDispatcher, auditMiddleware('kompetencia_csoport'), async (req, res) => {
  try {
    const { sofor_id, csoport_id } = req.body;

    if (!sofor_id || !csoport_id) {
      return res.status(400).json({ error: 'sofor_id és csoport_id megadása kötelező.' });
    }

    // Upsert: ha létezik (bármilyen torolt állapotban), visszaállítja
    const result = await query(
      `INSERT INTO kompetencia_csoport (sofor_id, csoport_id, torolt)
       VALUES ($1, $2, FALSE)
       ON CONFLICT (sofor_id, csoport_id) DO UPDATE SET torolt = FALSE
       RETURNING *`,
      [sofor_id, csoport_id]
    );

    const row = result.rows[0];
    await req.auditLog(row.id, 'INSERT', `Gépcsoport-kompetencia hozzáadva: sofőr ${sofor_id} → csoport ${csoport_id}`);

    res.status(201).json(row);
  } catch (err) {
    console.error('[kompetencia POST /csoport]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

/**
 * DELETE /api/kompetencia/csoport — soft delete
 * Body: { sofor_id, csoport_id }
 */
router.delete('/csoport', requireDispatcher, auditMiddleware('kompetencia_csoport'), async (req, res) => {
  try {
    const { sofor_id, csoport_id } = req.body;

    if (!sofor_id || !csoport_id) {
      return res.status(400).json({ error: 'sofor_id és csoport_id megadása kötelező.' });
    }

    const result = await query(
      `UPDATE kompetencia_csoport SET torolt = TRUE
       WHERE sofor_id = $1 AND csoport_id = $2 AND torolt = FALSE
       RETURNING id`,
      [sofor_id, csoport_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kompetencia nem található.' });
    }

    await req.auditLog(result.rows[0].id, 'SOFT_DELETE', `Gépcsoport-kompetencia törölve: sofőr ${sofor_id} → csoport ${csoport_id}`);

    res.json({ message: 'Kompetencia törölve.', id: result.rows[0].id });
  } catch (err) {
    console.error('[kompetencia DELETE /csoport]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

export default router;
