import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import db from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/login — logowanie do panelu administracyjnego
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Podaj poprawny e-mail i hasło.' });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const user = await db.get('SELECT * FROM admin_users WHERE email = ?', email);

  if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) {
    return res.status(401).json({ error: 'Błędny e-mail lub hasło.' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

// GET /api/auth/me — dane zalogowanego administratora
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
