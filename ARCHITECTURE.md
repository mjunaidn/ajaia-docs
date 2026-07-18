# Architecture note

## What I prioritized

The brief asks for depth in a few areas over shallow coverage everywhere. Given a
4–6 hour scope, I prioritized:

1. **A genuinely usable editor**, not a `<textarea>` with a bold button. Tiptap gives a
   real ProseMirror document model, so formatting (headings, lists, marks) round-trips
   as structured HTML rather than being reconstructed from markdown-ish text.
2. **Correct, testable access control for sharing.** This is the part of the brief most
   likely to hide bugs (can a viewer edit? does a stranger get a 403 that leaks
   existence, or a 404 that doesn't?), so it has the most test coverage.
3. **One deployable artifact.** The Express server serves the built React app as static
   files and answers `/api/*` itself. No CORS-across-origins to debug in production, no
   second hosting account, one URL to hand to a reviewer.
4. **A boring, inspectable data layer.** SQLite via `better-sqlite3` is synchronous, so
   route handlers read like plain functions with no async/await ceremony around simple
   queries, and the whole schema fits in one `db.exec()` call in `server/src/db.js`.

## Key decisions and tradeoffs

### Mocked auth via seeded users, not real accounts

The brief explicitly allows this ("simulate users with seeded accounts, mocked auth,
or a lightweight login flow"). Building real auth (password hashing, sessions/JWTs,
CSRF, rate limiting) would have consumed most of the time budget for a part of the
product the brief doesn't actually evaluate. Instead: three seeded users, a login
screen that "logs in" as one of them with no password, and every API request carries
that user's id in an `x-user-id` header (`server/src/middleware/auth.js`). It's
intentionally minimal — the comment in that file says as much — so a reviewer can see
the cut was deliberate, not an oversight.

**What real auth would need:** password hashing (bcrypt/argon2), session cookies or
JWTs with refresh, CSRF protection, rate limiting on login, and probably email
verification. None of that is exercised by the brief's evaluation criteria, so it was
cut.

### Access levels: `owner | edit | view | null`, resolved in one place

`server/src/access.js` has a single `getAccessLevel(documentId, userId)` that every
route calls before doing anything. This keeps the owner/edit/view logic from being
reimplemented (and subtly diverging) across five different route handlers. Two
specific choices worth calling out:

- **A document a user has no access to returns 404, not 403.** Returning 403 would
  confirm the document exists to someone it was never shared with. This is tested
  explicitly (`documents.test.js` → "is invisible to other users until shared").
- **Only the owner can share, delete, or manage access** — a viewer or editor can never
  escalate their own or anyone else's permissions. Also directly tested.

### SQLite over Postgres/Supabase for this scope

The brief allows "any practical storage approach... including SQLite." A single-file
embedded database means zero setup for a reviewer (`npm install && npm run seed` and
you have data), no external service to provision or leak credentials for, and
`better-sqlite3`'s synchronous API keeps route handlers simple. The real cost of this
choice is deployment: most free hosting tiers don't persist a local file across
restarts (see [README.md → Deployment](README.md#deployment)). For a real product this
becomes Postgres (Supabase/Neon/RDS) on day one — the access-control and route logic
would not need to change, only `db.js`.

### File upload: convert-on-upload, not attach-and-store

Rather than storing uploaded files as opaque attachments, upload immediately becomes a
new editable document (`POST /api/documents/upload`): `.md` through `marked`, `.docx`
through `mammoth`, `.txt` through a small paragraph splitter. This was the more
"product-relevant" of the three example behaviors in the brief — it turns an import
into something immediately useful (an editable doc) rather than a dead file sitting
next to a document. The tradeoff is that formatting fidelity for `.docx` is only as
good as `mammoth`'s conversion (no images, complex styles may be lossy) — acceptable
for the assignment's scope.

### Autosave over explicit save button

Both title and content autosave ~700ms after the user stops typing/typing stops
(`Editor.jsx`), rather than requiring an explicit "Save" click. This matches how every
mainstream document editor actually behaves and removes an entire class of "I forgot
to save" bug reports, at the cost of no undo-to-last-save (mitigated by the browser's
own undo history within a session).

## What I would build next (given 2–4 more hours)

In priority order — see also [README.md → What's working / what's not](README.md#whats-working--whats-not):

1. **Persistent storage on the deploy target** (Postgres, or a Render persistent disk)
   so the live demo survives redeploys — the single biggest gap between "works
   locally" and "works as a real product."
2. **Basic version history** — a naive append-only snapshot table on every save would
   demonstrate the concept without a full CRDT/OT stack.
3. **Concurrent-edit handling** — today it's last-write-wins with a 700ms debounce, fine
   for the demo but the first thing that would break with two real simultaneous
   editors.
4. **Export to Markdown/PDF** — mentioned as a stretch goal in the brief; would reuse
   the same HTML content already stored per document.
