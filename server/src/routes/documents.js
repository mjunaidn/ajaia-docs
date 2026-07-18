import { Router } from 'express';
import multer from 'multer';
import { marked } from 'marked';
import mammoth from 'mammoth';
import { db } from '../db.js';
import { requireUser } from '../middleware/auth.js';
import { getAccessLevel, canView, canEdit } from '../access.js';

const router = Router();
router.use(requireUser);

const MAX_TITLE_LENGTH = 200;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB — plenty for the supported text formats
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.markdown', '.docx'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = extensionOf(file.originalname);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Unsupported file type "${ext}". Supported: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
    cb(null, true);
  },
});

function extensionOf(filename = '') {
  const i = filename.lastIndexOf('.');
  return i === -1 ? '' : filename.slice(i).toLowerCase();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textToHtml(text) {
  return text
    .split(/\r?\n\r?\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\r?\n/g, '<br>')}</p>`)
    .join('\n') || '<p></p>';
}

function serializeDocument(doc, accessLevel) {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    ownerId: doc.owner_id,
    ownerName: doc.owner_name,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    access: accessLevel,
  };
}

// GET /api/documents - documents the caller owns, and documents shared with them
router.get('/', (req, res) => {
  const owned = db
    .prepare(
      `SELECT d.*, u.name AS owner_name FROM documents d
       JOIN users u ON u.id = d.owner_id
       WHERE d.owner_id = ?
       ORDER BY d.updated_at DESC`
    )
    .all(req.user.id)
    .map((d) => serializeDocument(d, 'owner'));

  const shared = db
    .prepare(
      `SELECT d.*, u.name AS owner_name, s.permission FROM documents d
       JOIN users u ON u.id = d.owner_id
       JOIN shares s ON s.document_id = d.id
       WHERE s.user_id = ?
       ORDER BY d.updated_at DESC`
    )
    .all(req.user.id)
    .map((d) => serializeDocument(d, d.permission));

  res.json({ owned, shared });
});

// POST /api/documents - create a new blank document
router.post('/', (req, res) => {
  const title = (req.body?.title || 'Untitled document').toString().slice(0, MAX_TITLE_LENGTH);
  const content = typeof req.body?.content === 'string' ? req.body.content : '';

  const result = db
    .prepare('INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)')
    .run(title, content, req.user.id);

  const doc = db
    .prepare(
      `SELECT d.*, u.name AS owner_name FROM documents d
       JOIN users u ON u.id = d.owner_id WHERE d.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json(serializeDocument(doc, 'owner'));
});

// POST /api/documents/upload - turn an uploaded .txt/.md/.docx file into a new document
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded. Field name must be "file".' });
    }

    const ext = extensionOf(req.file.originalname);
    const suggestedTitle = req.file.originalname.replace(/\.[^.]+$/, '').slice(0, MAX_TITLE_LENGTH);
    const title = (req.body?.title || suggestedTitle || 'Imported document').slice(0, MAX_TITLE_LENGTH);

    try {
      let html;

      if (ext === '.docx') {
        const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
        html = result.value || '<p></p>';
      } else if (ext === '.md' || ext === '.markdown') {
        html = marked.parse(req.file.buffer.toString('utf-8'));
      } else {
        // .txt
        html = textToHtml(req.file.buffer.toString('utf-8'));
      }

      const result = db
        .prepare('INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)')
        .run(title, html, req.user.id);

      const doc = db
        .prepare(
          `SELECT d.*, u.name AS owner_name FROM documents d
           JOIN users u ON u.id = d.owner_id WHERE d.id = ?`
        )
        .get(result.lastInsertRowid);

      res.status(201).json(serializeDocument(doc, 'owner'));
    } catch (parseErr) {
      console.error('Upload parse error:', parseErr);
      res.status(422).json({ error: 'Could not parse that file. It may be corrupted or in an unexpected format.' });
    }
  });
});

