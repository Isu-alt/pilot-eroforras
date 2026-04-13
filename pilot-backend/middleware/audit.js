import { query } from '../db.js';

/**
 * auditLog — Bejegyzést ír a valtozas_log táblába.
 *
 * @param {string} tabla       - Érintett tábla neve (pl. 'sofor')
 * @param {number} rekord_id   - Érintett rekord ID-ja
 * @param {string} muvelet     - 'INSERT' | 'UPDATE' | 'SOFT_DELETE'
 * @param {string} leiras      - Emberi olvasható leírás
 * @param {string} [felhasznalo='rendszer'] - Felhasználó neve vagy azonosítója
 * @returns {Promise<void>}
 */
export async function auditLog(tabla, rekord_id, muvelet, leiras, felhasznalo = 'rendszer') {
  try {
    await query(
      `INSERT INTO valtozas_log (tabla, rekord_id, muvelet, felhasznalo, leiras)
       VALUES ($1, $2, $3, $4, $5)`,
      [tabla, rekord_id, muvelet, felhasznalo, leiras]
    );
  } catch (err) {
    // Az audit log hiba soha nem szakítja meg a fő műveletet
    console.error('[audit] Naplózási hiba:', err.message);
  }
}

/**
 * auditMiddleware — Express middleware factory.
 * A route handler UTÁN nem fut automatikusan — a route handlerből kell
 * meghívni az auditLog() függvényt a req.user és a rekord_id ismeretében.
 *
 * Ez a factory elsősorban arra való, hogy req.auditLog shortcutot adjon:
 *   req.auditLog(rekord_id, muvelet, leiras)
 *
 * @param {string} tabla - Tábla neve, amelyre a route vonatkozik
 * @returns {import('express').RequestHandler}
 */
export function auditMiddleware(tabla) {
  return (req, _res, next) => {
    req.auditLog = (rekord_id, muvelet, leiras) => {
      const felhasznalo = req.user?.nev || req.user?.felhasznalonev || 'rendszer';
      return auditLog(tabla, rekord_id, muvelet, leiras, felhasznalo);
    };
    next();
  };
}
