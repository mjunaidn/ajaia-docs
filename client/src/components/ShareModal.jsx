import { useState } from 'react';
import { api } from '../api.js';

export default function ShareModal({ doc, onClose, onSharesChange }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('edit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleShare(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { shares } = await api.shareDocument(doc.id, email.trim(), permission);
      onSharesChange(shares);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(userId) {
    setBusy(true);
    setError('');
    try {
      await api.revokeShare(doc.id, userId);
      onSharesChange((doc.shares || []).filter((s) => s.userId !== userId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share "{doc.title}"</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="share-form" onSubmit={handleShare}>
          <input
            type="email"
            placeholder="teammate@ajaia.test"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select value={permission} onChange={(e) => setPermission(e.target.value)}>
            <option value="edit">Can edit</option>
            <option value="view">Can view</option>
          </select>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Share
          </button>
        </form>
        <p className="modal-hint">
          Seeded accounts for this demo: alex@ajaia.test, jordan@ajaia.test, sam@ajaia.test
        </p>

        {error && <div className="banner banner-error">{error}</div>}

        <div className="share-list">
          {(doc.shares || []).length === 0 && <p className="empty-note">Not shared with anyone yet.</p>}
          {(doc.shares || []).map((s) => (
            <div className="share-row" key={s.userId}>
              <span className="avatar avatar-sm" style={{ background: s.color }}>
                {s.name.split(' ').map((n) => n[0]).join('')}
              </span>
              <span className="share-row-name">
                {s.name}
                <span className="share-row-email">{s.email}</span>
              </span>
              <span className="badge badge-view">{s.permission === 'edit' ? 'can edit' : 'can view'}</span>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => handleRevoke(s.userId)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
