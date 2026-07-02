import express from 'express';
import cors from 'cors';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, 'db.json');
const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

async function readDb() {
  try {
    const text = await readFile(DB_PATH, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to read DB:', error);
    return { accounts: [], tasks: {} };
  }
}

async function writeDb(data) {
  await writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

function isValidPassword(password) {
  return PASSWORD_REGEX.test(password);
}

app.get('/api/tasks', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const db = await readDb();
  const tasks = db.tasks[email] || [];
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const { email, task } = req.body;
  if (!email || !task) return res.status(400).json({ error: 'Email and task are required.' });
  const db = await readDb();
  const userTasks = db.tasks[email] || [];
  const newTask = { ...task, id: Date.now() };
  db.tasks[email] = [...userTasks, newTask];
  await writeDb(db);
  res.json(newTask);
});

app.put('/api/tasks/:id', async (req, res) => {
  const { email, task } = req.body;
  const id = Number(req.params.id);
  if (!email || !task) return res.status(400).json({ error: 'Email and task are required.' });
  const db = await readDb();
  const userTasks = db.tasks[email] || [];
  const updatedTasks = userTasks.map((existing) => (existing.id === id ? { ...existing, ...task } : existing));
  db.tasks[email] = updatedTasks;
  await writeDb(db);
  const updated = updatedTasks.find((item) => item.id === id);
  res.json(updated || null);
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
  }
  const db = await readDb();
  if (db.accounts.some((account) => account.email === email)) {
    return res.status(409).json({ error: 'Account already exists.' });
  }
  const account = { name, email, password };
  db.accounts.push(account);
  await writeDb(db);
  res.json({ name, email });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const db = await readDb();
  const account = db.accounts.find((entry) => entry.email === email);
  if (!account || account.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  res.json({ name: account.name, email: account.email });
});

app.post('/api/auth/change-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password are required.' });
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
  }
  const db = await readDb();
  db.accounts = db.accounts.map((entry) => (entry.email === email ? { ...entry, password: newPassword } : entry));
  await writeDb(db);
  res.json({ success: true });
});

app.get('/api/leaderboard', async (req, res) => {
  const db = await readDb();
  const leaderboard = db.accounts.map((account) => ({
    name: account.name,
    email: account.email,
    completed: (db.tasks[account.email] || []).filter((task) => task.completed).length,
  }));
  leaderboard.sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));
  const ranked = leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 }));
  res.json(ranked);
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
