import 'dotenv/config';
import { createClient } from '@libsql/client';
import bcrypt from 'bcrypt';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error('Missing TURSO_DATABASE_URL in environment.');
}

const db = createClient({ url, authToken });
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export function isValidPassword(password) {
  return PASSWORD_REGEX.test(password);
}

export async function initSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completedAt INTEGER,
      subtasks TEXT,
      FOREIGN KEY(user_email) REFERENCES accounts(email)
    );
  `);
}

function parseSubtasks(value) {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function taskRowToObject(row) {
  return {
    id: Number(row.id),
    title: row.title,
    completed: Boolean(row.completed),
    completedAt: row.completedAt === null ? null : Number(row.completedAt),
    subtasks: parseSubtasks(row.subtasks),
  };
}

export async function getAccountByEmail(email) {
  const result = await db.execute('SELECT email, name, password FROM accounts WHERE email = ?', {
    args: [email],
  });
  return result.rows?.[0] ?? null;
}

export async function createAccount({ name, email, password }) {
  const hashed = await bcrypt.hash(password, 10);
  await db.execute('INSERT INTO accounts (email, name, password) VALUES (?, ?, ?)', {
    args: [email, name, hashed],
  });
  return { name, email };
}

export async function verifyAccount(email, password) {
  const account = await getAccountByEmail(email);
  if (!account) return null;
  const valid = await bcrypt.compare(password, account.password);
  if (!valid) return null;
  return { name: account.name, email: account.email };
}

export async function changePassword(email, newPassword) {
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.execute('UPDATE accounts SET password = ? WHERE email = ?', {
    args: [hashed, email],
  });
  return true;
}

export async function getTasksByEmail(email) {
  const result = await db.execute('SELECT * FROM tasks WHERE user_email = ? ORDER BY id ASC', {
    args: [email],
  });
  return (result.rows ?? []).map(taskRowToObject);
}

export async function createTask(email, task) {
  const result = await db.execute(
    'INSERT INTO tasks (user_email, title, completed, completedAt, subtasks) VALUES (?, ?, ?, ?, ?) RETURNING id',
    {
      args: [
        email,
        task.title,
        task.completed ? 1 : 0,
        task.completedAt === null ? null : task.completedAt,
        JSON.stringify(task.subtasks || []),
      ],
    }
  );
  const inserted = result.rows?.[0];
  return { ...task, id: Number(inserted?.id ?? 0) };
}

export async function updateTask(email, id, task) {
  const result = await db.execute(
    'UPDATE tasks SET title = ?, completed = ?, completedAt = ?, subtasks = ? WHERE id = ? AND user_email = ? RETURNING id, title, completed, completedAt, subtasks',
    {
      args: [
        task.title,
        task.completed ? 1 : 0,
        task.completedAt === null ? null : task.completedAt,
        JSON.stringify(task.subtasks || []),
        id,
        email,
      ],
    }
  );
  const row = result.rows?.[0];
  return row ? taskRowToObject(row) : null;
}

export async function getLeaderboard() {
  const result = await db.execute(`
    SELECT
      a.name,
      a.email,
      COALESCE(SUM(t.completed), 0) AS completed
    FROM accounts a
    LEFT JOIN tasks t ON a.email = t.user_email
    GROUP BY a.email, a.name
    ORDER BY completed DESC, a.name ASC
  `);
  const rows = result.rows ?? [];
  return rows.map((row, index) => ({
    name: row.name,
    email: row.email,
    completed: Number(row.completed),
    rank: index + 1,
  }));
}
