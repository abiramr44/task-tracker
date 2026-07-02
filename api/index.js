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
} from '../turso.js';

await initSchema();

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace('/api', '');

  if (pathname === '/tasks') {
    const email = url.searchParams.get('email');
    if (!email) return jsonResponse({ error: 'Email is required.' }, 400);
    const tasks = await getTasksByEmail(email);
    return jsonResponse(tasks);
  }

  if (pathname === '/leaderboard') {
    const leaderboard = await getLeaderboard();
    return jsonResponse(leaderboard);
  }

  return jsonResponse({ error: 'Not found.' }, 404);
}

export async function POST(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace('/api', '');
  const body = await request.json();

  if (pathname === '/tasks') {
    const { email, task } = body;
    if (!email || !task) return jsonResponse({ error: 'Email and task are required.' }, 400);
    const savedTask = await createTask(email, task);
    return jsonResponse(savedTask);
  }

  if (pathname === '/auth/signup') {
    const { name, email, password } = body;
    if (!name || !email || !password) return jsonResponse({ error: 'Name, email, and password are required.' }, 400);
    if (!isValidPassword(password)) {
      return jsonResponse({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' }, 400);
    }
    const response = await createAccount({ name, email, password });
    return jsonResponse(response);
  }

  if (pathname === '/auth/login') {
    const { email, password } = body;
    if (!email || !password) return jsonResponse({ error: 'Email and password are required.' }, 400);
    const response = await verifyAccount(email, password);
    if (!response) return jsonResponse({ error: 'Invalid email or password.' }, 401);
    return jsonResponse(response);
  }

  if (pathname === '/auth/change-password') {
    const { email, newPassword } = body;
    if (!email || !newPassword) return jsonResponse({ error: 'Email and new password are required.' }, 400);
    if (!isValidPassword(newPassword)) {
      return jsonResponse({ error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' }, 400);
    }
    await changePassword(email, newPassword);
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
    const updated = await updateTask(email, id, task);
    return jsonResponse(updated);
  }

  return jsonResponse({ error: 'Not found.' }, 404);
}
