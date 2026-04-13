/**
 * api.js — Backend API hívások összefoglaló modulja
 *
 * Minden fetch hívás ezen a modulon keresztül megy.
 * JWT tokent kezeli: localStorage-ban tárolja, 401-re login.html-re irányít.
 * A saveToIndexedDB() no-op shim a kliens oldali kompatibilitáshoz.
 */

// ─── Konfiguráció ─────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:3000/api';

// ─── JWT token kezelés ────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem('jwt_token');
}

export function setToken(t) {
  localStorage.setItem('jwt_token', t);
}

export function clearToken() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('jwt_user');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('jwt_user'));
  } catch {
    return null;
  }
}

export function setUser(u) {
  localStorage.setItem('jwt_user', JSON.stringify(u));
}

// ─── Alap fetch helper ────────────────────────────────────────────────────────

/**
 * apiFetch — minden API hívás ezen megy keresztül.
 * 401-re clearToken() + redirect login.html.
 * Nem-ok státusznál Error-t dob az err.error szöveggel.
 */
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    location.href = './login.html';
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * login — Bejelentkezés: JWT token + user objektum tárolása.
 * @param {string} felhasznalonev
 * @param {string} jelszo
 */
export async function login(felhasznalonev, jelszo) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ felhasznalonev, jelszo }),
  });
  setToken(data.token);
  setUser(data.user);
  return data;
}

/**
 * logout — Token törlése, redirect login.html-re.
 */
export function logout() {
  clearToken();
  location.href = './login.html';
}

/**
 * requireAuth — Auth guard: ha nincs token, redirect login.html.
 * Backend verzióban nem ad vissza session objektumot — getUser()-t kell használni.
 */
export function requireAuth() {
  if (!getToken()) {
    location.href = './login.html';
    throw new Error('Nem vagy bejelentkezve.');
  }
}

/**
 * isAdmin — Az aktuálisan bejelentkezett felhasználó admin-e?
 * @returns {boolean}
 */
export function isAdmin() {
  return getUser()?.role === 'admin';
}

// ─── saveToIndexedDB — no-op shim (backend verzióban nincs IndexedDB) ─────────

/**
 * saveToIndexedDB — Kompatibilitási shim.
 * A kliens oldali verzióban az adatokat IndexedDB-be mentette.
 * Backend verzióban az adatok már a szerveren vannak — nincs teendő.
 */
export async function saveToIndexedDB() {
  return;
}

// ─── Segédfüggvény query params összeállításához ──────────────────────────────

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Sofőrök ──────────────────────────────────────────────────────────────────

/**
 * getAllSoforok — Összes sofőr lekérése.
 * @param {{ statusz?: string }} params
 * @returns {Promise<Object[]>}
 */
export async function getAllSoforok(params = {}) {
  return apiFetch('/soforok' + buildQuery(params));
}

/**
 * getSoforById — Egy sofőr lekérése id alapján.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function getSoforById(id) {
  return apiFetch(`/soforok/${id}`);
}

/**
 * createSofor — Új sofőr létrehozása.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createSofor(data) {
  return apiFetch('/soforok', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * updateSofor — Sofőr frissítése.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateSofor(id, data) {
  return apiFetch(`/soforok/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/**
 * deleteSofor — Sofőr törlése (soft delete a backenden).
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function deleteSofor(id) {
  return apiFetch(`/soforok/${id}`, { method: 'DELETE' });
}

// ─── Projektek ────────────────────────────────────────────────────────────────

/**
 * getAllProjektek — Összes projekt lekérése.
 * @param {{ statusz?: string }} params
 * @returns {Promise<Object[]>}
 */
export async function getAllProjektek(params = {}) {
  return apiFetch('/projektek' + buildQuery(params));
}

/**
 * getProjektById — Egy projekt lekérése id alapján.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function getProjektById(id) {
  return apiFetch(`/projektek/${id}`);
}

/**
 * createProjekt — Új projekt létrehozása.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createProjekt(data) {
  return apiFetch('/projektek', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * updateProjekt — Projekt frissítése.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateProjekt(id, data) {
  return apiFetch(`/projektek/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/**
 * deleteProjekt — Projekt törlése.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function deleteProjekt(id) {
  return apiFetch(`/projektek/${id}`, { method: 'DELETE' });
}

// ─── Gép csoportok ───────────────────────────────────────────────────────────

/**
 * getAllGepCsoport — Összes gépcsoport lekérése.
 * @returns {Promise<Object[]>}
 */
