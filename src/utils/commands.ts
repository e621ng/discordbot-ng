import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { Handler } from '../types';

const ROOT_DIR = path.resolve(__dirname, '..');

export async function loadHandlersFrom(dir: string, handlerArray: Handler[]): Promise<void> {
  if (!fs.existsSync(`${ROOT_DIR}/${dir}`)) return;

  const files = fs.readdirSync(`${ROOT_DIR}/${dir}`).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
  for (const file of files) {
    handlerArray.push((await import(pathToFileURL(`${ROOT_DIR}/${dir}/${file}`).href)).default);
  }
}

export async function initIfNecessary(client: Client, handlers: Handler[]) {
  for (const handler of handlers) {
    if (handler.init) await handler.init(client);
  }
}
