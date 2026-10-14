import { ButtonInteraction, Client, MessageFlags, ChannelType } from 'discord.js';
import { Button } from '../types';

class CloseModTicketButton implements Button<Client> {
  id = 'close-mod-ticket';

  async execute(context: Client<boolean>, interaction: ButtonInteraction): Promise<void> {
    if (!interaction.inGuild()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channel = await context.channels.fetch(interaction.channelId);

      if (!channel) throw new Error("The interaction channel couldn't be fetched.");
      if (!channel.isThread() || channel.type != ChannelType.PrivateThread) throw new Error('This interaction was not run in a ticket thread.');
      if (!channel.isSendable()) throw new Error("I don't have permission to send messages in this channel.");

      if (!interaction.memberPermissions.has('KickMembers')) throw new Error("You don't have permission to close this ticket.");

      await interaction.message.edit({
        content: interaction.message.content,
        components: []
      });

      await channel.send('This ticket has been closed by staff.');

      await interaction.editReply({ content: 'Ticket closed.' });

      await channel.edit({
        archived: true,
        locked: true
      });
    } catch (error: Error | any) {
      await interaction.editReply({ content: error.message }).catch(() => {});
    }
  }
}

export default new CloseModTicketButton();