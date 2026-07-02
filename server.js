import express from 'express';
import cors from 'cors';
import {
  initSchema,
  getTasksByEmail,
  createTask,
  updateTask,
  createAccount,
  verifyAccount,
  changePassword,
  getLeaderboard,
  isValidPassword,
} from './turso.js';

await initSchema();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/tasks', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const tasks = await getTasksByEmail(email);
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const { email, task } = req.body;
  if (!email || !task) return res.status(400).json({ error: 'Email and task are required.' });
  const savedTask = await createTask(email, task);
  res.json(savedTask);
});

app.put('/api/tasks/:id', async (req, res) => {
  const { email, task } = req.body;
  const id = Number(req.params.id);
  if (!email || !task) return res.status(400).json({ error: 'Email and task are required.' });
  const updated = await updateTask(email, id, task);
  res.json(updated);
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
  }
  try {
    const response = await createAccount({ name, email, password });
    res.json(response);
  } catch (error) {
    if (error.message.includes('UNIQUE') || error.message.includes('unique') || error.message.includes('constraint')) {
      return res.status(409).json({ error: 'Account already exists.' });
    }
    throw error;
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const response = await verifyAccount(email, password);
  if (!response) return res.status(401).json({ error: 'Invalid email or password.' });
  res.json(response);
});

app.post('/api/auth/change-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password are required.' });
  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
  }
  await changePassword(email, newPassword);
  res.json({ success: true });
});

app.get('/api/leaderboard', async (req, res) => {
  const leaderboard = await getLeaderboard();
  res.json(leaderboard);
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
