import { db } from './db.js';

/**
 * Returns the caller's access level for a document:
 *   'owner' | 'edit' | 'view' | null (no access)
 */
export function getAccessLevel(documentId, userId) {
  const doc = db
    .prepare('SELECT owner_id FROM documents WHERE id = ?')
    .get(documentId);

  if (!doc) return null;
  if (doc.owner_id === userId) return 'owner';

  const share = db
    .prepare('SELECT permission FROM shares WHERE document_id = ? AND user_id = ?')
    .get(documentId, userId);

  return share ? share.permission : null;
}

export function canView(level) {
  return level === 'owner' || level === 'edit' || level === 'view';
}

export function canEdit(level) {
  return level === 'owner' || level === 'edit';
}
