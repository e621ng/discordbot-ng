import fs from 'fs';
import path from 'path';
import { Handler } from '../types';

const ROOT_DIR = path.resolve(__dirname, '..');

export async function loadHandlersFrom(dir: string, handlerArray: Handler[]): Promise<void> {
  if (!fs.existsSync(`${ROOT_DIR}/${dir}`)) return;

  const files = fs.readdirSync(`${ROOT_DIR}/${dir}`).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handlerArray.push(require(`${ROOT_DIR}/${dir}/${file}`).default);
  }
}
