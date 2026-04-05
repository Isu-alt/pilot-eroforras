/**
 * import.js — SheetJS alapú Excel import pipeline
 *
 * Felelős:
 *  - Excel fájl beolvasása ArrayBuffer-ként
 *  - Sheet-ek metaadatainak összegyűjtése (sorok száma, érzékelt dátum)
 *  - Dátum felismerés sheet névből (többféle formátum)
 *  - Sorok normalizálása (oszlopnév mapping, időformátum stb.)
 *  - Sofőrök fuzzy egyeztetése (pontos / alias / részleges)
 *  - Import előnézet felépítése
 *  - Jóváhagyott sorok tényleges beírása az adatbázisba
 *
 * Feltétel: a SheetJS CDN-ről töltődik be — window.XLSX globálisként elérhető.
 */

import { saveToIndexedDB } from './db.js';
import { createNapiTerv, updateSofor } from './crud.js';

// ─── 1. readExcelFile ─────────────────────────────────────────────────────────

/**
 * readExcelFile — File objektumot olvas be és XLSX workbook-ká alakítja.
 *
 * @param {File} file
 * @returns {Promise<object>} SheetJS workbook
 */
export async function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer   = event.target.result;
        // type: 'array' → Uint8Array-ként kezeli, ez a legstabilabb CDN-es SheetJS-sel
        const workbook = window.XLSX.read(buffer, { type: 'array' });
        resolve(workbook);
      } catch (err) {
        reject(new Error('Az Excel fájl beolvasása sikertelen: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Fájl olvasási hiba.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── 2. getSheetsInfo ─────────────────────────────────────────────────────────

/**
 * getSheetsInfo — Visszaadja az összes sheet nevét, sorszámát és érzékelt dátumát.
 *
 * @param {object} workbook SheetJS workbook
 * @returns {Array<{ name: string, rowCount: number, detectedDate: string|null }>}
 */
export function getSheetsInfo(workbook) {
  return workbook.SheetNames.map(name => {
    const sheet    = workbook.Sheets[name];
    // defval: null → üres cellák null-ként jelennek meg, nem 'undefined'-ként
    const rows     = window.XLSX.utils.sheet_to_json(sheet, { defval: null });
    const rowCount = rows.length;

    return {
      name,
      rowCount,
      detectedDate: parseDateFromSheetName(name),
    };
  });
}

// ─── 3. parseDateFromSheetName ────────────────────────────────────────────────

/**
 * parseDateFromSheetName — Sheet névből YYYY-MM-DD dátumot próbál kinyerni.
 *
 * Kezelt formátumok:
 *   - 2026.03.15  →  2026-03-15
 *   - 2026-03-15  →  2026-03-15
 *   - 03.15 / 3.15  →  aktuális év + hónap + nap
 *   - március 15 / marc 15 / márc.15  →  hónap névből felismerve
 *   - 15.03.2026  →  2026-03-15 (fordított)
 *
 * @param {string} sheetName
 * @returns {string|null} 'YYYY-MM-DD' vagy null
 */
export function parseDateFromSheetName(sheetName) {
  if (!sheetName || typeof sheetName !== 'string') return null;

  const s    = sheetName.trim();
  const year = new Date().getFullYear();

  // Magyar hónapnevek → hónap szám (1-alapú)
  // Rövidítések és ékezetes változatok egyaránt szerepelnek
  const honapMap = {
    'januar':   1, 'jan':    1,
    'februar':  2, 'feb':    2,
    'marcius':  3, 'marc':   3, 'mar': 3,
    'aprilis':  4, 'apr':    4,
    'majus':    5, 'maj':    5,
    'junius':   6, 'jun':    6,
    'julius':   7, 'jul':    7,
    'augusztus':8, 'aug':    8,
    'szeptember':9,'szept':  9, 'sep': 9,
    'oktober': 10, 'okt':   10, 'okt': 10,
    'november':11, 'nov':   11,
    'december':12, 'dec':   12,
  };

  /**
   * Érvényesség ellenőrzés: hónap 1–12, nap 1–31.
   * Naptári pontosság (pl. feb 30) nem szükséges, csak durva szűrés.
   */
  function isValid(y, m, d) {
    return y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
  }

  function toISO(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // ── 1. 2026.03.15 vagy 2026-03-15 (négy jegyű év elöl)
  let m = s.match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m.map(Number);
    if (isValid(y, mo, d)) return toISO(y, mo, d);
  }

  // ── 2. 15.03.2026 (fordított: nap.hónap.év)
  m = s.match(/(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/);
  if (m) {
    const [, d, mo, y] = m.map(Number);
    if (isValid(y, mo, d)) return toISO(y, mo, d);
  }

  // ── 3. 03.15 vagy 3.15 (hónap.nap, aktuális év)
  m = s.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (m) {
    const [, mo, d] = m.map(Number);
    if (isValid(year, mo, d)) return toISO(year, mo, d);
  }

  // ── 4. Magyar hónapnév: "március 15", "marc 15", "márc.15"
  //    Normalizáljuk az ékezetes karaktereket, majd hónapnév-tábla alapján keresünk
  const normalized = s
    .toLowerCase()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ö/g, 'o').replace(/ő/g, 'o')
    .replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ű/g, 'u');

  // Pontot space-re cseréljük, hogy "márc.15" → "marc 15" legyen
  const cleaned = normalized.replace(/[.\-_]/g, ' ').replace(/\s+/g, ' ').trim();

  for (const [honapNev, honapSzam] of Object.entries(honapMap)) {
    // Hónapnév előtte vagy utána szóköz (vagy szó eleje/vége)
    const reHonap = new RegExp(`(?:^|\\s)${honapNev}(?:\\s|$)`);
    if (reHonap.test(cleaned)) {
      // Nap szám keresése a maradékban
      const remaider = cleaned.replace(honapNev, '').trim();
      const napM = remaider.match(/(\d{1,2})/);
      if (napM) {
        const d = parseInt(napM[1], 10);
        if (isValid(year, honapSzam, d)) return toISO(year, honapSzam, d);
      }
    }
  }

  return null;
}

// ─── 4. normalizeRows ─────────────────────────────────────────────────────────

/**
 * normalizeRows — XLSX.utils.sheet_to_json eredményéből NormalizedRow tömböt képez.
 *
 * Oszlopnév mapping case-insensitive + trim alapján történik.
 *
 * @param {object} sheet   SheetJS sheet objektum
 * @param {string} datum   'YYYY-MM-DD' — a sheet dátuma
 * @returns {Array<NormalizedRow>}
 */
export function normalizeRows(sheet, datum) {
  const rawRows = window.XLSX.utils.sheet_to_json(sheet, { defval: null });

  // Oszlopnév mapping — eredeti (ékezetes) kulcsok
  // A Set elvégzi a duplikátum szűrést, az ékezetes és ékezet nélküli változatok
  // mindkét formában szerepelnek, hogy a normalize() után biztosan egyezzenek.
  const SOFOR_KEYS  = ['sofor', 'sof\u0151r', 'nev', 'n\u00e9v', 'driver', 'name'];
  const MUNKA_KEYS  = ['munkaszam', 'munk\u00e1sz\u00e1m', 'project', 'projekt', 'munka'];
  const GEP_KEYS    = ['gep', 'g\u00e9p', 'rendszam', 'rend sz\u00e1m', 'truck'];
  const KEZDES_KEYS = ['kezdes', 'kezd\u00e9s', 'start', 'tol', 't\u0151l'];
  const VEGEZ_KEYS  = ['vegez', 'v\u00e9gez', 'end', 'ig', 'befejez'];
  const MEGJ_KEYS   = ['megjegyzes', 'megjegyz\u00e9s', 'note', 'comment'];

  // Normalizáló segédfüggvény (ékezetek eltávolítása, kisbetű, trim)
  const normalize = (str) => str
    .toLowerCase().trim()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ö/g, 'o').replace(/ő/g, 'o')
    .replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ű/g, 'u');

  // Normalizált szett-ek az oszlopegyeztetéshez
  const SOFOR_NORM  = new Set(SOFOR_KEYS.map(normalize));
  const MUNKA_NORM  = new Set(MUNKA_KEYS.map(normalize));
  const GEP_NORM    = new Set(GEP_KEYS.map(normalize));
  const KEZDES_NORM = new Set(KEZDES_KEYS.map(normalize));
  const VEGEZ_NORM  = new Set(VEGEZ_KEYS.map(normalize));
  const MEGJ_NORM   = new Set(MEGJ_KEYS.map(normalize));

  /**
   * Az adott sor oszlopkulcsaiból megkeresi az első egyezőt a keresési szettel.
   * Visszaadja a cella értékét stringgé alakítva, vagy null-t.
   */
  function findCell(row, normSet) {
    for (const key of Object.keys(row)) {
      if (normSet.has(normalize(key))) {
        const val = row[key];
        if (val === null || val === undefined) return null;
        return String(val).trim() || null;
      }
    }
    return null;
  }

  /**
   * Időértéket 'HH:MM' formátumra hoz.
   * XLSX numerikus időértéket (0.0–1.0) is kezel.
   */
  function normalizeTime(val) {
    if (val === null || val === undefined) return null;

    // Ha szám (XLSX belső időreprezentáció): 0.5 = 12:00
    if (typeof val === 'number') {
      const totalMinutes = Math.round(val * 24 * 60);
      const h = Math.floor(totalMinutes / 60) % 24;
      const min = totalMinutes % 60;
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }

    const str = String(val).trim();

    // HH:MM vagy H:MM
    const m = str.match(/^(\d{1,2}):(\d{2})/);
    if (m) {
      const h   = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
        return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      }
    }

    return null;
  }

  /**
   * findRawCell — Nyers (nem stringgé alakított) cella értékét adja vissza.
   * Szükséges az XLSX numerikus időreprezentáció kezeléséhez.
   */
  function findRawCell(r, normSet) {
    for (const key of Object.keys(r)) {
      if (normSet.has(normalize(key))) return r[key];
    }
    return null;
  }

  const result = [];

  for (const row of rawRows) {
    const rawSoforNev = findCell(row, SOFOR_NORM);

    // Üres sofőrnév → kihagyjuk a sort
    if (!rawSoforNev || !rawSoforNev.trim()) continue;

    result.push({
      rawSoforNev,
      datum,
      projektMunkaszam: findCell(row, MUNKA_NORM),
      gepRendszam:      findCell(row, GEP_NORM),
      kezdes:           normalizeTime(findRawCell(row, KEZDES_NORM)),
      vegez:            normalizeTime(findRawCell(row, VEGEZ_NORM)),
      megjegyzes:       findCell(row, MEGJ_NORM),
      forras:           'import',
    });
  }

  return result;
}

