import { ButtonInteraction, Client, MessageFlags, ChannelType } from 'discord.js';
import { Database } from '../shared/Database';

export default {
  name: 'close-ticket',
  handler: async function (client: Client, interaction: ButtonInteraction) {
    const channel = await interaction.channel?.fetch();

    if (!channel || !channel.isThread() || !channel.isSendable() || channel.type != ChannelType.PrivateThread)
      return interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Oops. Something went wrong. Please report this to a staff member.' });

    await interaction.message.edit({
      content: interaction.message.content,
      components: []
    });

    await Database.closePrivateHelpTicket(channel.id);

    await channel.send(`This ticket has been closed by ${interaction.user}`);

    await interaction.reply({ flags: [MessageFlags.Ephemeral], content: 'Ticket closed.' });

    channel.edit({
      archived: true,
      locked: true
    });
  }
};