export async function getAllGepCsoport() {
  return apiFetch('/gep_csoportok');
}

/**
 * createGepCsoport — Új gépcsoport létrehozása.
 * @param {string} nev
 * @returns {Promise<Object>}
 */
export async function createGepCsoport(nev) {
  return apiFetch('/gep_csoportok', { method: 'POST', body: JSON.stringify({ nev }) });
}

/**
 * updateGepCsoport — Gépcsoport nevének frissítése.
 * @param {number} id
 * @param {string} nev
 * @returns {Promise<Object>}
 */
export async function updateGepCsoport(id, nev) {
  return apiFetch(`/gep_csoportok/${id}`, { method: 'PUT', body: JSON.stringify({ nev }) });
}

/**
 * deleteGepCsoport — Gépcsoport törlése.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function deleteGepCsoport(id) {
  return apiFetch(`/gep_csoportok/${id}`, { method: 'DELETE' });
}

// ─── Gépek ───────────────────────────────────────────────────────────────────

/**
 * getAllGepek — Összes gép lekérése.
 * @param {{ csoport_id?: number, vallalkozo?: string, allapot?: string }} params
 * @returns {Promise<Object[]>}
 */
export async function getAllGepek(params = {}) {
  return apiFetch('/gepek' + buildQuery(params));
}

/**
 * getGepById — Egy gép lekérése id alapján.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function getGepById(id) {
  return apiFetch(`/gepek/${id}`);
}

/**
 * createGep — Új gép létrehozása.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createGep(data) {
  return apiFetch('/gepek', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * updateGep — Gép frissítése.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateGep(id, data) {
  return apiFetch(`/gepek/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/**
 * deleteGep — Gép törlése.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function deleteGep(id) {
  return apiFetch(`/gepek/${id}`, { method: 'DELETE' });
}

// ─── Kompetencia (sofőr–gép) ─────────────────────────────────────────────────

/**
 * getKompetenciaBySofor — Egy sofőr gép-kompetenciáinak lekérése.
 * @param {number} sofor_id
 * @returns {Promise<Object[]>}
 */
export async function getKompetenciaBySofor(sofor_id) {
  return apiFetch(`/kompetencia/sofor/${sofor_id}`);
}

/**
 * addKompetencia — Sofőr–gép kompetencia hozzáadása.
 * @param {number} sofor_id
 * @param {number} gep_id
 * @returns {Promise<Object>}
 */
export async function addKompetencia(sofor_id, gep_id) {
  return apiFetch('/kompetencia', { method: 'POST', body: JSON.stringify({ sofor_id, gep_id }) });
}

/**
 * removeKompetencia — Sofőr–gép kompetencia eltávolítása.
 * @param {number} sofor_id
 * @param {number} gep_id
 * @returns {Promise<Object>}
 */
export async function removeKompetencia(sofor_id, gep_id) {
  return apiFetch('/kompetencia', { method: 'DELETE', body: JSON.stringify({ sofor_id, gep_id }) });
}

// ─── Kompetencia csoport (sofőr–gépcsoport) ──────────────────────────────────

/**
 * getKompetenciaCsoportBySofor — Egy sofőr gépcsoport-kompetenciáinak lekérése.
 * @param {number} sofor_id
 * @returns {Promise<Object[]>}
 */
export async function getKompetenciaCsoportBySofor(sofor_id) {
  return apiFetch(`/kompetencia/csoport/${sofor_id}`);
}

/**
 * addKompetenciaCsoport — Sofőr–gépcsoport kompetencia hozzáadása.
 * @param {number} sofor_id
 * @param {number} csoport_id
 * @returns {Promise<Object>}
 */
export async function addKompetenciaCsoport(sofor_id, csoport_id) {
  return apiFetch('/kompetencia/csoport', { method: 'POST', body: JSON.stringify({ sofor_id, csoport_id }) });
}

/**
 * removeKompetenciaCsoport — Sofőr–gépcsoport kompetencia eltávolítása.
 * @param {number} sofor_id
 * @param {number} csoport_id
 * @returns {Promise<Object>}
 */
