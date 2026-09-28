import { Client } from 'discord.js';

export interface Task {
  id: string;
  interval: number;
  firstRun: boolean;

  handle(context: Client): Promise<void>;
}