// GET /api/documents/:id
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const level = getAccessLevel(id, req.user.id);

  if (!canView(level)) {
    return res.status(level ? 403 : 404).json({ error: level ? 'You do not have access to this document' : 'Document not found' });
  }

  const doc = db
    .prepare(
      `SELECT d.*, u.name AS owner_name FROM documents d
       JOIN users u ON u.id = d.owner_id WHERE d.id = ?`
    )
    .get(id);

  const payload = serializeDocument(doc, level);

  if (level === 'owner') {
    payload.shares = db
      .prepare(
        `SELECT s.user_id AS userId, s.permission, u.name, u.email, u.color
         FROM shares s JOIN users u ON u.id = s.user_id
         WHERE s.document_id = ? ORDER BY s.created_at`
      )
      .all(id);
  }

  res.json(payload);
});

// PATCH /api/documents/:id - rename and/or edit content
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const level = getAccessLevel(id, req.user.id);

  if (!canEdit(level)) {
    return res.status(level ? 403 : 404).json({ error: level ? 'You only have view access to this document' : 'Document not found' });
  }

  const updates = [];
  const params = [];

  if (typeof req.body?.title === 'string') {
    const title = req.body.title.trim().slice(0, MAX_TITLE_LENGTH);
    if (!title) return res.status(400).json({ error: 'Title cannot be empty' });
    updates.push('title = ?');
    params.push(title);
  }

  if (typeof req.body?.content === 'string') {
    updates.push('content = ?');
    params.push(req.body.content);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nothing to update. Provide title and/or content.' });
  }

  updates.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const doc = db
    .prepare(
      `SELECT d.*, u.name AS owner_name FROM documents d
       JOIN users u ON u.id = d.owner_id WHERE d.id = ?`
    )
    .get(id);

  res.json(serializeDocument(doc, level));
});

// DELETE /api/documents/:id - owner only
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const level = getAccessLevel(id, req.user.id);

  if (level !== 'owner') {
    return res.status(level ? 403 : 404).json({ error: level ? 'Only the owner can delete this document' : 'Document not found' });
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  res.status(204).end();
});

// POST /api/documents/:id/share - owner grants another user access by email
router.post('/:id/share', (req, res) => {
  const id = Number(req.params.id);
  const level = getAccessLevel(id, req.user.id);

  if (level !== 'owner') {
    return res.status(level ? 403 : 404).json({ error: level ? 'Only the owner can share this document' : 'Document not found' });
  }

  const email = (req.body?.email || '').toString().trim().toLowerCase();
  const permission = req.body?.permission === 'view' ? 'view' : 'edit';

  if (!email) {
    return res.status(400).json({ error: 'An email is required to share this document' });
  }

  const target = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email);
  if (!target) {
    return res.status(404).json({ error: `No user found with email ${email}` });
  }
  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'You already own this document' });
  }

  db.prepare(
    `INSERT INTO shares (document_id, user_id, permission) VALUES (?, ?, ?)
     ON CONFLICT(document_id, user_id) DO UPDATE SET permission = excluded.permission`
  ).run(id, target.id, permission);

  const shares = db
    .prepare(
      `SELECT s.user_id AS userId, s.permission, u.name, u.email, u.color
       FROM shares s JOIN users u ON u.id = s.user_id
       WHERE s.document_id = ? ORDER BY s.created_at`
    )
    .all(id);

  res.status(201).json({ shares });
});

// DELETE /api/documents/:id/share/:userId - owner revokes access
router.delete('/:id/share/:userId', (req, res) => {
  const id = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const level = getAccessLevel(id, req.user.id);

  if (level !== 'owner') {
    return res.status(level ? 403 : 404).json({ error: level ? 'Only the owner can manage sharing' : 'Document not found' });
  }

  db.prepare('DELETE FROM shares WHERE document_id = ? AND user_id = ?').run(id, targetUserId);
  res.status(204).end();
});

export default router;
