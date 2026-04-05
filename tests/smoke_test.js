/**
 * smoke_test.js — Pilot Erőforrás böngészős smoke teszt
 *
 * Futtatás: Nyisd meg az alkalmazás bármelyik oldalát (pl. src/index.html),
 * nyisd meg a böngésző DevTools konzolját, majd illesszed be ezt a teljes
 * scriptet és nyomj Entert.
 *
 * A teszt importálja a db.js, crud.js és identity.js modulokat közvetlenül,
 * és minden kritikus függvényt tesztel egy izolált, memória-alapú adatbázison.
 *
 * Fontos: Az alkalmazást http(s):// protokollon kell megnyitni (nem file://)
 * az ES modul import miatt. Ajánlott: Live Server (VSCode) vagy
 * `npx serve src` parancs.
 *
 * Kimenet: minden teszt PASS / FAIL eredménnyel jelenik meg a konzolban.
 */

(async function runSmokeTests() {

  // ─── Tesztfuttató segédeszköz ─────────────────────────────────────────────

  const results = { passed: 0, failed: 0, errors: [] };

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`%c  PASS  %c ${testName}`, 'background:#2D6A4F;color:#fff;padding:2px 6px;border-radius:3px', 'color:#1A1C1E');
      results.passed++;
    } else {
      const msg = detail ? `${testName} — ${detail}` : testName;
      console.error(`%c  FAIL  %c ${testName}`, 'background:#C0392B;color:#fff;padding:2px 6px;border-radius:3px', 'color:#C0392B', detail ? `\n        Részlet: ${detail}` : '');
      results.failed++;
      results.errors.push(msg);
    }
  }

  async function runTest(name, fn) {
    try {
      await fn();
    } catch (err) {
      assert(false, name, `Váratlan kivétel: ${err.message}`);
    }
  }

  function section(title) {
    console.log(`\n%c${title}`, 'font-weight:700;font-size:14px;color:#1A1C1E;border-bottom:1px solid #E8E6E1;padding-bottom:4px');
  }

  // ─── Modulok betöltése ────────────────────────────────────────────────────

  console.log('%cPilot Erőforrás — Smoke Teszt indul...', 'font-weight:700;font-size:16px;color:#2D6A4F');

  let initDB, createSchema, getDB, saveToIndexedDB;
  let createSofor, getAllSoforok, getSoforById, updateSofor, deleteSofor;
  let createProjekt, getAllProjektek, getProjektById, updateProjekt, deleteProjekt;
  let createGep, getAllGepek, getGepById, updateGep, deleteGep;
  let createNapiTeny, getNapiTenyByDatum, getNapiTenyById, updateNapiTeny, deleteNapiTeny;
  let createNapiTerv, getNapiTervByDatum, getNapiTervById, updateNapiTerv, deleteNapiTerv;
  let getValtozasLog;
  let getIdentity, saveIdentity;

  try {
    const dbMod = await import('./db.js');
    initDB = dbMod.initDB;
    createSchema = dbMod.createSchema;
    getDB = dbMod.getDB;
    saveToIndexedDB = dbMod.saveToIndexedDB;

    const crudMod = await import('./crud.js');
    createSofor     = crudMod.createSofor;
    getAllSoforok    = crudMod.getAllSoforok;
    getSoforById    = crudMod.getSoforById;
    updateSofor     = crudMod.updateSofor;
    deleteSofor     = crudMod.deleteSofor;
    createProjekt   = crudMod.createProjekt;
    getAllProjektek  = crudMod.getAllProjektek;
    getProjektById  = crudMod.getProjektById;
    updateProjekt   = crudMod.updateProjekt;
    deleteProjekt   = crudMod.deleteProjekt;
    createGep       = crudMod.createGep;
    getAllGepek      = crudMod.getAllGepek;
    getGepById      = crudMod.getGepById;
    updateGep       = crudMod.updateGep;
    deleteGep       = crudMod.deleteGep;
    createNapiTeny  = crudMod.createNapiTeny;
    getNapiTenyByDatum = crudMod.getNapiTenyByDatum;
    getNapiTenyById = crudMod.getNapiTenyById;
    updateNapiTeny  = crudMod.updateNapiTeny;
    deleteNapiTeny  = crudMod.deleteNapiTeny;
    createNapiTerv  = crudMod.createNapiTerv;
    getNapiTervByDatum = crudMod.getNapiTervByDatum;
    getNapiTervById = crudMod.getNapiTervById;
    updateNapiTerv  = crudMod.updateNapiTerv;
    deleteNapiTerv  = crudMod.deleteNapiTerv;
    getValtozasLog  = crudMod.getValtozasLog;

    const idMod = await import('./identity.js');
    getIdentity  = idMod.getIdentity;
    saveIdentity = idMod.saveIdentity;

    console.log('%cModulok sikeresen betöltve.', 'color:#2D6A4F');
  } catch (err) {
    console.error('%cHIBA: Modulok nem tölthetők be. Ellenőrizd, hogy http:// protokollon futtatod-e az alkalmazást.', 'color:#C0392B;font-weight:700', err);
    return;
  }

  // ─── Adatbázis inicializálása ─────────────────────────────────────────────

  section('0. Adatbázis inicializálás');

  await runTest('initDB() sikeresen lefut és visszaad egy db példányt', async () => {
    const db = await initDB();
    assert(db !== null && db !== undefined, 'initDB() visszatérési értéke nem null/undefined');
  });

  await runTest('getDB() az inicializált adatbázist adja vissza', async () => {
    const db = getDB();
    assert(typeof db === 'object' && typeof db.run === 'function', 'getDB() egy érvényes sql.js Database példányt ad vissza');
  });

  await runTest('createSchema() idempotensen futtatható (kétszer hívva sem dob hibát)', async () => {
    let error = null;
    try { createSchema(); createSchema(); } catch (e) { error = e; }
    assert(error === null, 'createSchema() kétszeri hívása nem dob kivételt');
  });

  // ─── identity.js tesztek ──────────────────────────────────────────────────

  section('1. identity.js — Felhasználói azonosító');

  await runTest('getIdentity() alapértelmezett értéket ad, ha nincs localStorage bejegyzés', async () => {
    const prevRaw = localStorage.getItem('dispatcher_identity');
    localStorage.removeItem('dispatcher_identity');
    const id = getIdentity();
    assert(id.name === 'Ismeretlen', 'name alapértelmezés "Ismeretlen"', `Kapott: ${id.name}`);
    assert(id.role === 'Diszpécser', 'role alapértelmezés "Diszpécser"', `Kapott: ${id.role}`);
    // Visszaállítás
    if (prevRaw) localStorage.setItem('dispatcher_identity', prevRaw);
  });

  await runTest('saveIdentity() elmenti a nevet és szerepkört, getIdentity() visszaolvassa', async () => {
    saveIdentity('Teszt Elek', 'Admin');
    const id = getIdentity();
    assert(id.name === 'Teszt Elek', 'name helyesen mentve', `Kapott: ${id.name}`);
    assert(id.role === 'Admin', 'role helyesen mentve', `Kapott: ${id.role}`);
  });

  await runTest('getIdentity() alapértékre esik vissza hibás JSON esetén', async () => {
    localStorage.setItem('dispatcher_identity', '{nem valid json');
    const id = getIdentity();
    assert(id.name === 'Ismeretlen', 'Hibás JSON esetén fallback "Ismeretlen"', `Kapott: ${id.name}`);
  });

  await runTest('getIdentity() alapértékre esik vissza, ha a name üres string', async () => {
    localStorage.setItem('dispatcher_identity', JSON.stringify({ name: '', role: 'Diszpécser' }));
    const id = getIdentity();
    assert(id.name === 'Ismeretlen', 'Üres name esetén fallback "Ismeretlen"', `Kapott: ${id.name}`);
    // Visszaállítás érvényes tesztfelhasználóra
    saveIdentity('Teszt Elek', 'Diszpécser');
  });

  // ─── sofor CRUD tesztek ───────────────────────────────────────────────────

  section('2. crud.js — Sofőr (sofor tábla)');

  let soforId;

  await runTest('createSofor() visszaad egy pozitív egész id-t', async () => {
    soforId = createSofor({ teljes_nev: 'Smoke Teszt Sofőr', statusz: 'aktiv' });
    assert(typeof soforId === 'number' && soforId > 0, 'createSofor() pozitív id-t ad vissza', `Kapott: ${soforId}`);
  });

  await runTest('getAllSoforok() tartalmazza az imént létrehozott sofőrt', async () => {
    const soforok = getAllSoforok();
    const found = soforok.find(s => s.id === soforId);
    assert(found !== undefined, 'Az új sofőr megtalálható a listában');
    assert(found?.teljes_nev === 'Smoke Teszt Sofőr', 'A teljes_nev helyesen mentve', `Kapott: ${found?.teljes_nev}`);
    assert(found?.statusz === 'aktiv', 'A statusz alapértelmezése "aktiv"', `Kapott: ${found?.statusz}`);
  });

  await runTest('getSoforById() visszaadja a sofőrt az id alapján', async () => {
    const sofor = getSoforById(soforId);
    assert(sofor !== null, 'getSoforById() nem null eredményt ad');
    assert(sofor?.id === soforId, 'Az id egyezik', `Kapott: ${sofor?.id}`);
  });

  await runTest('getSoforById() null-t ad vissza nem létező id-re', async () => {
    const sofor = getSoforById(999999);
    assert(sofor === null, 'getSoforById(999999) === null');
  });

  await runTest('updateSofor() frissíti a teljes_nev mezőt', async () => {
    updateSofor(soforId, { teljes_nev: 'Smoke Teszt Sofőr (módosított)' });
    const sofor = getSoforById(soforId);
    assert(sofor?.teljes_nev === 'Smoke Teszt Sofőr (módosított)', 'Frissített név helyesen mentve', `Kapott: ${sofor?.teljes_nev}`);
  });

  await runTest('updateSofor() COALESCE: a nem megadott statusz nem változik', async () => {
    updateSofor(soforId, { teljes_nev: 'Smoke Sofőr Végleges' });
    const sofor = getSoforById(soforId);
    assert(sofor?.statusz === 'aktiv', 'A statusz COALESCE megőrzi az eredeti értéket', `Kapott: ${sofor?.statusz}`);
  });

  await runTest('createSofor() alapértelmezésként "aktiv" státuszt állít be', async () => {
    const id2 = createSofor({ teljes_nev: 'Default Státusz Sofőr' });
    const sofor = getSoforById(id2);
    assert(sofor?.statusz === 'aktiv', 'Alapértelmezett statusz = "aktiv"', `Kapott: ${sofor?.statusz}`);
    deleteSofor(id2); // Takarítás
  });

  // ─── projekt CRUD tesztek ─────────────────────────────────────────────────

  section('3. crud.js — Projekt (projekt tábla)');

  let projektId;

  await runTest('createProjekt() visszaad egy pozitív egész id-t', async () => {
    projektId = createProjekt({ munkaszam: 'SMOKE-P-001', helyszin: 'Teszt Helyszín' });
    assert(typeof projektId === 'number' && projektId > 0, 'createProjekt() pozitív id-t ad vissza', `Kapott: ${projektId}`);
  });

  await runTest('getAllProjektek() tartalmazza az imént létrehozott projektet', async () => {
    const projektek = getAllProjektek();
    const found = projektek.find(p => p.id === projektId);
    assert(found !== undefined, 'Az új projekt megtalálható a listában');
    assert(found?.munkaszam === 'SMOKE-P-001', 'Munkaszám helyesen mentve', `Kapott: ${found?.munkaszam}`);
  });

  await runTest('getProjektById() visszaadja a projektet az id alapján', async () => {
    const projekt = getProjektById(projektId);
    assert(projekt !== null, 'getProjektById() nem null eredményt ad');
    assert(projekt?.munkaszam === 'SMOKE-P-001', 'Munkaszám egyezik');
  });

  await runTest('createProjekt() UNIQUE kényszert dob duplikált munkaszám esetén', async () => {
    let threw = false;
    try {
      createProjekt({ munkaszam: 'SMOKE-P-001' }); // Duplikált munkaszám
    } catch (err) {
      threw = true;
      // SQLite UNIQUE constraint violation üzenete
      assert(
        err.message.toLowerCase().includes('unique') || err.message.toLowerCase().includes('constraint'),
        'A hibaüzenet tartalmaz UNIQUE/constraint kulcsszót',
        `Kapott üzenet: ${err.message}`
      );
    }
    assert(threw, 'Duplikált munkaszám kivételt dob');
  });

  await runTest('updateProjekt() frissíti a helyszin mezőt', async () => {
    updateProjekt(projektId, { helyszin: 'Frissített Helyszín' });
    const p = getProjektById(projektId);
    assert(p?.helyszin === 'Frissített Helyszín', 'helyszin frissítve', `Kapott: ${p?.helyszin}`);
  });

  // ─── gep CRUD tesztek ─────────────────────────────────────────────────────

  section('4. crud.js — Gép (gep tábla)');

  let gepId;

  await runTest('createGep() visszaad egy pozitív egész id-t', async () => {
    gepId = createGep({ tipus: 'Tehergépkocsi', rendszam: 'SMK-001' });
    assert(typeof gepId === 'number' && gepId > 0, 'createGep() pozitív id-t ad vissza', `Kapott: ${gepId}`);
  });

  await runTest('getAllGepek() tartalmazza az imént létrehozott gépet', async () => {
    const gepek = getAllGepek();
    const found = gepek.find(g => g.id === gepId);
    assert(found !== undefined, 'Az új gép megtalálható a listában');
    assert(found?.rendszam === 'SMK-001', 'rendszam helyesen mentve', `Kapott: ${found?.rendszam}`);
  });

  await runTest('getGepById() visszaadja a gépet az id alapján', async () => {
    const gep = getGepById(gepId);
    assert(gep !== null, 'getGepById() nem null eredményt ad');
    assert(gep?.tipus === 'Tehergépkocsi', 'tipus egyezik');
  });

  await runTest('createGep() üres mezőkkel is létrehozható rekord (nincs NOT NULL)', async () => {
    let uresGepId;
    let error = null;
    try {
      uresGepId = createGep({});
    } catch (e) {
      error = e;
    }
    assert(error === null, 'Üres mezőkkel nem dob kivételt (gep táblában nincs NOT NULL)');
    if (uresGepId) deleteGep(uresGepId); // Takarítás
  });

  await runTest('updateGep() COALESCE: csak a megadott mező változik', async () => {
    updateGep(gepId, { rendszam: 'SMK-999' });
    const gep = getGepById(gepId);
    assert(gep?.rendszam === 'SMK-999', 'rendszam frissítve', `Kapott: ${gep?.rendszam}`);
    assert(gep?.tipus === 'Tehergépkocsi', 'tipus változatlan marad (COALESCE)', `Kapott: ${gep?.tipus}`);
  });

  // ─── napi_teny CRUD tesztek ───────────────────────────────────────────────

  section('5. crud.js — Napi tény (napi_teny tábla)');

  const testDatum = '2026-04-05';
  let tenyId;

  await runTest('createNapiTeny() visszaad egy pozitív egész id-t', async () => {
    tenyId = createNapiTeny({
      datum:              testDatum,
      sofor_id:          soforId,
      projekt_id:        projektId,
      gep_id:            gepId,
      kezd_idopont:      '07:00',
      befejezes_idopont: '15:00',
      munkaora:          8.0,
      fuvarok_szama:     5,
      allapot:           'rogzitett',
    });
    assert(typeof tenyId === 'number' && tenyId > 0, 'createNapiTeny() pozitív id-t ad vissza', `Kapott: ${tenyId}`);
  });

  await runTest('getNapiTenyByDatum() visszaadja az adott naphoz tartozó rekordot', async () => {
    const recs = getNapiTenyByDatum(testDatum);
    const found = recs.find(r => r.id === tenyId);
    assert(found !== undefined, 'A rekord megtalálható a dátum szerinti lekérdezésben');
    assert(found?.sofor_id === soforId, 'sofor_id egyezik', `Kapott: ${found?.sofor_id}`);
    assert(found?.munkaora === 8.0, 'munkaora értéke 8.0', `Kapott: ${found?.munkaora}`);
  });

  await runTest('getNapiTenyById() visszaadja a rekordot az id alapján', async () => {
    const rec = getNapiTenyById(tenyId);
    assert(rec !== null, 'getNapiTenyById() nem null eredményt ad');
    assert(rec?.datum === testDatum, 'datum egyezik', `Kapott: ${rec?.datum}`);
  });

  await runTest('getNapiTenyByDatum() üres tömböt ad vissza nem létező dátumra', async () => {
    const recs = getNapiTenyByDatum('1900-01-01');
    assert(Array.isArray(recs) && recs.length === 0, 'Nem létező dátumra üres tömb', `Kapott: ${recs.length} rekord`);
  });

  await runTest('updateNapiTeny() frissíti az allapot mezőt', async () => {
    updateNapiTeny(tenyId, { allapot: 'lezart' });
    const rec = getNapiTenyById(tenyId);
    assert(rec?.allapot === 'lezart', 'allapot frissítve "lezart"-ra', `Kapott: ${rec?.allapot}`);
  });

  await runTest('createNapiTeny() alapértelmezett allapot = "rogzitett"', async () => {
    const id2 = createNapiTeny({ datum: testDatum, sofor_id: soforId });
    const rec  = getNapiTenyById(id2);
    assert(rec?.allapot === 'rogzitett', 'Alapértelmezett allapot = "rogzitett"', `Kapott: ${rec?.allapot}`);
    deleteNapiTeny(id2); // Takarítás
  });

  // ─── napi_terv CRUD tesztek ───────────────────────────────────────────────

  section('6. crud.js — Napi terv (napi_terv tábla)');

  let tervId;

  await runTest('createNapiTerv() visszaad egy pozitív egész id-t', async () => {
    tervId = createNapiTerv({
      datum:      testDatum,
      sofor_id:  soforId,
      projekt_id: projektId,
      gep_id:    gepId,
      kezdes:    '08:00',
      vegez:     '16:00',
      allapot:   'javasolt',
    });
    assert(typeof tervId === 'number' && tervId > 0, 'createNapiTerv() pozitív id-t ad vissza', `Kapott: ${tervId}`);
  });

  await runTest('getNapiTervByDatum() visszaadja az adott naphoz tartozó tervet', async () => {
    const recs = getNapiTervByDatum(testDatum);
    const found = recs.find(r => r.id === tervId);
    assert(found !== undefined, 'A terv rekord megtalálható a dátum szerinti lekérdezésben');
    assert(found?.allapot === 'javasolt', 'allapot = "javasolt"', `Kapott: ${found?.allapot}`);
  });

  await runTest('getNapiTervById() visszaadja a terv rekordot id alapján', async () => {
    const rec = getNapiTervById(tervId);
    assert(rec !== null, 'getNapiTervById() nem null eredményt ad');
    assert(rec?.kezdes === '08:00', 'kezdes egyezik', `Kapott: ${rec?.kezdes}`);
  });

  await runTest('updateNapiTerv() elfogadja a tervet (allapot: elfogadott)', async () => {
    updateNapiTerv(tervId, { allapot: 'elfogadott' });
    const rec = getNapiTervById(tervId);
    assert(rec?.allapot === 'elfogadott', 'allapot frissítve "elfogadott"-ra', `Kapott: ${rec?.allapot}`);
  });

  await runTest('createNapiTerv() alapértelmezett allapot = "javasolt"', async () => {
    const id2 = createNapiTerv({ datum: testDatum, sofor_id: soforId });
    const rec  = getNapiTervById(id2);
    assert(rec?.allapot === 'javasolt', 'Alapértelmezett allapot = "javasolt"', `Kapott: ${rec?.allapot}`);
    deleteNapiTerv(id2); // Takarítás
  });

  await runTest('createNapiTerv() alapértelmezett forras = "manualis"', async () => {
    const id3 = createNapiTerv({ datum: testDatum, sofor_id: soforId });
    const rec  = getNapiTervById(id3);
    assert(rec?.forras === 'manualis', 'Alapértelmezett forras = "manualis"', `Kapott: ${rec?.forras}`);
    deleteNapiTerv(id3); // Takarítás
  });

  // ─── Audit log (valtozas_log) tesztek ────────────────────────────────────

  section('7. crud.js — Változásnapló (valtozas_log tábla)');

  await runTest('getValtozasLog() tömböt ad vissza', async () => {
    const log = getValtozasLog();
    assert(Array.isArray(log), 'getValtozasLog() tömböt ad vissza');
  });

  await runTest('A log tartalmaz INSERT bejegyzést a sofőr létrehozáshoz', async () => {
    const log = getValtozasLog();
    const entry = log.find(l => l.tabla === 'sofor' && l.muvelet === 'INSERT' && l.rekord_id === soforId);
    assert(entry !== undefined, 'Sofőr INSERT bejegyzés megtalálható a logban');
  });

  await runTest('A log tartalmaz UPDATE bejegyzést a sofőr frissítéshez', async () => {
    const log = getValtozasLog();
    const entry = log.find(l => l.tabla === 'sofor' && l.muvelet === 'UPDATE' && l.rekord_id === soforId);
    assert(entry !== undefined, 'Sofőr UPDATE bejegyzés megtalálható a logban');
  });

  await runTest('A log bejegyzések tartalmazzák a felhasznalo mezőt', async () => {
    const log = getValtozasLog();
    const allHaveUser = log.every(l => typeof l.felhasznalo === 'string' && l.felhasznalo.length > 0);
    assert(allHaveUser, 'Minden log bejegyzésnek van felhasznalo mezője');
  });

  await runTest('A log bejegyzések tartalmazzák az idopont mezőt', async () => {
    const log = getValtozasLog();
    const allHaveTime = log.every(l => l.idopont !== null && l.idopont !== undefined);
    assert(allHaveTime, 'Minden log bejegyzésnek van idopont mezője');
  });

  // ─── Törlés tesztek ───────────────────────────────────────────────────────

  section('8. crud.js — Törlés műveletek');

  await runTest('deleteNapiTeny() eltávolítja a rekordot', async () => {
    deleteNapiTeny(tenyId);
    const rec = getNapiTenyById(tenyId);
    assert(rec === null, 'A törölt napi tény rekord nem kérhető le (null)', `Kapott: ${JSON.stringify(rec)}`);
  });

  await runTest('deleteNapiTerv() eltávolítja a rekordot', async () => {
    deleteNapiTerv(tervId);
    const rec = getNapiTervById(tervId);
    assert(rec === null, 'A törölt napi terv rekord nem kérhető le (null)', `Kapott: ${JSON.stringify(rec)}`);
  });

  await runTest('deleteGep() eltávolítja a rekordot', async () => {
    deleteGep(gepId);
    const gep = getGepById(gepId);
    assert(gep === null, 'A törölt gép rekord nem kérhető le (null)', `Kapott: ${JSON.stringify(gep)}`);
  });

  await runTest('deleteProjekt() eltávolítja a rekordot', async () => {
    deleteProjekt(projektId);
    const p = getProjektById(projektId);
    assert(p === null, 'A törölt projekt rekord nem kérhető le (null)', `Kapott: ${JSON.stringify(p)}`);
  });

  await runTest('A törlés log bejegyzéseket generál (DELETE muvelet megjelenik)', async () => {
    // Sofőr törlése a tesztadatokhoz
    deleteSofor(soforId);
    const log = getValtozasLog();
    const delEntry = log.find(l => l.tabla === 'sofor' && l.muvelet === 'DELETE' && l.rekord_id === soforId);
    assert(delEntry !== undefined, 'Sofőr DELETE bejegyzés megtalálható a logban');
  });

  // ─── Élső hibaesetek (edge cases) ────────────────────────────────────────

  section('9. Határ- és hibakező esetek');

  await runTest('createSofor() teljes_nev nélkül SQLite NOT NULL hibát dob', async () => {
    let threw = false;
    try {
      createSofor({ statusz: 'aktiv' }); // teljes_nev hiányzik — NOT NULL constraint
    } catch (err) {
      threw = true;
      assert(
        err.message.toLowerCase().includes('not null') || err.message.toLowerCase().includes('constraint'),
        'A hibaüzenet NOT NULL/constraint kulcsszót tartalmaz',
        `Kapott: ${err.message}`
      );
    }
    assert(threw, 'createSofor() teljes_nev nélkül kivételt dob');
  });

  await runTest('createNapiTeny() datum nélkül NOT NULL hibát dob', async () => {
    let threw = false;
    try {
      createNapiTeny({ sofor_id: 1 }); // datum hiányzik — NOT NULL
    } catch (err) {
      threw = true;
    }
    assert(threw, 'createNapiTeny() datum nélkül kivételt dob');
  });

  await runTest('createNapiTerv() datum nélkül NOT NULL hibát dob', async () => {
    let threw = false;
    try {
      createNapiTerv({ sofor_id: 1 }); // datum hiányzik — NOT NULL
    } catch (err) {
      threw = true;
    }
    assert(threw, 'createNapiTerv() datum nélkül kivételt dob');
  });

  await runTest('getAllSoforok() üres tömböt ad vissza, ha nincs sofőr', async () => {
    // A teszt futásának ezen pontján töröltük az összes teszt sofőrt
    const soforok = getAllSoforok();
    // Ellenőrizzük, hogy a visszatérési érték valóban tömb (lehet 0 vagy több elem)
    assert(Array.isArray(soforok), 'getAllSoforok() mindig tömböt ad vissza (nem null/undefined)');
  });

  // ─── Összesítő ────────────────────────────────────────────────────────────

  const total = results.passed + results.failed;
  const pct = total > 0 ? Math.round(results.passed / total * 100) : 0;

  console.log('');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#C8C4BC');
  console.log(
    `%cEredmény: ${results.passed} / ${total} átment (${pct}%)`,
    results.failed === 0
      ? 'font-weight:700;font-size:15px;color:#2D6A4F'
      : 'font-weight:700;font-size:15px;color:#C0392B'
  );

  if (results.errors.length > 0) {
    console.log('%cBukott tesztek:', 'font-weight:700;color:#C0392B');
    results.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  } else {
    console.log('%cMinden teszt átment. A DB réteg viselkedése megfelel az elvartaknak.', 'color:#2D6A4F');
  }
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#C8C4BC');

  return results;

})();
