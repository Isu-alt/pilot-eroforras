/**
 * identity.js — Felhasználói azonosító kezelése
 *
 * A localStorage-ban tárolt felhasználói nevet és szerepkört kezeli.
 * A crud.js logChange() hívásai ebből olvassák a felhasználó nevét.
 *
 * localStorage kulcs: "dispatcher_identity"
 * Séma: { "name": "Kiss János", "role": "Diszpécser" }
 */

/**
 * getIdentity — Visszaadja az aktuálisan beállított felhasználói azonosítót.
 *
 * Ha nincs elmentve vagy hibás a JSON, alapértéket ad vissza.
 *
 * @returns {{ name: string, role: string }}
 */
export function getIdentity() {
  const fallback = { name: 'Ismeretlen', role: 'Diszpécser' };
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
