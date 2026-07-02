import { access, readFile } from 'node:fs/promises';
import { initSchema, createAccount, createTask } from './turso.js';

async function migrate() {
  const sourcePath = 'db.json';
  try {
    await access(sourcePath);
  } catch {
    console.log('No db.json found; migration skipped.');
    return;
  }

  const source = JSON.parse(await readFile(sourcePath, 'utf8'));
  await initSchema();

  for (const account of source.accounts) {
    const { name, email, password } = account;
    try {
      await createAccount({ name, email, password });
    } catch (error) {
      console.error('Skipping account', email, error.message);
    }
  }

  for (const email of Object.keys(source.tasks || {})) {
    for (const task of source.tasks[email]) {
      try {
        await createTask(email, task);
      } catch (error) {
        console.error('Skipping task', task.id, error.message);
      }
    }
  }

  console.log('Migration complete.');
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
