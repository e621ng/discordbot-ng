import { AnyThreadChannel } from 'discord.js';

export default {
  event: 'threadCreate',

  handler: async (thread: AnyThreadChannel, newlyCreated: boolean) => {
    try {
      await thread.join();
    } catch (e) {
      console.error(`Failed to join thread: ${thread.name} (${thread.id})`, e);
    }
  }
};
