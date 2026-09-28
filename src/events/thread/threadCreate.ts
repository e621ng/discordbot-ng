import { AnyThreadChannel, Client } from 'discord.js';
import { Event } from '../../types';

class ThreadCreateEvent implements Event<Client, 'threadCreate'> {
  event = 'threadCreate' as const;

  async execute(context: Client<boolean>, thread: AnyThreadChannel, _newlyCreated: boolean) {
    try {
      await thread.join();
    } catch (e) {
      console.error(`Failed to join thread: ${thread.name} (${thread.id})`, e);
    }
  }
}

export default new ThreadCreateEvent();
