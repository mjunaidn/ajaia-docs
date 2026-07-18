# Marginalia

A lightweight collaborative document editor, built for the Ajaia AI-Native Full Stack
Developer take-home assignment. Users can create and format rich-text documents,
import `.txt` / `.md` / `.docx` files as new documents, and share documents with other
seeded users with view or edit permissions.

Live deployment: **`<TODO: paste Render URL here after deploy>`**

## Features

- **Document creation & editing** — create, rename, edit, and reopen documents. Content
  autosaves ~700ms after you stop typing.
- **Rich text formatting** — bold, italic, underline, H1/H2 headings, paragraph, and
  bulleted/numbered lists, via a [Tiptap](https://tiptap.dev/) editor.
- **File upload** — import a `.txt`, `.md`/`.markdown`, or `.docx` file and it becomes a
  new editable document. Supported types only; anything else is rejected with a clear
  error (see [File upload](#file-upload) below).
- **Sharing** — a document owner can grant another seeded user "can view" or "can edit"
  access by email. The dashboard clearly separates **Owned by you** from **Shared with
  you**, and each row shows the caller's access level.
- **Persistence** — documents and shares are stored in SQLite and survive a refresh or
  server restart.
- **Mocked auth** — no passwords. Pick a seeded account on the login screen; every
  request after that carries an `x-user-id` header. This is explicitly permitted by the
  assignment brief and is documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Tech stack

| Layer     | Choice                                                                 |
|-----------|-------------------------------------------------------------------------|
| Frontend  | React 18, Vite, React Router, Tiptap (`@tiptap/react` + `starter-kit`)  |
| Backend   | Node.js, Express, `better-sqlite3`, `multer`, `mammoth` (.docx → HTML), `marked` (.md → HTML) |
| Database  | SQLite (single file, WAL mode)                                        |
| Testing   | Vitest + Supertest                                                     |

## Project structure

```
ajaia-docs/
├── client/                # React + Vite frontend
│   └── src/
│       ├── pages/         # Login, Dashboard, Editor
│       ├── components/    # Toolbar, ShareModal
│       └── api.js         # fetch wrapper, attaches x-user-id header
├── server/                # Express + SQLite backend
│   └── src/
│       ├── routes/        # users, documents (CRUD, upload, share)
│       ├── middleware/    # mocked-auth (x-user-id)
│       ├── access.js      # owner/edit/view access-level resolution
│       ├── db.js          # schema + seed-on-boot
│       ├── seed.js        # `npm run seed` entrypoint
│       └── __tests__/     # Vitest + Supertest suite
└── package.json           # npm workspaces root (client + server)
```

## Local setup

Requires Node.js >= 18.

```bash
npm install       # installs root, server, and client workspaces
npm run seed      # seeds 3 demo users (safe to re-run; no-ops if users exist)
npm run test      # runs the server test suite (12 tests)
npm run dev       # runs client (5173) and server (4000) together
```

Open **http://localhost:5173**. Vite proxies `/api` to the server on port 4000 in dev.

There are no environment variables or API keys required to run this locally.

### Seeded accounts

The login screen lists three seeded users — click one to "log in" (no password):

| Name         | Email               |
|--------------|----------------------|
| Alex Rivera  | alex@ajaia.test      |
| Jordan Kim   | jordan@ajaia.test    |
| Sam Okafor   | sam@ajaia.test       |

## Demo walkthrough

1. Log in as **Alex Rivera**.
2. Click **New document**, or **Import file** and choose a `.txt`/`.md`/`.docx` file.
3. Type some text, select it, and use the toolbar for bold / italic / underline /
   headings / lists.
4. Edit the title at the top — it autosaves like the body.
5. Click **Share**, enter `jordan@ajaia.test`, pick **Can edit** or **Can view**, and
   click **Share**.
6. Click **Switch account** → **Jordan Kim**. The document now appears under
   **Shared with you** with the correct permission badge, while Alex's other private
   documents stay invisible to Jordan.
7. Refresh the page at any point — everything you did persists.

## File upload

Supported types: **`.txt`, `.md`, `.markdown`, `.docx`** (max 2MB). Each upload creates
a brand-new document owned by the uploader; the file's content is converted to HTML
(`marked` for Markdown, `mammoth` for `.docx`, a simple paragraph-per-blank-line
converter for `.txt`) and the filename becomes the initial title. Anything else is
rejected by the server with a 400 and a descriptive message, surfaced in the UI. This
is also stated in the upload picker (`accept=".txt,.md,.markdown,.docx"`).

## Testing

```bash
npm run test
```

Runs 12 Vitest + Supertest tests covering: auth rejection with no/unknown user,
document creation/rename/edit + persistence, empty-title validation, sharing +
access control (owner vs edit vs view, 404-not-403 for undisclosed documents,
only-owner-can-share/delete), and file upload for `.txt`/`.md` plus rejection of
unsupported types.

## Deployment

Deployed as a single Node service on [Render](https://render.com):

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- The server (`server/src/app.js`) serves the built client (`client/dist`) as static
  files and handles `/api/*` — one deployable, no separate frontend host.

**Known limitation:** Render's free tier has no persistent disk, so the SQLite file is
reset on every deploy/restart. Seeded users are recreated automatically on boot; any
documents created during a review session will not survive a redeploy. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the production fix (Postgres or a persistent
disk).

## What's working / what's not

**Working:** everything in the Tasks list above — document CRUD, rich text formatting,
file upload for 3 formats, sharing with owner/edit/view distinction, SQLite
persistence, 12 passing tests, single-service deploy.

**Incomplete / out of scope:** no real password-based auth (mocked by design, see
ARCHITECTURE.md), no real-time collaborative cursors, no version history, no comments,
no email notifications on share.

**With another 2–4 hours**, in priority order:
1. Move to Postgres (or add a Render persistent disk) so data survives redeploys.
2. Document version history (even a simple snapshot-on-save log).
3. Debounced conflict handling for two users editing the same doc at once (currently
   last-write-wins).
4. Export a document to PDF or Markdown.
