import express from 'express';
import dotenv from 'dotenv';

// .env betöltése legkorábban, minden import előtt
dotenv.config();

// Route importok
import authRoutes        from './routes/auth.js';
import soforokRoutes     from './routes/soforok.js';
import projektekRoutes   from './routes/projektek.js';
import gepCsoportokRoutes from './routes/gep_csoportok.js';
import gepekRoutes       from './routes/gepek.js';
import kompetenciaRoutes from './routes/kompetencia.js';
import tavolletekRoutes  from './routes/tavolletek.js';
import napiTenyRoutes    from './routes/napi_teny.js';
import napiTervRoutes    from './routes/napi_terv.js';
import importRoutes      from './routes/import.js';
import exportRoutes      from './routes/export.js';

const app  = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS — fejlesztési célra minden origin engedélyezett
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// JSON body parser (max 5 MB)
app.use(express.json({ limit: '5mb' }));

// Request logger (csak dev módban)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',         authRoutes);
app.use('/api/soforok',      soforokRoutes);
app.use('/api/projektek',    projektekRoutes);
app.use('/api/gep_csoportok', gepCsoportokRoutes);
app.use('/api/gepek',        gepekRoutes);
app.use('/api/kompetencia',  kompetenciaRoutes);
app.use('/api/tavolletek',   tavolletekRoutes);
app.use('/api/napi_teny',    napiTenyRoutes);
app.use('/api/napi_terv',    napiTervRoutes);
app.use('/api/import',       importRoutes);
app.use('/api/export',       exportRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Az endpoint nem található.' });
});

// ─── Hiba middleware ──────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server] Kezeletlen hiba:', err);

  // Multer hibák
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'A feltöltött fájl túl nagy (max 10 MB).' });
  }
  if (err.message && err.message.includes('xlsx')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({
    error: 'Belső szerver hiba.',
    ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
  });
});

// ─── Indítás ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] Pilot Erőforrás backend fut: http://localhost:${PORT}`);
  console.log(`[server] Health: http://localhost:${PORT}/health`);
});

export default app;