// ─── 5. normalizeName ─────────────────────────────────────────────────────────

/**
 * normalizeName — Kisbetű + ékezet eltávolítás + trim + whitespace normalizálás.
 * Sofőr egyeztetéshez szükséges.
 *
 * @param {string} str
 * @returns {string}
 */
export function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
    .replace(/ó/g, 'o').replace(/ö/g, 'o').replace(/ő/g, 'o')
    .replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ű/g, 'u')
    .replace(/Á/g, 'a').replace(/É/g, 'e').replace(/Í/g, 'i')
    .replace(/Ó/g, 'o').replace(/Ö/g, 'o').replace(/Ő/g, 'o')
    .replace(/Ú/g, 'u').replace(/Ü/g, 'u').replace(/Ű/g, 'u')
    .replace(/\s+/g, ' ');
}

// ─── 6. matchSofor ───────────────────────────────────────────────────────────

/**
 * levenshtein — Két string szerkesztési távolságát számolja ki (inline implementáció).
 * Dinamikus programozás alapú, O(m*n) idő- és tárhelykomplexitással.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

/**
 * matchSofor — Sofőr neve alapján megkeresi a legjobb egyezést az adatbázisból.
 *
 * Egyezési sorrendek (prioritás):
 *   1. exact      (1.0) — normalizált teljes névre pontos egyezés
 *   2. alias      (0.9) — normalizált alias listán egyezés
 *   3. fuzzy      (0.75) — token-halmaz egyezés (sorrendfüggetlen, pl. "Gábor Nagy" vs. "Nagy Gábor")
 *   4. levenshtein(0.65) — Levenshtein-távolság ≤ 2, és a rövidebb név > 4 karakter
 *   5. partial    (0.6)  — az egyik tartalmazza a másikat
 *
 * @param {string}   rawName  Az Excelből kiolvasott sofőrnév
 * @param {object[]} soforok  getAllSoforok() eredménye
 * @returns {{ sofor: object, score: number, type: string }|null}
 */
