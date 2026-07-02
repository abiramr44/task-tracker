import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_DB_PATH = path.resolve(process.cwd(), 'db.json');
const TMP_DB_PATH = path.resolve('/tmp', 'task-tracker-db.json');
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

async function ensureTmpDb() {
  try {
    await access(TMP_DB_PATH);
  } catch {
    const sourceText = await readFile(SOURCE_DB_PATH, 'utf8');
    await writeFile(TMP_DB_PATH, sourceText, 'utf8');
  }
}

async function readDb() {
  try {
    await ensureTmpDb();
    const text = await readFile(TMP_DB_PATH, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    return { accounts: [], tasks: {} };
  }
}

async function writeDb(data) {
  await writeFile(TMP_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function isValidPassword(password) {
  return PASSWORD_REGEX.test(password);
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace('/api', '');
  const db = await readDb();

  if (pathname === '/tasks') {
    const email = url.searchParams.get('email');
    if (!email) return jsonResponse({ error: 'Email is required.' }, 400);
    return jsonResponse(db.tasks[email] || []);
  }

  if (pathname === '/leaderboard') {
    const leaderboard = db.accounts.map((account) => ({
      name: account.name,
      email: account.email,
      completed: (db.tasks[account.email] || []).filter((task) => task.completed).length,
    }));
    leaderboard.sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));
    return jsonResponse(leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 })));
  }

  return jsonResponse({ error: 'Not found.' }, 404);
}

export async function POST(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace('/api', '');
  const body = await request.json();
  const db = await readDb();

  if (pathname === '/tasks') {
    const { email, task } = body;
    if (!email || !task) return jsonResponse({ error: 'Email and task are required.' }, 400);
    const userTasks = db.tasks[email] || [];
    const newTask = { ...task, id: Date.now() };
    db.tasks[email] = [...userTasks, newTask];
    await writeDb(db);
    return jsonResponse(newTask);
  }

  if (pathname === '/auth/signup') {
    const { name, email, password } = body;
    if (!name || !email || !password) return jsonResponse({ error: 'Name, email, and password are required.' }, 400);
    if (!isValidPassword(password)) {
      return jsonResponse({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' }, 400);
    }
    if (db.accounts.some((account) => account.email === email)) {
      return jsonResponse({ error: 'Account already exists.' }, 409);
    }
    db.accounts.push({ name, email, password });
    await writeDb(db);
    return jsonResponse({ name, email });
  }

  if (pathname === '/auth/login') {
    const { email, password } = body;
    if (!email || !password) return jsonResponse({ error: 'Email and password are required.' }, 400);
    const account = db.accounts.find((entry) => entry.email === email);
    if (!account || account.password !== password) {
      return jsonResponse({ error: 'Invalid email or password.' }, 401);
    }
    return jsonResponse({ name: account.name, email: account.email });
  }

  if (pathname === '/auth/change-password') {
    const { email, newPassword } = body;
    if (!email || !newPassword) return jsonResponse({ error: 'Email and new password are required.' }, 400);
    if (!isValidPassword(newPassword)) {
      return jsonResponse({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' }, 400);
    }
    db.accounts = db.accounts.map((entry) => (entry.email === email ? { ...entry, password: newPassword } : entry));
    await writeDb(db);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Not found.' }, 404);
}

export async function PUT(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace('/api', '');
  const body = await request.json();

  if (pathname.startsWith('/tasks/')) {
    const email = body.email;
    const task = body.task;
    const id = Number(pathname.split('/').pop());
    if (!email || !task) return jsonResponse({ error: 'Email and task are required.' }, 400);
    const db = await readDb();
    const userTasks = db.tasks[email] || [];
    db.tasks[email] = userTasks.map((existing) => (existing.id === id ? { ...existing, ...task } : existing));
    await writeDb(db);
    const updated = db.tasks[email].find((item) => item.id === id);
    return jsonResponse(updated || null);
  }

  return jsonResponse({ error: 'Not found.' }, 404);
}
