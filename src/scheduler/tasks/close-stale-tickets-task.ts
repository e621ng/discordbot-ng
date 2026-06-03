import { Client } from 'discord.js';
import { Task } from '../../types';
import { closeOldTickets } from '../../utils';

class CloseStaleTicketsTask implements Task {
  interval: number = 3.6e6;
  firstRun: boolean = true;

  async handle(context: Client): Promise<void> {
    await closeOldTickets(context);
  }
}

export default new CloseStaleTicketsTask();
