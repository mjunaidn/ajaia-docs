import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { api } from '../api.js';
import { useSession } from '../App.jsx';
import Toolbar from '../components/Toolbar.jsx';
import ShareModal from '../components/ShareModal.jsx';

const SAVE_DEBOUNCE_MS = 700;

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSession();

  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('loading'); // loading | ready | error | not-found
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [shareOpen, setShareOpen] = useState(false);
  const saveTimer = useRef(null);
  const titleTimer = useRef(null);
  const isReadOnly = doc && doc.access === 'view';

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: '',
    editable: false,
    onUpdate: ({ editor: ed }) => {
      scheduleContentSave(ed.getHTML());
    },
  });

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api
      .getDocument(id)
      .then((data) => {
        if (cancelled) return;
        setDoc(data);
        setTitle(data.title);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err.status === 404 || err.status === 403 ? 'not-found' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load fetched content into the editor once both are ready.
  useEffect(() => {
    if (editor && doc) {
      editor.commands.setContent(doc.content || '<p></p>');
      editor.setEditable(doc.access !== 'view');
    }
  }, [editor, doc?.id]);

  const scheduleContentSave = useCallback(
    (html) => {
      setSaveState('saving');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await api.updateDocument(id, { content: html });
          setSaveState('saved');
        } catch {
          setSaveState('error');
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [id]
  );

  function handleTitleChange(e) {
    const value = e.target.value;
    setTitle(value);
    setSaveState('saving');
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      if (!value.trim()) return;
      try {
        await api.updateDocument(id, { title: value.trim() });
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, SAVE_DEBOUNCE_MS);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteDocument(id);
      navigate('/docs');
    } catch (err) {
      alert(err.message);
    }
  }

  if (status === 'loading') {
    return <div className="full-screen-status">Loading document…</div>;
  }

  if (status === 'not-found') {
    return (
      <div className="full-screen-status">
        <p>This document doesn't exist, or hasn't been shared with {currentUser.name}.</p>
        <Link className="btn btn-primary" to="/docs">
          Back to documents
        </Link>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="full-screen-status">
        <p>Something went wrong loading this document.</p>
        <Link className="btn btn-primary" to="/docs">
          Back to documents
        </Link>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/docs" className="btn btn-ghost btn-sm">
          ← Documents
        </Link>
        <input
          className="title-input"
          value={title}
          onChange={handleTitleChange}
          disabled={isReadOnly}
          aria-label="Document title"
        />
        <div className="topbar-actions">
          <span className="save-indicator" data-state={saveState}>
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && 'Saved'}
            {saveState === 'error' && "Couldn't save"}
            {saveState === 'idle' && (isReadOnly ? 'View only' : '')}
          </span>
          {doc.access === 'owner' && (
            <>
              <button className="btn btn-ghost" onClick={() => setShareOpen(true)}>
                Share
              </button>
              <button className="btn btn-danger-ghost" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </header>

      {!isReadOnly && <Toolbar editor={editor} disabled={isReadOnly} />}

      <main className="editor-page">
        <div className="editor-meta">
          Owned by {doc.access === 'owner' ? 'you' : doc.ownerName}
          {isReadOnly && ' · you can view but not edit this document'}
        </div>
        <div className={`editor-surface${isReadOnly ? ' is-readonly' : ''}`}>
          <EditorContent editor={editor} />
        </div>
      </main>

      {shareOpen && (
        <ShareModal
          doc={doc}
          onClose={() => setShareOpen(false)}
          onSharesChange={(shares) => setDoc((d) => ({ ...d, shares }))}
        />
      )}
    </div>
  );
}