export function matchSofor(rawName, soforok) {
  if (!rawName || !soforok || soforok.length === 0) return null;

  const norm = normalizeName(rawName);
  if (!norm) return null;

  // Token halmaz az input névhez (szóközre osztva)
  const normTokens = norm.split(' ').filter(t => t.length > 0);

  let best = null;

  for (const sofor of soforok) {
    const soforNormNev = normalizeName(sofor.teljes_nev || '');

    // ── 1. Pontos egyezés
    if (soforNormNev === norm) {
      const candidate = { sofor, score: 1.0, type: 'exact' };
      if (!best || candidate.score > best.score) best = candidate;
      continue; // Nem érhet el jobb találatot ennél a sofőrnél
    }

    // ── 2. Alias egyezés
    let aliasok = [];
    try {
      aliasok = JSON.parse(sofor.aliasok || '[]');
    } catch {
      aliasok = [];
    }

    let aliasMatch = false;
    for (const alias of aliasok) {
      if (normalizeName(alias) === norm) {
        aliasMatch = true;
        break;
      }
    }

    if (aliasMatch) {
      const candidate = { sofor, score: 0.9, type: 'alias' };
      if (!best || candidate.score > best.score) best = candidate;
      continue;
    }

    // ── 3. Fuzzy (token-halmaz) egyezés — sorrendfüggetlen névcserére
    // Mindkét token-halmaznak tartalmaznia kell egymás összes elemét.
    // Pl. "Gábor Nagy" vs. "Nagy Gábor" → ["gabor","nagy"] ↔ ["nagy","gabor"] → match
    const soforTokens = soforNormNev.split(' ').filter(t => t.length > 0);
    const soforTokenSet = new Set(soforTokens);
    const normTokenSet  = new Set(normTokens);
    const allNormInSofor = normTokens.every(t => soforTokenSet.has(t));
    const allSoforInNorm = soforTokens.every(t => normTokenSet.has(t));

    if (allNormInSofor && allSoforInNorm) {
      const candidate = { sofor, score: 0.75, type: 'fuzzy' };
      if (!best || candidate.score > best.score) best = candidate;
      continue;
    }

    // ── 4. Levenshtein-közelség — elgépelések felismerése
    // Csak akkor alkalmazzuk, ha a rövidebb név legalább 5 karakter (hamis pozitívok elkerülése)
    const shorter = Math.min(norm.length, soforNormNev.length);
    if (shorter > 4) {
      const dist = levenshtein(norm, soforNormNev);
      if (dist <= 2) {
        const candidate = { sofor, score: 0.65, type: 'levenshtein' };
        if (!best || candidate.score > best.score) best = candidate;
        continue;
      }
    }

    // ── 5. Részleges egyezés
    if (soforNormNev.includes(norm) || norm.includes(soforNormNev)) {
      const candidate = { sofor, score: 0.6, type: 'partial' };
      // Csak akkor frissítjük a best-et, ha jobb (vagy nincs még best)
      if (!best || candidate.score > best.score) best = candidate;
    }
  }

  return best;
}

