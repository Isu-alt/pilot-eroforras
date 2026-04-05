/**
 * auth.js — Autentikáció és szerepkör-alapú hozzáférés-szabályozás
 *
 * Felelős:
 *  - Jelszó hash-elés (SHA-256, SubtleCrypto)
 *  - Bejelentkezés / kijelentkezés
 *  - Munkamenet kezelés (sessionStorage)
 *  - Auth guard (oldalvédelem)
 *  - Szerepkör ellenőrzés
 *
 * sessionStorage kulcs: 'pilot_session'
 * Munkamenet séma: { id, nev, felhasznalonev, szerep }
 */

import { getDB } from './db.js';

// ─── Konfiguráció ─────────────────────────────────────────────────────────────

const SESSION_KEY = 'pilot_session';

// ─── Jelszó hash-elés ─────────────────────────────────────────────────────────

/**
 * hashPassword — SHA-256 hash-t számít a megadott jelszóból SubtleCrypto-val.
 * Sót nem használ (helyi app, nincs szerver oldali igény).
 *
 * @param {string} password - Nyílt szöveges jelszó
 * @returns {Promise<string>} Hex-kódolt SHA-256 hash
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Munkamenet ───────────────────────────────────────────────────────────────

/**
 * getSession — Visszaadja az aktuális munkamenetet sessionStorage-ból.
 *
 * @returns {{ id: number, nev: string, felhasznalonev: string, szerep: string }|null}
 */
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Minimális validálás
    if (!session || typeof session.id !== 'number' || !session.szerep) return null;
    return session;
  } catch {
    return null;
  }
}

// ─── Bejelentkezés ────────────────────────────────────────────────────────────

/**
 * login — Ellenőrzi a megadott hitelesítő adatokat, és sikeres egyezés esetén
 * munkamenetet hoz létre sessionStorage-ban.
 *
 * @param {string} felhasznalonev
 * @param {string} jelszo - Nyílt szöveges jelszó (hash-elés itt történik)
 * @returns {Promise<{ id: number, nev: string, felhasznalonev: string, szerep: string }>}
 * @throws {Error} Ha a hitelesítés sikertelen
 */
export async function login(felhasznalonev, jelszo) {
  const db = getDB();

  // Felhasználó keresése felhasználónév alapján
  const result = db.exec(
    `SELECT id, nev, felhasznalonev, jelszo_hash, szerep, aktiv
     FROM felhasznalo
     WHERE felhasznalonev = ? LIMIT 1`,
    [felhasznalonev]
  );

  if (!result.length || !result[0].values.length) {
    throw new Error('Hibás felhasználónév vagy jelszó.');
  }

  const [id, nev, fn, jelszo_hash, szerep, aktiv] = result[0].values[0];

  if (!aktiv) {
    throw new Error('Ez a fiók le van tiltva.');
  }

  // Jelszó ellenőrzés
  const inputHash = await hashPassword(jelszo);
  if (inputHash !== jelszo_hash) {
    throw new Error('Hibás felhasználónév vagy jelszó.');
  }

  // Munkamenet tárolása sessionStorage-ban
  const session = { id, nev, felhasznalonev: fn, szerep };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

  console.log(`[auth] Bejelentkezve: ${nev} (${szerep})`);
  return session;
}

// ─── Kijelentkezés ────────────────────────────────────────────────────────────

/**
 * logout — Törli a munkamenetet és átirányít a bejelentkezési oldalra.
 */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.replace('./login.html');
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

/**
 * requireAuth — Ellenőrzi, hogy a felhasználó be van-e jelentkezve, és
 * opcionálisan, hogy rendelkezik-e a szükséges szerepkörrel.
 *
 * Ha nincs munkamenet → átirányítás a login.html-re (window.location.replace + throw).
 * Ha rossz szerepkör → átirányítás az index.html-re + throw.
 *
 * @param {'admin'|'diszpecser'|undefined} requiredRole - Ha megadott, ezt a szerepkört követeli meg
 * @returns {{ id: number, nev: string, felhasznalonev: string, szerep: string }}
 * @throws {Error} Minden esetben dob kivételt átirányítás után (a script futás megállításához)
 */
export function requireAuth(requiredRole) {
  const session = getSession();

  if (!session) {
    window.location.replace('./login.html');
    throw new Error('[auth] Nincs aktív munkamenet — átirányítás a bejelentkezési oldalra.');
  }

  if (requiredRole === 'admin' && session.szerep !== 'admin') {
    window.location.replace('./index.html');
    throw new Error('[auth] Nincs admin jogosultság — átirányítás a főoldalra.');
  }

  return session;
}

// ─── Szerepkör ellenőrzők ─────────────────────────────────────────────────────

/**
 * isAdmin — Megvizsgálja, hogy az aktuális felhasználó admin-e.
 *
 * @returns {boolean}
 */
export function isAdmin() {
  const session = getSession();
  return session?.szerep === 'admin';
}

/**
 * isDispatcher — Megvizsgálja, hogy az aktuális felhasználó diszpécser vagy admin-e.
 * (Az admin minden diszpécser műveletet elvégezhet.)
 *
 * @returns {boolean}
 */
export function isDispatcher() {
  const session = getSession();
  return session?.szerep === 'diszpecser' || session?.szerep === 'admin';
}
