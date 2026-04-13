-- =============================================================================
-- Pilot Erőforrás — PostgreSQL séma
-- Futtatás: psql -U postgres -d pilot_eroforras -f migration.sql
-- =============================================================================

-- updated_at automatikus frissítése
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TÁBLÁK
-- =============================================================================

CREATE TABLE IF NOT EXISTS sofor (
  id             SERIAL PRIMARY KEY,
  teljes_nev     TEXT    NOT NULL,
  aliasok        TEXT,
  belepesi_datum DATE,
  statusz        TEXT    NOT NULL DEFAULT 'aktiv'
                   CHECK (statusz IN ('aktiv','inaktiv')),
  beosztas       TEXT    NOT NULL DEFAULT 'sofor'
                   CHECK (beosztas IN ('sofor','gepkezelo','sofor_es_gepkezelo')),
  megjegyzes     TEXT,
  torolt         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projekt (
  id          SERIAL PRIMARY KEY,
  munkaszam   TEXT    NOT NULL UNIQUE,
  helyszin    TEXT,
  megrendelo  TEXT,
  leiras      TEXT,
  torolt      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gep_csoport (
  id         SERIAL PRIMARY KEY,
  nev        TEXT NOT NULL UNIQUE,
  torolt     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gep (
  id         SERIAL PRIMARY KEY,
  tipus      TEXT,
  rendszam   TEXT,
  megjegyzes TEXT,
  vallalkozo TEXT,
  csoport_id INTEGER REFERENCES gep_csoport(id),
  allapot    TEXT    NOT NULL DEFAULT 'elerheto'
               CHECK (allapot IN ('elerheto','szerviz','kivont')),
  torolt     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS napi_terv (
  id         SERIAL PRIMARY KEY,
  datum      DATE    NOT NULL,
  sofor_id   INTEGER REFERENCES sofor(id),
  projekt_id INTEGER REFERENCES projekt(id),
  gep_id     INTEGER REFERENCES gep(id),
  kezdes     TIME,
  vegez      TIME,
  allapot    TEXT    NOT NULL DEFAULT 'javasolt'
               CHECK (allapot IN ('javasolt','elfogadott','torolt')),
  megjegyzes TEXT,
  forras     TEXT    NOT NULL DEFAULT 'manualis'
               CHECK (forras IN ('manualis','import')),
  torolt     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS napi_teny (
  id                SERIAL PRIMARY KEY,
  datum             DATE    NOT NULL,
  sofor_id          INTEGER REFERENCES sofor(id),
  projekt_id        INTEGER REFERENCES projekt(id),
  gep_id            INTEGER REFERENCES gep(id),
  kezd_idopont      TIMESTAMPTZ,
  befejezes_idopont TIMESTAMPTZ,
  munkaora          REAL,
  fuvarok_szama     INTEGER,
  allapot           TEXT    NOT NULL DEFAULT 'rogzitett'
                      CHECK (allapot IN ('rogzitett','lezart','torolt')),
  megjegyzes        TEXT,
  forras            TEXT    NOT NULL DEFAULT 'manualis'
                      CHECK (forras IN ('manualis','import')),
  torolt            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tavollet (
  id         SERIAL PRIMARY KEY,
  sofor_id   INTEGER NOT NULL REFERENCES sofor(id),
  datum_tol  DATE    NOT NULL,
  datum_ig   DATE    NOT NULL,
  tipus      TEXT    NOT NULL DEFAULT 'szabadsag'
               CHECK (tipus IN ('szabadsag','betegseg','egyeb')),
  megjegyzes TEXT,
  torolt     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kompetencia (
  id         SERIAL PRIMARY KEY,
  sofor_id   INTEGER NOT NULL REFERENCES sofor(id),
  gep_id     INTEGER NOT NULL REFERENCES gep(id),
  torolt     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sofor_id, gep_id)
);

CREATE TABLE IF NOT EXISTS kompetencia_csoport (
  id         SERIAL PRIMARY KEY,
  sofor_id   INTEGER NOT NULL REFERENCES sofor(id),
  csoport_id INTEGER NOT NULL REFERENCES gep_csoport(id),
  torolt     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sofor_id, csoport_id)
);

CREATE TABLE IF NOT EXISTS valtozas_log (
  id         SERIAL PRIMARY KEY,
  tabla      TEXT,
  rekord_id  INTEGER,
  muvelet    TEXT CHECK (muvelet IN ('INSERT','UPDATE','SOFT_DELETE')),
  felhasznalo TEXT DEFAULT 'rendszer',
  idopont    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  leiras     TEXT
);

CREATE TABLE IF NOT EXISTS felhasznalo (
  id             SERIAL PRIMARY KEY,
  nev            TEXT    NOT NULL,
  felhasznalonev TEXT    NOT NULL UNIQUE,
  jelszo_hash    TEXT    NOT NULL,
  szerep         TEXT    NOT NULL DEFAULT 'diszpecser'
                   CHECK (szerep IN ('admin','diszpecser')),
  aktiv          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXEK
-- =============================================================================

-- sofor
CREATE INDEX IF NOT EXISTS idx_sofor_torolt    ON sofor(torolt);
CREATE INDEX IF NOT EXISTS idx_sofor_statusz   ON sofor(statusz);

-- projekt
CREATE INDEX IF NOT EXISTS idx_projekt_torolt  ON projekt(torolt);
CREATE INDEX IF NOT EXISTS idx_projekt_mszam   ON projekt(munkaszam);

-- gep_csoport
CREATE INDEX IF NOT EXISTS idx_gep_csoport_torolt ON gep_csoport(torolt);

-- gep
CREATE INDEX IF NOT EXISTS idx_gep_torolt      ON gep(torolt);
CREATE INDEX IF NOT EXISTS idx_gep_csoport_id  ON gep(csoport_id);
CREATE INDEX IF NOT EXISTS idx_gep_allapot     ON gep(allapot);

-- napi_terv
CREATE INDEX IF NOT EXISTS idx_napi_terv_torolt    ON napi_terv(torolt);
CREATE INDEX IF NOT EXISTS idx_napi_terv_datum     ON napi_terv(datum);
CREATE INDEX IF NOT EXISTS idx_napi_terv_sofor_id  ON napi_terv(sofor_id);
CREATE INDEX IF NOT EXISTS idx_napi_terv_projekt_id ON napi_terv(projekt_id);
CREATE INDEX IF NOT EXISTS idx_napi_terv_gep_id    ON napi_terv(gep_id);

-- napi_teny
CREATE INDEX IF NOT EXISTS idx_napi_teny_torolt     ON napi_teny(torolt);
CREATE INDEX IF NOT EXISTS idx_napi_teny_datum      ON napi_teny(datum);
CREATE INDEX IF NOT EXISTS idx_napi_teny_sofor_id   ON napi_teny(sofor_id);
CREATE INDEX IF NOT EXISTS idx_napi_teny_projekt_id ON napi_teny(projekt_id);
CREATE INDEX IF NOT EXISTS idx_napi_teny_gep_id     ON napi_teny(gep_id);

-- tavollet
CREATE INDEX IF NOT EXISTS idx_tavollet_torolt   ON tavollet(torolt);
CREATE INDEX IF NOT EXISTS idx_tavollet_sofor_id ON tavollet(sofor_id);
CREATE INDEX IF NOT EXISTS idx_tavollet_datum    ON tavollet(datum_tol, datum_ig);

-- kompetencia
CREATE INDEX IF NOT EXISTS idx_komp_sofor ON kompetencia(sofor_id);
CREATE INDEX IF NOT EXISTS idx_komp_gep   ON kompetencia(gep_id);

-- kompetencia_csoport
CREATE INDEX IF NOT EXISTS idx_komp_cs_sofor   ON kompetencia_csoport(sofor_id);
CREATE INDEX IF NOT EXISTS idx_komp_cs_csoport ON kompetencia_csoport(csoport_id);

-- valtozas_log
CREATE INDEX IF NOT EXISTS idx_vlog_tabla     ON valtozas_log(tabla);
CREATE INDEX IF NOT EXISTS idx_vlog_rekord_id ON valtozas_log(rekord_id);
CREATE INDEX IF NOT EXISTS idx_vlog_idopont   ON valtozas_log(idopont);

-- =============================================================================
-- UPDATED_AT TRIGGEREK
-- =============================================================================

CREATE OR REPLACE TRIGGER trg_sofor_updated_at
  BEFORE UPDATE ON sofor
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_projekt_updated_at
  BEFORE UPDATE ON projekt
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_gep_csoport_updated_at
  BEFORE UPDATE ON gep_csoport
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_gep_updated_at
  BEFORE UPDATE ON gep
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_napi_terv_updated_at
  BEFORE UPDATE ON napi_terv
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_napi_teny_updated_at
  BEFORE UPDATE ON napi_teny
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_tavollet_updated_at
  BEFORE UPDATE ON tavollet
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_felhasznalo_updated_at
  BEFORE UPDATE ON felhasznalo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SEED: admin felhasználó
-- Jelszó: 'password' — CSAK PLACEHOLDER, production előtt cserélendő!
-- Hash: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- A tényleges 'admin' jelszóhoz futtasd: node -e "require('bcrypt').hash('admin',10).then(console.log)"
-- =============================================================================

INSERT INTO felhasznalo (nev, felhasznalonev, jelszo_hash, szerep, aktiv)
VALUES (
  'Adminisztrátor',
  'admin',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  TRUE
)
ON CONFLICT (felhasznalonev) DO NOTHING;