// ─── 6b. saveAliasIfNew ──────────────────────────────────────────────────────

/**
 * saveAliasIfNew — Ha a rawName (normalizálva) nem egyezik pontosan a sofőr nevével,
 * és még nincs benne az alias listában, hozzáadja és elmenti az adatbázisba.
 *
 * Hibakezelés: ha az updateSofor dob, console.error-t ír, de nem állítja meg a flow-t.
 *
 * @param {number}   soforId  A sofőr adatbázis ID-ja
 * @param {string}   rawName  Az Excelből kiolvasott eredeti név
 * @param {object[]} soforok  getAllSoforok() aktuális eredménye
 */
export async function saveAliasIfNew(soforId, rawName, soforok) {
  // Sofőr keresése az ID alapján
  const sofor = soforok.find(s => s.id === soforId);
  if (!sofor) return;

  const normRaw   = normalizeName(rawName);
  const normNev   = normalizeName(sofor.teljes_nev || '');

  // Ha pontosan megegyezik a sofőr nevével, nincs szükség aliasra
  if (normRaw === normNev) return;

  // Meglévő alias lista kiolvasása
  let aliasok = [];
  try {
    aliasok = JSON.parse(sofor.aliasok || '[]');
  } catch {
    aliasok = [];
  }

  // Ha az alias már szerepel a listában (normalizáltan), nem mentjük újra
  const mar_szerepel = aliasok.some(a => normalizeName(a) === normRaw);
  if (mar_szerepel) return;

  // Alias hozzáadása és mentése
  const frissitett = [...aliasok, rawName];
  try {
    updateSofor(soforId, { aliasok: JSON.stringify(frissitett) });
  } catch (err) {
    console.error(`[import] saveAliasIfNew: alias mentési hiba (soforId=${soforId}, rawName="${rawName}"):`, err);
  }
}

