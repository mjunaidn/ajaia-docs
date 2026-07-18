import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useSession } from '../App.jsx';

function timeAgo(iso) {
  const then = new Date(iso.replace(' ', 'T') + 'Z');
  const diffMs = Date.now() - then.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function DocRow({ doc, onOpen }) {
  return (
    <button className="doc-row" onClick={() => onOpen(doc.id)}>
      <span className="doc-tab" style={{ background: doc.ownerColor || '#5B5FEF' }} aria-hidden="true" />
      <span className="doc-row-main">
        <span className="doc-row-title">{doc.title}</span>
        <span className="doc-row-meta">
          {doc.access === 'owner' ? 'You' : doc.ownerName} · edited {timeAgo(doc.updatedAt)}
        </span>
      </span>
      <span className={`badge badge-${doc.access}`}>
        {doc.access === 'owner' ? 'owner' : doc.access === 'edit' ? 'can edit' : 'can view'}
      </span>
    </button>
  );
}

export default function Dashboard() {
  const { currentUser, users, logout } = useSession();
  const navigate = useNavigate();
  const [owned, setOwned] = useState([]);
  const [shared, setShared] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function refresh() {
    setStatus('loading');
    try {
      const data = await api.listDocuments();
      setOwned(data.owned);
      setShared(data.shared);
      setStatus('ready');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  async function handleCreate() {
    setError('');
    try {
      const doc = await api.createDocument('Untitled document');
      navigate(`/docs/${doc.id}`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleUploadChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const doc = await api.uploadDocument(file);
      navigate(`/docs/${doc.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span className="brand-name">Marginalia</span>
        </div>
        <div className="topbar-actions">
          <span className="current-user">
            <span className="avatar avatar-sm" style={{ background: currentUser.color }}>
              {currentUser.name.split(' ').map((n) => n[0]).join('')}
            </span>
            {currentUser.name}
          </span>
          <button className="btn btn-ghost" onClick={logout}>
            Switch account
          </button>
        </div>
      </header>

      <main className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Documents</h1>
            <p className="dashboard-sub">
              {users.length} seeded accounts available for sharing demos.
            </p>
          </div>
          <div className="dashboard-actions">
            <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
              Import file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.docx"
              hidden
              onChange={handleUploadChange}
            />
            <button className="btn btn-primary" onClick={handleCreate}>
              New document
            </button>
          </div>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        {status === 'loading' && <p className="empty-note">Loading your documents…</p>}

        {status === 'ready' && (
          <>
            <section>
              <h2 className="section-label">Owned by you</h2>
              {owned.length === 0 ? (
                <p className="empty-note">
                  No documents yet. Create one, or import a .txt / .md / .docx file to get started.
                </p>
              ) : (
                <div className="doc-list">
                  {owned.map((d) => (
                    <DocRow key={d.id} doc={{ ...d, ownerColor: currentUser.color }} onOpen={(id) => navigate(`/docs/${id}`)} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="section-label">Shared with you</h2>
              {shared.length === 0 ? (
                <p className="empty-note">Nothing has been shared with you yet.</p>
              ) : (
                <div className="doc-list">
                  {shared.map((d) => {
                    const owner = users.find((u) => u.name === d.ownerName);
                    return (
                      <DocRow
                        key={d.id}
                        doc={{ ...d, ownerColor: owner?.color }}
                        onOpen={(id) => navigate(`/docs/${id}`)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
