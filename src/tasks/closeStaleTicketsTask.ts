import { Client } from 'discord.js';
import { Task } from '../types';
import { closeOldTickets } from '../utils';

const task: Task = {
  id: 'closeStaleTickets',
  interval: 3.6e6,
  firstRun: true,

  handle: async (context: Client) => {
    await closeOldTickets(context);
  },
};

export default task;
