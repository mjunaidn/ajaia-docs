import { db, seedUsersIfEmpty } from './db.js';

seedUsersIfEmpty();
const users = db.prepare('SELECT id, name, email FROM users ORDER BY id').all();
console.log('Seeded users:');
for (const u of users) console.log(`  #${u.id}  ${u.name}  <${u.email}>`);
