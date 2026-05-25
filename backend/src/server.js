import { initDb } from './db.js';
import { createApp } from './app.js';

const PORT = process.env.PORT || 4000;

await initDb();

createApp().listen(PORT, () => {
  console.log('───────────────────────────────────────────────');
  console.log(' FitProfit Admin  →  http://localhost:' + PORT);
  console.log(' Logowanie panelu:     POST /api/auth/login');
  console.log(' Konfiguracja app:     GET  /api/app/config');
  console.log('───────────────────────────────────────────────');
});
