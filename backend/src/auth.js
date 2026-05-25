import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'fitprofit-dev-secret-zmien-mnie';
const EXPIRES = '12h';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    SECRET,
    { expiresIn: EXPIRES }
  );
}

// Wymaga poprawnego tokenu — chroni endpointy panelu.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Brak autoryzacji — zaloguj się.' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sesja wygasła — zaloguj się ponownie.' });
  }
}

// Ogranicza dostęp do wybranych ról (np. tylko 'admin').
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Brak wymaganych uprawnień.' });
    }
    next();
  };
}
