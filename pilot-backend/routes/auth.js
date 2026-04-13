import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { generateToken, authenticate } from '../auth.js';

const router = Router();

/**
 * POST /api/auth/login
 * Body: { felhasznalonev: string, jelszo: string }
 * Response: { token, user: { id, nev, felhasznalonev, szerep } }
 */
router.post('/login', async (req, res) => {
  try {
    const { felhasznalonev, jelszo } = req.body;

    if (!felhasznalonev || !jelszo) {
      return res.status(400).json({ error: 'Felhasználónév és jelszó megadása kötelező.' });
    }

    const result = await query(
      `SELECT id, nev, felhasznalonev, jelszo_hash, szerep, aktiv
       FROM felhasznalo
       WHERE felhasznalonev = $1`,
      [felhasznalonev]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });
    }

    const user = result.rows[0];

    if (!user.aktiv) {
      return res.status(403).json({ error: 'Ez a felhasználói fiók inaktív.' });
    }

    const valid = await bcrypt.compare(jelszo, user.jelszo_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id:             user.id,
        nev:            user.nev,
        felhasznalonev: user.felhasznalonev,
        szerep:         user.szerep,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Szerver hiba a bejelentkezés során.' });
  }
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * Response: { id, nev, felhasznalonev, szerep }
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, nev, felhasznalonev, szerep, aktiv, created_at
       FROM felhasznalo
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Felhasználó nem található.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Szerver hiba.' });
  }
});

export default router;
