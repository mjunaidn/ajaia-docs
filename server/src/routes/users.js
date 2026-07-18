import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Public: powers the login screen (seeded-account picker, no passwords).
router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, name, email, color FROM users ORDER BY id').all();
  res.json(users);
});

export default router;
