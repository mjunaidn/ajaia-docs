import app from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Ajaia Docs server listening on http://localhost:${PORT}`);
});
