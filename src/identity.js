/**
 * identity.js — Felhasználói azonosító kezelése
 *
 * Elsőként az auth.js munkamenetéből olvas (ha van aktív bejelentkezés).
 * Visszaesési (fallback) értékként a localStorage-ban tárolt adatokat használja.
 * A crud.js logChange() hívásai ebből olvassák a felhasználó nevét.
 *
 * localStorage kulcs: "dispatcher_identity"
 * Séma: { "name": "Kiss János", "role": "Diszpécser" }
 */

import { getSession } from './auth.js';

/**
 * getIdentity — Visszaadja az aktuálisan beállított felhasználói azonosítót.
 *
 * Prioritás: 1. Auth munkamenet (sessionStorage)  2. localStorage fallback
 * Ha egyik sem érhető el, alapértéket ad vissza.
 *
 * @returns {{ name: string, role: string }}
 */
export function getIdentity() {
  const fallback = { name: 'Ismeretlen', role: 'Diszpécser' };

  // 1. Auth munkamenet ellenőrzése
  try {
    const session = getSession();
    if (session && session.nev && session.szerep) {
      return { name: session.nev, role: session.szerep };
    }
  } catch {
    // Folytatás a localStorage fallback-kel
  }

  // 2. localStorage fallback (visszafelé kompatibilitás)
  try {
    const raw = localStorage.getItem('dispatcher_identity');
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Validálás: az objektumnak tartalmaznia kell name és role string mezőket
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      typeof parsed.name !== 'string' ||
      typeof parsed.role !== 'string' ||
      parsed.name.trim() === '' ||
      parsed.role.trim() === ''
    ) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * saveIdentity — Elmenti a felhasználói azonosítót localStorage-ba.
 *
 * @param {string} name - Felhasználó neve
 * @param {string} role - Szerepkör (pl. 'Diszpécser', 'Admin', 'Olvasó')
 */
export function saveIdentity(name, role) {
  localStorage.setItem('dispatcher_identity', JSON.stringify({ name, role }));
}
