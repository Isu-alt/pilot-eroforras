import { Router } from 'express';
import ExcelJS from 'exceljs';
import { query } from '../db.js';
import { authenticate } from '../auth.js';

const router = Router();

router.use(authenticate);

// ─── Segédfüggvény ───────────────────────────────────────────────────────────

/**
 * Dátumot YYYY-MM-DD stringgé formáz (ISO nap, timezone-mentes)
 */
function fmtDate(val) {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toISOString().slice(0, 10);
}

/**
 * Timestamp-ot YYYY-MM-DD HH:MM stringgé formáz
 */
function fmtTs(val) {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

// ─── GET /api/export/soforok.xlsx ────────────────────────────────────────────

/**
 * Sofőrök listája XLSX formátumban (id-val, szerkesztéshez).
 */
router.get('/soforok.xlsx', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, teljes_nev, aliasok, belepesi_datum, statusz, beosztas, megjegyzes
       FROM sofor
       WHERE torolt = FALSE
       ORDER BY teljes_nev`
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pilot Erőforrás';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sofőrök');
    sheet.columns = [
      { header: 'id',             key: 'id',             width: 8  },
      { header: 'teljes_nev',     key: 'teljes_nev',     width: 30 },
      { header: 'aliasok',        key: 'aliasok',        width: 20 },
      { header: 'belepesi_datum', key: 'belepesi_datum', width: 15 },
      { header: 'statusz',        key: 'statusz',        width: 12 },
      { header: 'beosztas',       key: 'beosztas',       width: 20 },
      { header: 'megjegyzes',     key: 'megjegyzes',     width: 30 },
    ];

    // Fejléc stílusozás
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };

    for (const row of result.rows) {
      sheet.addRow({
        ...row,
        belepesi_datum: fmtDate(row.belepesi_datum),
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="soforok.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[export/soforok.xlsx]', err);
    res.status(500).json({ error: 'Export hiba.' });
  }
});

// ─── GET /api/export/gepek.xlsx ──────────────────────────────────────────────

/**
 * Gépek listája XLSX formátumban (id-val + csoport névvel).
 */
router.get('/gepek.xlsx', async (req, res) => {
  try {
    const result = await query(
      `SELECT g.id, g.tipus, g.rendszam, g.megjegyzes, g.vallalkozo,
              gc.nev AS csoport_nev, g.allapot
       FROM gep g
       LEFT JOIN gep_csoport gc ON gc.id = g.csoport_id AND gc.torolt = FALSE
       WHERE g.torolt = FALSE
       ORDER BY g.tipus, g.rendszam`
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pilot Erőforrás';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Gépek');
    sheet.columns = [
      { header: 'id',          key: 'id',          width: 8  },
      { header: 'tipus',       key: 'tipus',       width: 20 },
      { header: 'rendszam',    key: 'rendszam',    width: 15 },
      { header: 'vallalkozo',  key: 'vallalkozo',  width: 30 },
      { header: 'csoport_nev', key: 'csoport_nev', width: 20 },
      { header: 'allapot',     key: 'allapot',     width: 12 },
      { header: 'megjegyzes',  key: 'megjegyzes',  width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };

    for (const row of result.rows) {
      sheet.addRow(row);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="gepek.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[export/gepek.xlsx]', err);
    res.status(500).json({ error: 'Export hiba.' });
  }
});

// ─── GET /api/export/napi_teny.csv ──────────────────────────────────────────

/**
 * Napi tény export CSV formátumban.
 * Query: ?from=YYYY-MM-DD  ?to=YYYY-MM-DD  ?sofor_id=
 */
router.get('/napi_teny.csv', async (req, res) => {
  try {
    const { rows } = await fetchNapiTeny(req.query);

    const headers = [
      'id', 'datum', 'sofor_nev', 'projekt_munkaszam', 'gep_tipus',
      'gep_rendszam', 'csoport_nev', 'gep_vallalkozo',
      'kezd_idopont', 'befejezes_idopont', 'munkaora',
      'fuvarok_szama', 'allapot', 'megjegyzes',
    ];

    const escape = (v) => {
      if (v == null) return '';
      const s = String(v);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push([
        r.id, fmtDate(r.datum), r.sofor_nev, r.projekt_munkaszam,
        r.gep_tipus, r.gep_rendszam, r.csoport_nev, r.gep_vallalkozo,
        fmtTs(r.kezd_idopont), fmtTs(r.befejezes_idopont), r.munkaora,
        r.fuvarok_szama, r.allapot, r.megjegyzes,
      ].map(escape).join(','));
    }

    const csv = lines.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="napi_teny.csv"');
    // BOM a Windows Excel kompatibilitáshoz
    res.write('\uFEFF');
    res.end(csv);
  } catch (err) {
    console.error('[export/napi_teny.csv]', err);
    res.status(500).json({ error: 'Export hiba.' });
  }
});

// ─── GET /api/export/napi_teny.xlsx ─────────────────────────────────────────

/**
 * Napi tény export XLSX formátumban.
 * Query: ?from=YYYY-MM-DD  ?to=YYYY-MM-DD  ?sofor_id=
 */
router.get('/napi_teny.xlsx', async (req, res) => {
  try {
    const { rows } = await fetchNapiTeny(req.query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pilot Erőforrás';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Napi tény');
    sheet.columns = [
      { header: 'id',                 key: 'id',                  width: 8  },
      { header: 'datum',              key: 'datum',               width: 12 },
      { header: 'sofor_nev',          key: 'sofor_nev',           width: 25 },
      { header: 'projekt_munkaszam',  key: 'projekt_munkaszam',   width: 18 },
      { header: 'gep_tipus',          key: 'gep_tipus',           width: 18 },
      { header: 'gep_rendszam',       key: 'gep_rendszam',        width: 14 },
      { header: 'csoport_nev',        key: 'csoport_nev',         width: 18 },
      { header: 'gep_vallalkozo',     key: 'gep_vallalkozo',      width: 25 },
      { header: 'kezd_idopont',       key: 'kezd_idopont',        width: 18 },
      { header: 'befejezes_idopont',  key: 'befejezes_idopont',   width: 18 },
      { header: 'munkaora',           key: 'munkaora',            width: 10 },
      { header: 'fuvarok_szama',      key: 'fuvarok_szama',       width: 12 },
      { header: 'allapot',            key: 'allapot',             width: 12 },
      { header: 'megjegyzes',         key: 'megjegyzes',          width: 30 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    };

    for (const r of rows) {
      sheet.addRow({
        ...r,
        datum:             fmtDate(r.datum),
        kezd_idopont:      fmtTs(r.kezd_idopont),
        befejezes_idopont: fmtTs(r.befejezes_idopont),
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="napi_teny.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[export/napi_teny.xlsx]', err);
    res.status(500).json({ error: 'Export hiba.' });
  }
});

// ─── Belső segédfüggvény ─────────────────────────────────────────────────────

async function fetchNapiTeny({ from, to, sofor_id } = {}) {
  const conditions = ['nt.torolt = FALSE'];
  const params = [];

  if (from) {
    params.push(from);
    conditions.push(`nt.datum >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`nt.datum <= $${params.length}`);
  }
  if (sofor_id) {
    params.push(sofor_id);
    conditions.push(`nt.sofor_id = $${params.length}`);
  }

  return query(
    `SELECT nt.id, nt.datum,
            s.teljes_nev AS sofor_nev,
            p.munkaszam  AS projekt_munkaszam,
            g.tipus      AS gep_tipus,
            g.rendszam   AS gep_rendszam,
            gc.nev       AS csoport_nev,
            g.vallalkozo AS gep_vallalkozo,
            nt.kezd_idopont, nt.befejezes_idopont,
            nt.munkaora, nt.fuvarok_szama,
            nt.allapot, nt.megjegyzes
     FROM napi_teny nt
     LEFT JOIN sofor       s  ON s.id  = nt.sofor_id   AND s.torolt  = FALSE
     LEFT JOIN projekt      p  ON p.id  = nt.projekt_id  AND p.torolt  = FALSE
     LEFT JOIN gep          g  ON g.id  = nt.gep_id      AND g.torolt  = FALSE
     LEFT JOIN gep_csoport  gc ON gc.id = g.csoport_id   AND gc.torolt = FALSE
     WHERE ${conditions.join(' AND ')}
     ORDER BY nt.datum, nt.id`,
    params
  );
}

export default router;