// ─── 7. buildImportPreview ───────────────────────────────────────────────────

/**
 * buildImportPreview — Összeállítja az import előnézetet: sheet-ek, sorok,
 * sofőr egyezések és összesített statisztikák.
 *
 * @param {object}   workbook SheetJS workbook
 * @param {object[]} soforok  getAllSoforok() eredménye
 * @returns {ImportPreview}
 */
export function buildImportPreview(workbook, soforok) {
  const sheetsInfo = getSheetsInfo(workbook);

  const stats = {
    totalRows:          0,
    matchedExact:       0,
    matchedAlias:       0,
    matchedFuzzy:       0,
    matchedLevenshtein: 0,
    matchedPartial:     0,
    unmatched:          0,
  };

  const sheets = sheetsInfo.map(({ name, detectedDate }) => {
    const sheet = workbook.Sheets[name];
    const datum = detectedDate ?? null;

    // Ha nincs dátum, akkor is feldolgozzuk — a review képernyőn lehet kézzel megadni
    const rows    = normalizeRows(sheet, datum ?? '');
    const matches = rows.map(row => {
      const match = matchSofor(row.rawSoforNev, soforok);
      return { row, match };
    });

    // Statisztikák frissítése
    stats.totalRows += rows.length;
    for (const { match } of matches) {
      if      (!match)                          stats.unmatched++;
      else if (match.type === 'exact')          stats.matchedExact++;
      else if (match.type === 'alias')          stats.matchedAlias++;
      else if (match.type === 'fuzzy')          stats.matchedFuzzy++;
      else if (match.type === 'levenshtein')    stats.matchedLevenshtein++;
      else if (match.type === 'partial')        stats.matchedPartial++;
    }

    return { name, datum, rows, matches };
  });

  return { sheets, stats };
}

// ─── 8. executeImport ────────────────────────────────────────────────────────

/**
 * executeImport — Jóváhagyott sorokat ír be a napi_terv táblába.
 *
 * @param {Array<{ row: NormalizedRow, soforId: number }>} approvedRows
 * @param {object[]} projektek   getAllProjektek() eredménye
 * @param {object[]} gepek       getAllGepek() eredménye
 * @returns {Promise<{ inserted: number, skipped: number, errors: string[] }>}
 */
export async function executeImport(approvedRows, projektek, gepek) {
  let inserted = 0;
  let skipped  = 0;
  const errors = [];

  for (const { row, soforId } of approvedRows) {
    // soforId hiánya esetén kihagyjuk a sort
    if (!soforId) {
      skipped++;
      continue;
    }

    try {
      // Projekt keresése munkaszám alapján
      const projekt = projektek.find(p =>
        row.projektMunkaszam && p.munkaszam === row.projektMunkaszam
      );

      // Gép keresése rendszám alapján
      const gep = gepek.find(g =>
        row.gepRendszam && g.rendszam === row.gepRendszam
      );

      createNapiTerv({
        datum:       row.datum,
        sofor_id:    soforId,
        projekt_id:  projekt ? projekt.id : null,
        gep_id:      gep     ? gep.id     : null,
        kezdes:      row.kezdes    ?? null,
        vegez:       row.vegez     ?? null,
        megjegyzes:  row.megjegyzes ?? null,
        forras:      'import',
      });

      inserted++;
    } catch (err) {
      errors.push(
        `Sor (${row.datum}, ${row.rawSoforNev}): ${err.message}`
      );
    }
  }

  // Egyszeri mentés IndexedDB-be az összes insert után
  try {
    await saveToIndexedDB();
  } catch (err) {
    errors.push('IndexedDB mentési hiba: ' + err.message);
  }

  return { inserted, skipped, errors };
}
