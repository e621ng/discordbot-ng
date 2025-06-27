import { config } from '../config';

export function logDebug(message: string) {
  if (config.DEBUG) console.log(`[DEBUG] ${message}`);
}