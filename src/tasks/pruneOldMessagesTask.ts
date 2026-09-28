import { Client } from 'discord.js';
import { Database } from '../shared/Database';
import { Task } from '../types';

const task: Task = {
  id: 'pruneOldMessages',
  interval: 3.6e6,
  firstRun: true,

  handle: async (context: Client) => {
    await Database.pruneOldMessages();
  },
};

export default task;
