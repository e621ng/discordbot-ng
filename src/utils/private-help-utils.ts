import { Client, ThreadChannel } from 'discord.js';
import { Database } from '../shared/Database';

export async function closeOldTickets(client: Client) {
  for (const ticket of await Database.getAllOpenPrivateHelpTickets()) {
    try {
      const thread = await client.channels.fetch(ticket.thread_id) as ThreadChannel;
      const latestMessage = (await thread.messages.fetch({ limit: 1 })).at(0);
      if (latestMessage && latestMessage.createdTimestamp <= Date.now() - 432e6) {
        await Database.closePrivateHelpTicket(thread.id);

        await thread.send('This ticket has been closed due to inactivity.');

        thread.edit({
          archived: true,
          locked: true
        });
      }
    } catch (e) {
      console.error('Error closing ticket due to inactivity:');
      console.error(e);
    }
  }
}