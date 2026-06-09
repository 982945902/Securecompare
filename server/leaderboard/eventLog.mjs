import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function appendLeaderboardEvent(filePath, event) {
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(event)}\n`, 'utf8');
}

export async function loadLeaderboardEvents(filePath) {
  let content;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const events = [];
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.length === 0) {
      continue;
    }
    try {
      events.push(JSON.parse(line));
    } catch {
      throw new Error(`malformed-event-log:${index + 1}`);
    }
  }
  return events;
}
