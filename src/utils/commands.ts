import fs from 'fs';
import { Handler } from '../types';
import path from 'path';
import { Client } from 'discord.js';

const ROOT_DIR = path.resolve(__dirname, '..');

export function loadHandlersFrom(dir: string, handlerArray: Handler[]) {
  if (!fs.existsSync(`${ROOT_DIR}/${dir}`)) return;

  const files = fs.readdirSync(`${ROOT_DIR}/${dir}`).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handlerArray.push(require(`${ROOT_DIR}/${dir}/${file}`).default);
  }
}

export async function initIfNecessary(client: Client, handlers: Handler[]) {
  for (const handler of handlers) {
    if (handler.init) await handler.init(client);
  }
}
