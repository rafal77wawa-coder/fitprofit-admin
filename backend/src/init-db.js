// Ręczna inicjalizacja bazy (npm run seed). Serwer i tak robi to sam przy starcie.
import { initDb } from './db.js';
await initDb();
console.log('Gotowe.');
process.exit(0);