export async function removeKompetenciaCsoport(sofor_id, csoport_id) {
  return apiFetch('/kompetencia/csoport', { method: 'DELETE', body: JSON.stringify({ sofor_id, csoport_id }) });
}

// ─── Távollétek ───────────────────────────────────────────────────────────────

/**
 * getAllTavollet — Összes (vagy szűrt) távollét lekérése.
 * @param {{ sofor_id?: number, datum?: string }} params
 * @returns {Promise<Object[]>}
 */
export async function getAllTavollet(params = {}) {
  return apiFetch('/tavolletek' + buildQuery(params));
}

/**
 * createTavollet — Új távollét létrehozása.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createTavollet(data) {
  return apiFetch('/tavolletek', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * updateTavollet — Távollét frissítése.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateTavollet(id, data) {
  return apiFetch(`/tavolletek/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/**
 * deleteTavollet — Távollét törlése.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function deleteTavollet(id) {
  return apiFetch(`/tavolletek/${id}`, { method: 'DELETE' });
}

/**
 * getAktivTavollet — Adott napra érvényes távollétek lekérése.
 * A backend /tavolletek?datum=YYYY-MM-DD végpontot használja.
 * @param {string} datum - ISO dátum string (pl. '2026-04-12')
 * @returns {Promise<Object[]>}
 */
export async function getAktivTavollet(datum) {
  return apiFetch(`/tavolletek${buildQuery({ datum })}`);
}

// ─── Napi tény ────────────────────────────────────────────────────────────────

/**
 * getNapiTenyByDatum — Adott naphoz tartozó napi tény rekordok lekérése.
 * @param {string} datum - ISO dátum string (pl. '2026-04-12')
 * @param {{ sofor_id?: number }} params
 * @returns {Promise<Object[]>}
 */
export async function getNapiTenyByDatum(datum, params = {}) {
  return apiFetch('/napi_teny' + buildQuery({ datum, ...params }));
}

/**
 * createNapiTeny — Új napi tény létrehozása.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createNapiTeny(data) {
  return apiFetch('/napi_teny', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * updateNapiTeny — Napi tény frissítése.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateNapiTeny(id, data) {
  return apiFetch(`/napi_teny/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/**
 * deleteNapiTeny — Napi tény törlése.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function deleteNapiTeny(id) {
  return apiFetch(`/napi_teny/${id}`, { method: 'DELETE' });
}

// ─── Napi terv ────────────────────────────────────────────────────────────────

/**
 * getNapiTervByDatum — Adott naphoz tartozó napi terv rekordok lekérése.
 * @param {string} datum - ISO dátum string (pl. '2026-04-12')
 * @param {{ sofor_id?: number }} params
 * @returns {Promise<Object[]>}
 */
export async function getNapiTervByDatum(datum, params = {}) {
  return apiFetch('/napi_terv' + buildQuery({ datum, ...params }));
}

/**
 * createNapiTerv — Új napi terv létrehozása.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createNapiTerv(data) {
  return apiFetch('/napi_terv', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * updateNapiTerv — Napi terv frissítése.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateNapiTerv(id, data) {
  return apiFetch(`/napi_terv/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/**
 * deleteNapiTerv — Napi terv törlése.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function deleteNapiTerv(id) {
  return apiFetch(`/napi_terv/${id}`, { method: 'DELETE' });
}

// ─── Admin műveletek ──────────────────────────────────────────────────────────

/**
 * resetDatabase — Minden adat törlése a szerveren (csak admin).
 * POST /api/admin/reset
 */
export async function resetDatabase() {
  return apiFetch('/admin/reset', { method: 'POST' });
}

/**
 * getAdminUsers — Összes felhasználó listázása (csak admin).
 * GET /api/admin/users
 */
export async function getAdminUsers() {
  return apiFetch('/admin/users');
}

/**
 * createAdminUser — Új felhasználó létrehozása (csak admin).
 * POST /api/admin/users
 */
export async function createAdminUser(data) {
  return apiFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * updateAdminUser — Felhasználó adatainak módosítása (csak admin).
 * PATCH /api/admin/users/:id
 */
export async function updateAdminUser(id, data) {
  return apiFetch(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * deleteAdminUser — Felhasználó törlése (csak admin).
 * DELETE /api/admin/users/:id
 */
export async function deleteAdminUser(id) {
  return apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
}
