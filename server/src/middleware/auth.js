import { db } from '../db.js';

/**
 * This project uses mocked authentication, as explicitly permitted by the
 * assignment brief ("You may simulate users with seeded accounts, mocked
 * auth, or a lightweight login flow if that keeps the scope reasonable").
 *
 * The client picks a seeded user on the login screen and sends that user's
 * id on every request via the `x-user-id` header. There are no passwords
 * and no sessions. This is intentionally out of scope for a 4-6 hour build;
 * see ARCHITECTURE.md for what real auth would require.
 */
export function requireUser(req, res, next) {
  const userId = Number(req.header('x-user-id'));

  if (!userId || Number.isNaN(userId)) {
    return res.status(401).json({ error: 'Missing or invalid x-user-id header' });
  }

  const user = db.prepare('SELECT id, name, email, color FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(401).json({ error: 'Unknown user' });
  }

  req.user = user;
  next();
}
