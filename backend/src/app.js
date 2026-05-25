import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import db from './db.js';
import { requireAuth } from './auth.js';
import authRoutes from './routes/auth.js';
import appConfigRoutes from './routes/appConfig.js';
import scoringRoutes from './routes/scoring.js';
import brandingRoutes from './routes/branding.js';
import charityRoutes from './routes/charity.js';
import rewardsRoutes from './routes/rewards.js';
import infopagesRoutes from './routes/infopages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Zbudowany panel: backend serwuje go w produkcji (jedna domena, bez CORS).
const PANEL_DIST = path.join(__dirname, '..', '..', 'panel', 'dist');

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'fitprofit-admin-api', ts: Date.now() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/app', appConfigRoutes);
  app.use('/api/admin/scoring', scoringRoutes);
  app.use('/api/admin/branding', brandingRoutes);
  app.use('/api/admin/charity', charityRoutes);
  app.use('/api/admin/rewards', rewardsRoutes);
  app.use('/api/admin/pages', infopagesRoutes);

  app.get('/api/admin/contests', requireAuth, async (req, res) => {
    res.json({ contests: await db.all('SELECT * FROM contests ORDER BY id DESC') });
  });

  app.get('/api/admin/contests/:id', requireAuth, async (req, res) => {
    const contest = await db.get('SELECT * FROM contests WHERE id = ?', req.params.id);
    if (!contest) return res.status(404).json({ error: 'Nie znaleziono wyzwania.' });
    const scoring = await db.all('SELECT * FROM scoring_rules WHERE contest_id = ?', contest.id);
    const count = async (t) =>
      Number((await db.get('SELECT COUNT(*) AS c FROM ' + t + ' WHERE contest_id = ?', contest.id)).c);
    res.json({
      contest,
      scoring,
      stats: {
        participants: await count('participants'),
        rewards: await count('rewards'),
        charityGoals: await count('charity_goals'),
      },
    });
  });

  // ── Serwowanie zbudowanego panelu (jeśli istnieje) ──
  if (fs.existsSync(PANEL_DIST)) {
    app.use(express.static(PANEL_DIST));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Nie znaleziono.' });
      res.sendFile(path.join(PANEL_DIST, 'index.html'));
    });
  }

  return app;
}

export default createApp;
