import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/equipment', async (_req, res) => {
  try {
    const list = await prisma.equipment.findMany();
    res.json(list);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/equipment', async (req, res) => {
  try {
    const e = await prisma.equipment.create({ data: req.body });
    res.status(201).json(e);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/persons', async (_req, res) => {
  try {
    const list = await prisma.person.findMany();
    res.json(list);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/persons', async (req, res) => {
  try {
    const p = await prisma.person.create({ data: req.body });
    res.status(201).json(p);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dev server running on http://localhost:${PORT}`));
