import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

// Seeded users (see db.js): 1 = Alex Rivera, 2 = Jordan Kim, 3 = Sam Okafor
const ALEX = 1;
const JORDAN = 2;

function asUser(id) {
  return { 'x-user-id': String(id) };
}

describe('auth', () => {
  it('rejects requests with no user header', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
  });

  it('rejects requests with an unknown user id', async () => {
    const res = await request(app).get('/api/documents').set(asUser(9999));
    expect(res.status).toBe(401);
  });
});

describe('document creation and editing', () => {
  it('creates a document owned by the caller', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set(asUser(ALEX))
      .send({ title: 'Q3 Roadmap' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Q3 Roadmap');
    expect(res.body.ownerId).toBe(ALEX);
    expect(res.body.access).toBe('owner');
  });

  it('renames a document and saves content, and both persist on reload', async () => {
    const created = await request(app).post('/api/documents').set(asUser(ALEX)).send({});
    const id = created.body.id;

    const patch = await request(app)
      .patch(`/api/documents/${id}`)
      .set(asUser(ALEX))
      .send({ title: 'Renamed doc', content: '<p><strong>Hello</strong> world</p>' });
    expect(patch.status).toBe(200);

    const reloaded = await request(app).get(`/api/documents/${id}`).set(asUser(ALEX));
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.title).toBe('Renamed doc');
    expect(reloaded.body.content).toBe('<p><strong>Hello</strong> world</p>');
  });

  it('rejects an empty title', async () => {
    const created = await request(app).post('/api/documents').set(asUser(ALEX)).send({});
    const res = await request(app)
      .patch(`/api/documents/${created.body.id}`)
      .set(asUser(ALEX))
      .send({ title: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('sharing and access control', () => {
  it('is invisible to other users until shared', async () => {
    const created = await request(app).post('/api/documents').set(asUser(ALEX)).send({ title: 'Private draft' });
    const id = created.body.id;

    // A user with zero access gets 404, not 403 — this avoids confirming the
    // document even exists to someone it hasn't been shared with.
    const asOutsider = await request(app).get(`/api/documents/${id}`).set(asUser(JORDAN));
    expect(asOutsider.status).toBe(404);
  });

  it('lets the owner share a document by email, and the recipient can then view it', async () => {
    const created = await request(app).post('/api/documents').set(asUser(ALEX)).send({ title: 'Shared plan' });
    const id = created.body.id;

    const share = await request(app)
      .post(`/api/documents/${id}/share`)
      .set(asUser(ALEX))
      .send({ email: 'jordan@ajaia.test', permission: 'edit' });
    expect(share.status).toBe(201);

    const asRecipient = await request(app).get(`/api/documents/${id}`).set(asUser(JORDAN));
    expect(asRecipient.status).toBe(200);
    expect(asRecipient.body.access).toBe('edit');

    const list = await request(app).get('/api/documents').set(asUser(JORDAN));
    expect(list.body.shared.some((d) => d.id === id)).toBe(true);
    expect(list.body.owned.some((d) => d.id === id)).toBe(false);
  });

  it('only lets the owner share, delete, or manage a document', async () => {
    const created = await request(app).post('/api/documents').set(asUser(ALEX)).send({ title: 'Owner only' });
    const id = created.body.id;

    const shareAttempt = await request(app)
      .post(`/api/documents/${id}/share`)
      .set(asUser(JORDAN))
      .send({ email: 'sam@ajaia.test' });
    expect(shareAttempt.status).toBe(404);

    const deleteAttempt = await request(app).delete(`/api/documents/${id}`).set(asUser(JORDAN));
    expect(deleteAttempt.status).toBe(404);
  });

  it('a viewer can read but not edit', async () => {
    const created = await request(app).post('/api/documents').set(asUser(ALEX)).send({ title: 'View only' });
    const id = created.body.id;

    await request(app)
      .post(`/api/documents/${id}/share`)
      .set(asUser(ALEX))
      .send({ email: 'jordan@ajaia.test', permission: 'view' });

    const readAttempt = await request(app).get(`/api/documents/${id}`).set(asUser(JORDAN));
    expect(readAttempt.status).toBe(200);

    const editAttempt = await request(app)
      .patch(`/api/documents/${id}`)
      .set(asUser(JORDAN))
      .send({ content: '<p>sneaky edit</p>' });
    expect(editAttempt.status).toBe(403);
  });
});

describe('file upload', () => {
  it('turns an uploaded .txt file into a new document', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set(asUser(ALEX))
      .attach('file', Buffer.from('Line one.\n\nLine two.'), 'notes.txt');

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('notes');
    expect(res.body.content).toContain('Line one.');
    expect(res.body.content).toContain('<p>');
  });

  it('turns an uploaded .md file into HTML', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set(asUser(ALEX))
      .attach('file', Buffer.from('# Title\n\n- one\n- two'), 'plan.md');

    expect(res.status).toBe(201);
    expect(res.body.content).toContain('<h1>Title</h1>');
    expect(res.body.content).toContain('<li>one</li>');
  });

  it('rejects unsupported file types', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set(asUser(ALEX))
      .attach('file', Buffer.from('binary-ish content'), 'image.png');

    expect(res.status).toBe(400);
  });
});
