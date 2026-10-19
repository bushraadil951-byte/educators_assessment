// Small Express server for Render. It serves the two pages and runs the
// existing /netlify/functions handlers unchanged at the same URLs.
import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');

// raw text body; the handlers parse the JSON themselves
app.use(express.text({ type: '*/*', limit: '1mb' }));

const FUNCTIONS = new Set(['data', 'login', 'manage']);

app.all('/.netlify/functions/:name', async (req, res) => {
  const name = req.params.name;
  if (!FUNCTIONS.has(name)) return res.status(404).json({ error: 'Not found.' });
  try {
    const { handler } = await import(`./netlify/functions/${name}.mjs`);
    const out = await handler({
      httpMethod: req.method,
      headers: req.headers,
      body: typeof req.body === 'string' ? req.body : ''
    });
    res.status(out.statusCode).set(out.headers || {}).send(out.body);
  } catch (error) {
    console.error(`${name}:`, error);
    res.status(500).json({ error: 'Server error.' });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(here, 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(here, 'admin.html')));
app.get('/healthz', (req, res) => res.send('ok'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
