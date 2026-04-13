import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

if (!JWT_SECRET) {
  throw new Error('[auth] JWT_SECRET nincs beállítva a .env fájlban!');
}

/**
 * generateToken — JWT token generálás felhasználó objektumból.
 * @param {{ id: number, felhasznalonev: string, nev: string, szerep: string }} user
 * @returns {string} Aláírt JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      sub:           user.id,
      felhasznalonev: user.felhasznalonev,
      nev:           user.nev,
      szerep:        user.szerep,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * authenticate — Express middleware: Bearer token ellenőrzés.
 * Sikeres validálás esetén req.user = { id, felhasznalonev, nev, szerep }
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Hiányzó vagy érvénytelen Authorization header.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id:             payload.sub,
      felhasznalonev: payload.felhasznalonev,
      nev:            payload.nev,
      szerep:         payload.szerep,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'A token lejárt.' });
    }
    return res.status(401).json({ error: 'Érvénytelen token.' });
  }
}

/**
 * requireAdmin — Csak admin szerepkör fér hozzá.
 * Mindig az authenticate middleware után használandó.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.szerep !== 'admin') {
    return res.status(403).json({ error: 'Ez a művelet admin jogosultságot igényel.' });
  }
  next();
}

/**
 * requireDispatcher — Admin VAGY diszpécser szerepkör fér hozzá.
 * Mindig az authenticate middleware után használandó.
 */
export function requireDispatcher(req, res, next) {
  if (!req.user || !['admin', 'diszpecser'].includes(req.user.szerep)) {
    return res.status(403).json({ error: 'Ez a művelet legalább diszpécser jogosultságot igényel.' });
  }
  next();
}
